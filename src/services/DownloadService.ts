/**
 * Download Service - Cloud-Native for Railway.app (512MB RAM / 1 vCPU)
 *
 * Strategy:
 * Layer 1 (Primary): Cobalt Public API Rotation (v10 Compliant)
 *   - Offloads ALL processing to external servers
 *   - Uses high-availability instance list for maximum reliability
 *   - Implements Cobalt API v10 spec (downloadMode, etc.)
 *
 * Layer 2 (Fallback): Lightweight yt-dlp via youtube-dl-exec
 *   - Uses the npm package which manages binary internally
 *   - Metadata extraction only (--dump-single-json)
 *   - NEVER downloads files to disk
 *   - Returns direct stream URL for Telegram to handle
 *
 * Cloud Deployment Notes:
 * - youtube-dl-exec auto-detects binary in node_modules/.bin
 * - No hardcoded paths required
 * - Works on Railway, Render, Heroku, etc.
 */

import axios from "axios";
import { createRequire } from "module";
import { TempCleanerService } from "./TempCleanerService.js";

/**
 * youtube-dl-exec library.
 * On Railway/cloud, the library automatically finds the yt-dlp binary
 * bundled within node_modules (no manual PATH configuration needed).
 *
 * Using createRequire for CJS/ESM interop - the library exports a callable function
 * but TypeScript ESM import doesn't recognize it without this pattern.
 */
const require = createRequire(import.meta.url);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const youtubedl = require("youtube-dl-exec") as (url: string, flags?: Record<string, any>) => Promise<any>;

// --- Types (Cobalt API v10) ---

/**
 * Cobalt API v10 Request Payload
 * Docs: https://github.com/imputnet/cobalt/blob/main/docs/api.md
 */
interface CobaltV10Request {
  url: string;
  /** "auto" (video+audio) or "audio" (audio only) */
  downloadMode?: "auto" | "audio" | "mute";
  /** "720", "1080", "max", "4k", "144", "240", "360", "480" */
  videoQuality?: "144" | "240" | "360" | "480" | "720" | "1080" | "1440" | "2160" | "max";
  /** "classic", "basic", "pretty", "nerdy" */
  filenamePattern?: "classic" | "basic" | "pretty" | "nerdy";
  /** Audio format for audio-only downloads: "best", "mp3", "ogg", "wav", "opus" */
  audioFormat?: "best" | "mp3" | "ogg" | "wav" | "opus";
  /** TikTok-specific: remove watermark */
  tiktokWatermark?: boolean; // Note: Cobalt v10 usually handles this via downloadMode or defaults
}

interface CobaltPickerItem {
  url: string;
  type: "video" | "audio" | "photo";
  thumb?: string;
}

interface CobaltSuccessResponse {
  status: "stream" | "redirect" | "tunnel";
  url: string;
  filename?: string;
}

interface CobaltPickerResponse {
  status: "picker";
  picker: CobaltPickerItem[];
  audio?: string;
}

interface CobaltErrorResponse {
  status: "error";
  text: string;
}

type CobaltResponse = CobaltSuccessResponse | CobaltPickerResponse | CobaltErrorResponse;

/**
 * Unified download result.
 * Always returns direct stream URL - never local file paths.
 */
export interface DownloadResult {
  /** Direct stream URL (NEVER a local file path) */
  url: string;
  /** Suggested filename for the media */
  filename: string;
  /** Whether this is audio-only content */
  isAudio: boolean;
  /** Source of the result */
  source: "cobalt" | "ytdlp";
}

/** yt-dlp JSON output structure (key fields only) */
interface YtDlpMetadata {
  url?: string;
  urls?: string;
  title?: string;
  ext?: string;
  formats?: Array<{
    url?: string;
    format_id?: string;
    height?: number;
    acodec?: string;
    vcodec?: string;
    filesize?: number;
    fps?: number;
    ext?: string;
  }>;
  requested_formats?: Array<{
    url?: string;
    format_id?: string;
  }>;
}

// --- Constants ---

/** Cobalt API timeout - fast failover between instances */
const COBALT_TIMEOUT_MS = 6000; // 6s per instance

/** yt-dlp execution timeout - prevent hanging on single vCPU */
const YTDLP_TIMEOUT_MS = 20000; // 20s max

