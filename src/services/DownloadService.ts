import axios from "axios";
import { createRequire } from "module";
import { TempCleanerService } from "./TempCleanerService.js";
import { S } from "../config/symbols.js";

const require = createRequire(import.meta.url);
const youtubedl = require("youtube-dl-exec") as (url: string, flags?: Record<string, unknown>) => Promise<unknown>;

interface CobaltV10Request {
  url: string;
  downloadMode?: "auto" | "audio" | "mute";
  videoQuality?: "144" | "240" | "360" | "480" | "720" | "1080" | "1440" | "2160" | "max";
  filenamePattern?: "classic" | "basic" | "pretty" | "nerdy";
  audioFormat?: "best" | "mp3" | "ogg" | "wav" | "opus";
  audioBitrate?: "320" | "256" | "128" | "96" | "64" | "8";
  tiktokWatermark?: boolean;
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

export interface DownloadResult {
  url: string;
  filename: string;
  isAudio: boolean;
  source: "cobalt" | "ytdlp";
}

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

const COBALT_TIMEOUT_MS = 6000;

const YTDLP_TIMEOUT_MS = 20000;

export class DownloadService {
  private tempCleaner: TempCleanerService;

  private readonly COBALT_INSTANCES: string[] = [
    ...(process.env.COBALT_API_URL ? [process.env.COBALT_API_URL] : []),
    "https://cobalt.canine.tools",
    "https://cobalt-backend.canine.tools",
    "https://cobalt-api.meowing.de",
    "https://subito-c.meowing.de",
    "https://nuko-c.meowing.de",
    "https://kityune.imput.net",
    "https://nachos.imput.net",
    "https://sunny.imput.net",
    "https://cobalt.omega.wolfy.love",
    "https://cobalt.alpha.wolfy.love",
    "https://api.dl.woof.monster",
    "https://cobalt.slpy.one",
    "https://api.cobalt.kwiatekmiki.pl",
    "https://cobalt.api.sc",
    "https://grapefruit.clxxped.lol",
    "https://melon.clxxped.lol",
    "https://cobaltapi.squair.xyz",
    "https://api.qwkuns.me",
    "https://api.cobalt.aizuu.pl",
    "https://cobalt.startpage.xyz",
    "https://cobalt.club",
    "https://api.cobalt.tools",
  ];

  constructor(tempCleaner: TempCleanerService) {
    this.tempCleaner = tempCleaner;
  }

  async downloadMedia(url: string, audioOnly: boolean = false): Promise<DownloadResult> {
    console.log(`[DownloadService] Processing: ${url}`);

    let cobaltError: string | null = null;

    for (const instanceUrl of this.COBALT_INSTANCES) {
      try {
        console.log(`[DownloadService] Trying Cobalt: ${instanceUrl}`);
        const result = await this.downloadViaCobalt(url, instanceUrl, audioOnly);
        console.log(`[DownloadService] ${S.SUCCESS} Cobalt success via ${instanceUrl}`);
        return result;
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        console.warn(`[DownloadService] ${S.FAIL} Cobalt failed (${instanceUrl}): ${msg}`);
        cobaltError = msg;
      }
    }

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

  private async downloadViaCobalt(url: string, instanceUrl: string, audioOnly: boolean): Promise<DownloadResult> {
    const requestBody: CobaltV10Request = {
      url,
      downloadMode: audioOnly ? "audio" : "auto",
      videoQuality: "720",
      audioFormat: "mp3",
      audioBitrate: "64",
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

    if (data.status === "error") {
      throw new Error(data.text || "Unknown Cobalt error");
    }

    let streamUrl: string;
    let filename = "media";

    if (data.status === "picker") {
      const item = data.picker.find((p) => p.type === (audioOnly ? "audio" : "video")) || data.picker[0];
      if (!item) throw new Error("No media available in picker");
      streamUrl = item.url;
    } else {
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

  private async downloadViaYtDlp(url: string, audioOnly: boolean): Promise<DownloadResult> {
    console.log(`[DownloadService] Running yt-dlp metadata extraction for: ${url}`);

    try {
      const metadata = (await Promise.race([
        youtubedl(url, {
          dumpSingleJson: true,
          noDownload: true,
          noCheckCertificates: true,
          preferFreeFormats: true,
          noPlaylist: true,
          format: audioOnly
            ? "bestaudio[ext=mp3]/bestaudio"
            : "bestVideo[height<=720][fps<=30]+bestAudio/best[height<=720][fps<=30]/best",
        }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("yt-dlp timeout (20s exceeded)")), YTDLP_TIMEOUT_MS),
        ),
      ])) as YtDlpMetadata;

      let streamUrl: string | undefined;

      if (metadata.url) {
        streamUrl = metadata.url;
      } else if (metadata.requested_formats?.length) {
        streamUrl = metadata.requested_formats[0].url;
      } else if (metadata.formats?.length) {
        const format = audioOnly
          ? metadata.formats.find((f) => f.acodec !== "none" && f.vcodec === "none" && f.ext === "mp3") ||
            metadata.formats.find((f) => f.acodec !== "none" && f.vcodec === "none")
          : metadata.formats.find((f) => f.height && f.height <= 720 && (!f.fps || f.fps <= 30) && f.url);
        streamUrl = format?.url || metadata.formats[metadata.formats.length - 1]?.url;
      } else if (metadata.urls) {
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

  async getDirectUrl(url: string, audioOnly: boolean = false): Promise<string> {
    const result = await this.downloadMedia(url, audioOnly);
    return result.url;
  }

  isDirectUrl(): boolean {
    return true;
  }

  getTempCleaner(): TempCleanerService {
    return this.tempCleaner;
  }
}
