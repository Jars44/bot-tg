/**
 * Sticker generation service using Sharp
 */

import sharp from "sharp";
import path from "path";
import { TempCleanerService } from "./TempCleanerService.js";
import { CONFIG } from "../config/index.js";
import { sanitizeForSvg } from "../utils/sanitize.js";

export class StickerService {
  private tempCleaner: TempCleanerService;

  constructor(tempCleaner: TempCleanerService) {
    this.tempCleaner = tempCleaner;
  }

  /**
   * Calculate font size based on longest line length
   */
  private calculateFontSize(longestLineLength: number): number {
    if (longestLineLength <= 4) {
      return CONFIG.MAX_FONT_SIZE;
    }
    if (longestLineLength >= 15) {
      return CONFIG.DEFAULT_FONT_SIZE;
    }
    return CONFIG.FONT_SIZE_MAP[longestLineLength] ?? CONFIG.DEFAULT_FONT_SIZE;
  }

  /**
   * Wrap text into lines based on max chars per line
   */
  private wrapText(text: string): string[] {
    const lines: string[] = [];
    const inputLines = text.trim().split(/\r?\n/);

    for (const inputLine of inputLines) {
      let currentLine = "";
      const words = inputLine.split(" ");

      for (const word of words) {
        if ((currentLine + word).length > CONFIG.STICKER_MAX_CHARS_PER_LINE) {
          if (currentLine.trim()) {
            lines.push(currentLine.trim());
          }
          currentLine = "";
        }
        currentLine += word + " ";
      }

      if (currentLine.trim()) {
        lines.push(currentLine.trim());
      }
    }

    return lines;
  }

  /**
   * Generate SVG content for sticker
   */
  private generateSvg(lines: string[], fontSize: number): string {
    const size = CONFIG.STICKER_SIZE;
    const lineHeight = fontSize * 1.2;
    const totalTextHeight = lineHeight * lines.length;
    const startY = (size - totalTextHeight) / 2 + lineHeight / 2;

    const svgTextLines = lines
      .map((line, i) => {
        // CRITICAL: Sanitize text to prevent malformed XML
        const sanitizedLine = sanitizeForSvg(line);
        const y = startY + i * lineHeight;
        return `<text x="50%" y="${y}" text-anchor="middle">${sanitizedLine}</text>`;
      })
      .join("");

    return `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <style>
        text {
          fill: black;
          font-family: "Helvetica", "Arial", sans-serif;
          font-size: ${fontSize}px;
          white-space: pre-wrap;
          dominant-baseline: middle;
        }
      </style>
      <rect width="100%" height="100%" fill="white" />
      ${svgTextLines}
    </svg>`;
  }

  /**
   * Create sticker from text and return file path
   */
  async createSticker(text: string): Promise<string> {
    const lines = this.wrapText(text);
    const longestLineLength = lines.reduce((max, line) => Math.max(max, line.length), 0);
    const fontSize = this.calculateFontSize(longestLineLength);
    const svg = this.generateSvg(lines, fontSize);

    const webpPath = this.tempCleaner.getTempFilePath("sticker", ".webp");
    const size = CONFIG.STICKER_SIZE;

    await sharp({
      create: {
        width: size,
        height: size,
        channels: 4,
        background: { r: 255, g: 255, b: 255, alpha: 0 },
      },
    })
      .composite([
        {
          input: Buffer.from(svg),
          top: 0,
          left: 0,
        },
      ])
      .webp()
      .toFile(webpPath);

    return webpPath;
  }

  /**
   * Get path to a sticker asset file
   */
  getStickerAssetPath(filename: string): string {
    return path.resolve(process.cwd(), "assets", filename);
  }
}
