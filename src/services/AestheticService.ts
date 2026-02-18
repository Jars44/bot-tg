import sharp from "sharp";
import type { HttpClient } from "./HttpClient.js";
import type { AIService } from "./GenAIService.js";
import { getOptionalEnvVar } from "../config/index.js";
import { S } from "../config/symbols.js";

export interface MoodboardResult {
  keyword: string;
  images: MoodboardImage[];
  palette: ColorSwatch[];
}

export interface MoodboardImage {
  url: string;
  thumbUrl: string;
  photographer: string;
  photographerUrl: string;
  altText: string;
}

export interface ColorSwatch {
  hex: string;
  label: string;
}

interface UnsplashSearchResponse {
  results: UnsplashPhoto[];
}

interface UnsplashPhoto {
  urls: {
    regular: string;
    small: string;
    thumb: string;
  };
  user: {
    name: string;
    links: { html: string };
  };
  alt_description: string | null;
  description: string | null;
}

interface AIPaletteResponse {
  colors: Array<{ hex: string; label: string }>;
}

const UNSPLASH_API_BASE = "https://api.unsplash.com";
const MAX_IMAGES = 5;
const SAMPLE_SIZE = 3;

const FALLBACK_PALETTES: Record<string, ColorSwatch[]> = {
  cyberpunk: [
    { hex: "#FF00FF", label: "Neon Magenta" },
    { hex: "#00FFFF", label: "Electric Cyan" },
    { hex: "#1A0033", label: "Deep Void" },
    { hex: "#FF3366", label: "Hot Pink" },
    { hex: "#0D0D0D", label: "Carbon Black" },
  ],
  "old money": [
    { hex: "#2C3E2D", label: "Forest Green" },
    { hex: "#C5A258", label: "Antique Gold" },
    { hex: "#F5F0E8", label: "Ivory Cream" },
    { hex: "#8B4513", label: "Saddle Brown" },
    { hex: "#1C1C1C", label: "Charcoal" },
  ],
  "dark academia": [
    { hex: "#3D2B1F", label: "Espresso" },
    { hex: "#8B7355", label: "Camel" },
    { hex: "#F0E6D3", label: "Parchment" },
    { hex: "#4A0E1A", label: "Oxblood" },
    { hex: "#2F4F2F", label: "Dark Olive" },
  ],
  minimalist: [
    { hex: "#FFFFFF", label: "Pure White" },
    { hex: "#F5F5F5", label: "Ghost White" },
    { hex: "#000000", label: "Jet Black" },
    { hex: "#BFBFBF", label: "Silver" },
    { hex: "#E8E8E8", label: "Platinum" },
  ],
  tropical: [
    { hex: "#FF6B35", label: "Coral Sunset" },
    { hex: "#00A878", label: "Jungle Green" },
    { hex: "#FFD700", label: "Golden Sun" },
    { hex: "#1E90FF", label: "Ocean Blue" },
    { hex: "#FF69B4", label: "Hibiscus Pink" },
  ],
  gothic: [
    { hex: "#0D0D0D", label: "Abyss Black" },
    { hex: "#8B0000", label: "Blood Red" },
    { hex: "#4B0082", label: "Deep Indigo" },
    { hex: "#2F2F2F", label: "Obsidian" },
    { hex: "#C0C0C0", label: "Moonlight Silver" },
  ],
};

const DEFAULT_PALETTE: ColorSwatch[] = [
  { hex: "#2C3E50", label: "Midnight Blue" },
  { hex: "#E74C3C", label: "Alizarin" },
  { hex: "#ECF0F1", label: "Clouds" },
  { hex: "#3498DB", label: "Peter River" },
  { hex: "#2ECC71", label: "Emerald" },
];

export class AestheticService {
  private httpClient: HttpClient;
  private aiService: AIService;
  private unsplashKey: string | null;

  constructor(httpClient: HttpClient, aiService: AIService) {
    this.httpClient = httpClient;
    this.aiService = aiService;
    this.unsplashKey = getOptionalEnvVar("UNSPLASH_ACCESS_KEY");
  }

  async generateMoodboard(keyword: string): Promise<MoodboardResult> {
    const images = await this.fetchImages(keyword);

    let palette: ColorSwatch[];
    if (images.length > 0) {
      palette = await this.extractColorsFromImages(images);
    } else {
      palette = await this.generatePaletteFallback(keyword);
    }

    return { keyword, images, palette };
  }

  private async fetchImages(keyword: string): Promise<MoodboardImage[]> {
    if (!this.unsplashKey) {
      console.log("[AestheticService] No Unsplash API key. Skipping image fetch.");
      return [];
    }

    try {
      const response = await this.httpClient.get<UnsplashSearchResponse>(`${UNSPLASH_API_BASE}/search/photos`, {
        params: {
          query: `${keyword} aesthetic`,
          per_page: MAX_IMAGES,
          orientation: "landscape",
        },
        headers: {
          Authorization: `Client-ID ${this.unsplashKey}`,
        },
      });

      return response.results.map((photo) => ({
        url: photo.urls.regular,
        thumbUrl: photo.urls.small,
        photographer: photo.user.name,
        photographerUrl: photo.user.links.html,
        altText: photo.alt_description ?? photo.description ?? keyword,
      }));
    } catch (error) {
      console.error("[AestheticService] Unsplash fetch error:", error);
      return [];
    }
  }