// --- Service ---

export class DownloadService {
  private tempCleaner: TempCleanerService;

  /**
   * High-availability Cobalt instance list.
   * Order: Most reliable first, official API last (often rate-limited).
   * User can override with COBALT_API_URL env var.
   */
  private readonly COBALT_INSTANCES: string[] = [
    ...(process.env.COBALT_API_URL ? [process.env.COBALT_API_URL] : []),
    "https://cobalt.api.sc",
    "https://api.cobalt.kwiatekmiki.pl",
    "https://cobalt.canine.tools",
    "https://cobalt.slpy.one",
    "https://cobalt.startpage.xyz",
    "https://api.cobalt.aizuu.pl",
    "https://cobalt.club",
    "https://api.cobalt.tools", // Official as last resort (often restricted)
  ];

  constructor(tempCleaner: TempCleanerService) {
    this.tempCleaner = tempCleaner;
  }

  /**
   * Main entry point: Download media using two-layer failover.
   * Layer 1: Cobalt instance rotation (offloads processing)
   * Layer 2: Local yt-dlp metadata extraction (memory-safe)
   */
  async downloadMedia(url: string, audioOnly: boolean = false): Promise<DownloadResult> {
    console.log(`[DownloadService] Processing: ${url}`);

    // --- Layer 1: Cobalt Instance Rotation ---
    let cobaltError: string | null = null;

    for (const instanceUrl of this.COBALT_INSTANCES) {
      try {
        console.log(`[DownloadService] Trying Cobalt: ${instanceUrl}`);
        const result = await this.downloadViaCobalt(url, instanceUrl, audioOnly);
        console.log(`[DownloadService] ✓ Cobalt success via ${instanceUrl}`);
        return result;
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        console.warn(`[DownloadService] ✗ Cobalt failed (${instanceUrl}): ${msg}`);
        cobaltError = msg;
        // Continue to next instance
      }
    }

    // --- Layer 2: yt-dlp Fallback (Memory-Safe) ---
    console.log(`[DownloadService] All Cobalt instances failed, using yt-dlp fallback...`);
    try {
      return await this.downloadViaYtDlp(url, audioOnly);
    } catch (error) {
      const ytDlpError = error instanceof Error ? error.message : String(error);
      console.error(`[DownloadService] yt-dlp also failed: ${ytDlpError}`);
      throw new Error(
        `Download gagal.\n` +
          `Cobalt: ${cobaltError || "Semua instance tidak tersedia"}\n` +
          `yt-dlp: ${ytDlpError || "Unknown error"}`,
      );
    }
  }

  /**
   * Layer 1: Download via Cobalt API instance (v10 Compliant).
   * Returns direct stream URL on success, throws on failure.
   */
  private async downloadViaCobalt(url: string, instanceUrl: string, audioOnly: boolean): Promise<DownloadResult> {
    // Construct request body according to Cobalt API v10
    const requestBody: CobaltV10Request = {
      url,
      // Map audioOnly to downloadMode
      downloadMode: audioOnly ? "audio" : "auto",
      // Explicitly set quality and format (Max 720p, 30fps is handled by Cobalt best effort, Audio mp3)
      videoQuality: "720",
      audioFormat: "mp3",
      filenamePattern: "basic",
    };

    const { data } = await axios.post<CobaltResponse>(instanceUrl, requestBody, {
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (compatible; TelegramBot/2.0)",
      },
      timeout: COBALT_TIMEOUT_MS,
    });

    // Handle error response
    if (data.status === "error") {
      throw new Error(data.text || "Unknown Cobalt error");
    }

    let streamUrl: string;
    let filename = "media";

    if (data.status === "picker") {
      // Multiple formats available - pick preferred type
      const item = data.picker.find((p) => p.type === (audioOnly ? "audio" : "video")) || data.picker[0];
      if (!item) throw new Error("No media available in picker");
      streamUrl = item.url;
    } else {
      // Direct stream/redirect/tunnel
      streamUrl = data.url;
      if (data.filename) filename = data.filename;
    }

