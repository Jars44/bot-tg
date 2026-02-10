/**
 * Sticker generation service using Sharp
 * REFACTORED: Soft Lo-Fi Blur (Burik Halus)
 * * Perubahan:
 * 1. Hapus 'nearest' neighbor agar tidak kotak-kotak.
 * 2. Tambah Gaussian Blur ringan.
 * 3. Gunakan 'mitchell' kernel untuk upscale yang lebih lembut.
 */

import sharp from "sharp";
import path from "path";
import { TempCleanerService } from "./TempCleanerService.js";
import { CONFIG } from "../config/index.js";
import { sanitizeForSvg } from "../utils/sanitize.js";

export class StickerService {
  private tempCleaner: TempCleanerService;

  // Konfigurasi Visual
  private readonly SQUASH_FACTOR = 0.7; // Gepeng Horizontal 70%
  private readonly LOW_RES_SIZE = 150; // Resolusi Rendah (150px)
  private readonly BLUR_SIGMA = 3.0; // Kekuatan Blur (Soft)

  constructor(tempCleaner: TempCleanerService) {
    this.tempCleaner = tempCleaner;
  }

  private measureTextWidth(text: string, fontSize: number): number {
    const avgRatio = 0.6;
    return text.length * fontSize * avgRatio;
  }

  private smartWrap(text: string, fontSize: number, maxWidth: number): string[] {
    const words = text.trim().replace(/\s+/g, " ").split(" ");
    const lines: string[] = [];
    let currentLine = words[0];

    if (this.measureTextWidth(currentLine, fontSize) > maxWidth) {
      return [];
    }

    for (let i = 1; i < words.length; i++) {
      const word = words[i];
      const testLine = currentLine + " " + word;

      if (this.measureTextWidth(testLine, fontSize) <= maxWidth) {
        currentLine = testLine;
      } else {
        lines.push(currentLine);
        if (this.measureTextWidth(word, fontSize) > maxWidth) {
          return [];
        }
        currentLine = word;
      }
    }
    lines.push(currentLine);
    return lines;
  }

  private calculateLayout(text: string): { lines: string[]; fontSize: number } {
    const CANVAS_SIZE = CONFIG.STICKER_SIZE || 512;
    const PADDING = 40;
    const USABLE_WIDTH = (CANVAS_SIZE - PADDING) / this.SQUASH_FACTOR;
    const USABLE_HEIGHT = CANVAS_SIZE - PADDING;

    let fontSize = 250;
    const minFontSize = 10;

    let finalLines: string[] = [text];

    while (fontSize >= minFontSize) {
      const lines = this.smartWrap(text, fontSize, USABLE_WIDTH);

      if (lines.length === 0) {
        fontSize -= 5;
        continue;
      }

      const lineHeight = fontSize * 1.05;
      const totalHeight = lines.length * lineHeight;

      if (totalHeight <= USABLE_HEIGHT) {
        finalLines = lines;
        break;
      }
      fontSize -= 5;
    }

    return { lines: finalLines, fontSize };
  }

  private generateSvg(lines: string[], fontSize: number): string {
    const size = CONFIG.STICKER_SIZE || 512;
    const lineHeight = fontSize * 1.05;
    const totalTextHeight = lineHeight * lines.length;

    const startY = (size - totalTextHeight) / 2 + lineHeight * 0.75;
    const centerX = 50 / this.SQUASH_FACTOR;

    const svgTextLines = lines
      .map((line, i) => {
        const sanitizedLine = sanitizeForSvg(line);
        const y = startY + i * lineHeight;

        return `<text x="${centerX}%" y="${y}" transform="scale(${this.SQUASH_FACTOR}, 1)" text-anchor="middle">${sanitizedLine}</text>`;
      })
      .join("");

    return `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <style>
        text {
          fill: black;
          font-family: "Arial", "Helvetica", sans-serif;
          font-size: ${fontSize}px;
          white-space: pre;
        }
      </style>
      <rect width="100%" height="100%" fill="white" />
      ${svgTextLines}
    </svg>`;
  }

  async createSticker(text: string): Promise<string> {
    const processedText = text.toUpperCase();
    const layout = this.calculateLayout(processedText);
    const svg = this.generateSvg(layout.lines, layout.fontSize);

    const webpPath = this.tempCleaner.getTempFilePath("sticker", ".webp");
    const size = CONFIG.STICKER_SIZE || 512;

    const imageBuffer = await sharp({
      create: {
        width: size,
        height: size,
        channels: 4,
        background: { r: 255, g: 255, b: 255, alpha: 0 },
      },
    })
      .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
      .png()
      .toBuffer();

    // --- PROSES BURIK HALUS (Soft Lo-Fi) ---
    await sharp(imageBuffer)
      // 1. Resize Kecil (Hancurkan Detail)
      .resize(this.LOW_RES_SIZE, this.LOW_RES_SIZE, {
        fit: "fill",
        kernel: "mitchell", // Mitchell bagus untuk downscale yang soft
      })
      // 2. Tambah Blur Ringan saat resolusi masih kecil (efeknya lebih kuat & natural)
      .blur(this.BLUR_SIGMA)
      // 3. Resize Besar (Upscale)
      .resize(size, size, {
        fit: "fill",
        kernel: "mitchell", // GANTI 'nearest' ke 'mitchell' agar tidak kotak-kotak
      })
      .webp()
      .toFile(webpPath);

    return webpPath;
  }

  getStickerAssetPath(filename: string): string {
    return path.resolve(process.cwd(), "assets", filename);
  }

  /**
   * Process image (photo) to sticker format
   * - Download highest resolution photo from Telegram
   * - Resize to fit 512x512 (maintain aspect ratio)
   * - Convert to WebP format
   * - Ensure file size < 512KB
   */
  async processImageToSticker(imageBuffer: Buffer): Promise<string> {
    const size = CONFIG.STICKER_SIZE || 512;
    const maxSizeBytes = 512 * 1024; // 512KB

    try {
      // Get image metadata
      const metadata = await sharp(imageBuffer).metadata();

      if (!metadata.width || !metadata.height) {
        throw new Error("Invalid image metadata");
      }

      // Calculate dimensions to fit within 512x512 while maintaining aspect ratio
      let targetWidth = metadata.width;
      let targetHeight = metadata.height;

      if (targetWidth > size || targetHeight > size) {
        const ratio = Math.min(size / targetWidth, size / targetHeight);
        targetWidth = Math.round(targetWidth * ratio);
        targetHeight = Math.round(targetHeight * ratio);
      }

      // Process image: resize and convert to WebP
      let quality = 90; // Start with high quality
      let processedBuffer: Buffer;

      // Iteratively reduce quality if file size exceeds limit
      do {
        processedBuffer = await sharp(imageBuffer)
          .resize(targetWidth, targetHeight, {
            fit: "contain",
            background: { r: 0, g: 0, b: 0, alpha: 0 }, // Transparent background
          })
          // If original has alpha channel, preserve it
          .webp({ quality, lossless: false })
          .toBuffer();

        // If still too large, reduce quality
        if (processedBuffer.length > maxSizeBytes && quality > 20) {
          quality -= 10;
        } else {
          break;
        }
      } while (processedBuffer.length > maxSizeBytes && quality >= 20);

      // Save to temp file
      const webpPath = this.tempCleaner.getTempFilePath("sticker-image", ".webp");
      await sharp(processedBuffer).toFile(webpPath);

      return webpPath;
    } catch (error) {
      throw new Error(`Failed to process image: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }
}