  private async extractColorsFromImages(images: MoodboardImage[]): Promise<ColorSwatch[]> {
    const sampled = images.slice(0, SAMPLE_SIZE);
    const allColors: ColorSwatch[] = [];

    for (const image of sampled) {
      try {
        const colors = await this.extractDominantColors(image.url);
        allColors.push(...colors);
      } catch (error) {
        console.error("[AestheticService] Color extraction error:", error);
      }
    }

    if (allColors.length === 0) {
      return DEFAULT_PALETTE;
    }

    const unique = this.deduplicateColors(allColors);
    return unique.slice(0, 5);
  }

  private async extractDominantColors(imageUrl: string): Promise<ColorSwatch[]> {
    const response = await this.httpClient.instance.get(imageUrl, {
      responseType: "arraybuffer",
      timeout: 10_000,
    });

    const buffer = Buffer.from(response.data as ArrayBuffer);

    const resized = await sharp(buffer).resize(50, 50, { fit: "cover" }).raw().toBuffer({ resolveWithObject: true });

    const pixels = resized.data;
    const colorCounts = new Map<string, number>();

    for (let i = 0; i < pixels.length; i += 3) {
      const r = Math.round(pixels[i] / 32) * 32;
      const g = Math.round(pixels[i + 1] / 32) * 32;
      const b = Math.round(pixels[i + 2] / 32) * 32;
      const hex = this.rgbToHex(Math.min(r, 255), Math.min(g, 255), Math.min(b, 255));
      colorCounts.set(hex, (colorCounts.get(hex) ?? 0) + 1);
    }

    const sorted = [...colorCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([hex]) => ({
        hex,
        label: this.labelColor(hex),
      }));

    return sorted;
  }

  private deduplicateColors(colors: ColorSwatch[]): ColorSwatch[] {
    const seen = new Set<string>();
    const unique: ColorSwatch[] = [];

    for (const color of colors) {
      if (!seen.has(color.hex)) {
        seen.add(color.hex);
        unique.push(color);
      }
    }

    return unique;
  }

  private async generatePaletteFallback(keyword: string): Promise<ColorSwatch[]> {
    const normalized = keyword.toLowerCase().trim();
    for (const [key, palette] of Object.entries(FALLBACK_PALETTES)) {
      if (normalized.includes(key) || key.includes(normalized)) {
        return palette;
      }
    }

    try {
      const prompt = [
        `Buat palet 5 warna untuk estetik/mood: "${keyword}".`,
        `Nama warna (label) HARUS dalam Bahasa Indonesia (misal: "Biru Langit", "Merah Marun", "Hitam Pekat").`,
        `Return ONLY valid JSON (no markdown) with this structure:`,
        `{ "colors": [{ "hex": "#RRGGBB", "label": "Nama Warna" }] }`,
      ].join("\n");

      const result = await this.aiService.generateJSON<AIPaletteResponse>(prompt, 0.7);
      if (result.colors && result.colors.length > 0) {
        return result.colors.slice(0, 5);
      }
    } catch {
      console.log("[AestheticService] AI palette generation failed, using default");
    }

    return DEFAULT_PALETTE;
  }

  private rgbToHex(r: number, g: number, b: number): string {
    return `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`.toUpperCase();
  }

  private labelColor(hex: string): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;

    if (brightness < 30) return "Hitam Pekat";
    if (brightness > 230) return "Putih Bersih";
    if (r > g && r > b) return r > 200 ? "Merah Hangat" : "Merah Tua";
    if (g > r && g > b) return g > 200 ? "Hijau Terang" : "Hijau Hutan";
    if (b > r && b > g) return b > 200 ? "Biru Langit" : "Biru Tua";
    if (r > 180 && g > 180) return "Keemasan";
    if (r > 180 && b > 180) return "Magenta";
    if (g > 180 && b > 180) return "Teal";
    return brightness > 128 ? "Nada Terang" : "Nada Gelap";
  }

  formatPaletteMessage(result: MoodboardResult): string {
    const paletteLines = result.palette.map((c) => `\`${c.hex}\` — ${c.label}`);

    return [
      `*${S.PALETTE} Moodboard — "${result.keyword}"*`,
      ``,
      `*Palet Warna*`,
      ...paletteLines,
      ``,
      result.images.length > 0
        ? `_${result.images.length} gambar dari Unsplash_`
        : `_Gambar tidak tersedia. Palet warna dibuat dari analisis tema._`,
    ].join("\n");
  }
}