    return {
      url: streamUrl,
      filename: filename + (audioOnly ? ".mp3" : ".mp4"),
      isAudio: audioOnly,
      source: "cobalt",
    };
  }

  /**
   * Layer 2: Memory-safe yt-dlp fallback using youtube-dl-exec.
   *
   * Cloud Deployment Notes:
   * - youtube-dl-exec bundles yt-dlp binary in node_modules
   * - No PATH configuration or manual binary install needed
   * - Works out-of-box on Railway, Render, Heroku, etc.
   *
   * Memory Safety:
   * - Uses dumpSingleJson: true to ONLY fetch metadata
   * - Uses noDownload: true to NEVER write files to disk
   * - Extracts direct stream URL from metadata
   * - Telegram streams directly from this URL
   */
  private async downloadViaYtDlp(url: string, audioOnly: boolean): Promise<DownloadResult> {
    console.log(`[DownloadService] Running yt-dlp metadata extraction for: ${url}`);

    try {
      /**
       * youtube-dl-exec flags for cloud/memory-safe operation:
       * - dumpSingleJson: Output metadata as JSON only
       * - noDownload: NEVER download video to disk
       * - noCheckCertificates: Bypass SSL issues
       * - preferFreeFormats: Avoid heavy codecs
       * - noPlaylist: Single video only
       * - format: Select appropriate quality
       */
      const metadata = (await Promise.race([
        youtubedl(url, {
          dumpSingleJson: true,
          noDownload: true,
          noCheckCertificates: true,
          preferFreeFormats: true,
          noPlaylist: true,
          // Video: max 720p, max 30fps. Audio: mp3
          format: audioOnly
            ? "bestaudio[ext=mp3]/bestaudio"
            : "bestVideo[height<=720][fps<=30]+bestAudio/best[height<=720][fps<=30]/best",
        }),
        // Timeout protection for single vCPU
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("yt-dlp timeout (20s exceeded)")), YTDLP_TIMEOUT_MS),
        ),
      ])) as YtDlpMetadata;

      // Extract the best available direct URL from metadata
      let streamUrl: string | undefined;

      // Priority 1: Direct URL field
      if (metadata.url) {
        streamUrl = metadata.url;
      }
      // Priority 2: From requested_formats (merged streams)
      else if (metadata.requested_formats?.length) {
        streamUrl = metadata.requested_formats[0].url;
      }
      // Priority 3: From formats array (pick best match)
      else if (metadata.formats?.length) {
        const format = audioOnly
          ? metadata.formats.find((f) => f.acodec !== "none" && f.vcodec === "none" && f.ext === "mp3") ||
            metadata.formats.find((f) => f.acodec !== "none" && f.vcodec === "none")
          : metadata.formats.find((f) => f.height && f.height <= 720 && (!f.fps || f.fps <= 30) && f.url);
        streamUrl = format?.url || metadata.formats[metadata.formats.length - 1]?.url;
      }
      // Priority 4: urls field (some extractors use this)
      else if (metadata.urls) {
        streamUrl = metadata.urls;
      }

      if (!streamUrl) {
        throw new Error("yt-dlp: Tidak dapat menemukan URL streaming");
      }

      const title = metadata.title || "media";
      const ext = audioOnly ? "mp3" : metadata.ext || "mp4";

      console.log(`[DownloadService] yt-dlp extracted stream URL for: ${title}`);

      return {
        url: streamUrl,
        filename: `${title.replace(/[^a-zA-Z0-9 ]/g, "").substring(0, 50)}.${ext}`,
        isAudio: audioOnly,
        source: "ytdlp",
      };
    } catch (error) {
      // Enhanced error messages for debugging
      if (error instanceof Error) {
        if (error.message.includes("timeout")) {
          throw new Error("yt-dlp timeout (20s exceeded)");
        }
        if (error.message.includes("ENOENT")) {
          throw new Error("yt-dlp binary not found (check youtube-dl-exec installation)");
        }
        throw new Error(`yt-dlp: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Convenience method to get direct URL only.
   */
  async getDirectUrl(url: string, audioOnly: boolean = false): Promise<string> {
    const result = await this.downloadMedia(url, audioOnly);
    return result.url;
  }

  /**
   * Check if result is a direct URL (always true for this cloud service).
   */
  isDirectUrl(): boolean {
    return true;
  }

  /**
   * Get TempCleaner reference (for potential future use).
   */
  getTempCleaner(): TempCleanerService {
    return this.tempCleaner;
  }
}
