/**
 * Download Service using Cobalt API
 * Universal downloader for YouTube, TikTok, Instagram, Twitter, etc.
 */

import axios, { AxiosError } from "axios";
import fs from "fs";
import path from "path";
import { TempCleanerService } from "./TempCleanerService.js";
import { CONFIG } from "../config/index.js";

// --- Cobalt API Types ---

interface CobaltRequest {
  url: string;
  videoQuality?: string;
  filenamePattern?: string;
  isAudioOnly?: boolean;
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
  audio?: string; // Optional audio URL for combining
}

interface CobaltErrorResponse {
  status: "error";
  text: string;
}

type CobaltResponse = CobaltSuccessResponse | CobaltPickerResponse | CobaltErrorResponse;

// --- Download Result ---

export interface DownloadResult {
  filePath: string;
  filename: string;
  sizeBytes: number;
  isAudio: boolean;
}

// --- Constants ---

const TELEGRAM_FILE_LIMIT_BYTES = 50 * 1024 * 1024; // 50MB

// --- Service ---

export class DownloadService {
  private tempCleaner: TempCleanerService;

  constructor(tempCleaner: TempCleanerService) {
    this.tempCleaner = tempCleaner;
  }

  /**
   * Download media from any supported URL using Cobalt API.
   * Saves the file to temp folder and returns the path.
   * @param url The source URL (YouTube, TikTok, Instagram, etc.)
   * @param audioOnly If true, attempt to download audio only
   */
  async downloadMedia(url: string, audioOnly: boolean = false): Promise<DownloadResult> {
    console.log(`[DownloadService] Starting download for: ${url}`);

    // 1. Call Cobalt API
    const cobaltUrl = `${CONFIG.API.COBALT}/api/json`;
    const requestBody: CobaltRequest = {
      url,
      videoQuality: "720",
      filenamePattern: "basic",
      isAudioOnly: audioOnly,
    };

    let response: CobaltResponse;

    try {
      const { data } = await axios.post<CobaltResponse>(cobaltUrl, requestBody, {
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        timeout: 30000,
      });
      response = data;
    } catch (error) {
      const axiosError = error as AxiosError;
      console.error("[DownloadService] Cobalt API request failed:", axiosError.message);
      throw new Error("Gagal menghubungi server download. Coba lagi nanti.");
    }

    // 2. Handle response status
    let downloadUrl: string;

    if (response.status === "error") {
      console.error("[DownloadService] Cobalt API error:", response.text);
      throw new Error(`Download gagal: ${response.text}`);
    }

    if (response.status === "picker") {
      // Multiple options - select first video or audio
      const item = response.picker.find((p) => p.type === (audioOnly ? "audio" : "video")) || response.picker[0];
      if (!item) {
        throw new Error("Tidak ada media yang dapat diunduh.");
      }
      downloadUrl = item.url;
    } else {
      // stream, redirect, tunnel
      downloadUrl = response.url;
    }

    console.log(`[DownloadService] Got download URL: ${downloadUrl.substring(0, 50)}...`);

    // 3. Stream download to temp file
    const ext = audioOnly ? ".mp3" : ".mp4";
    const tempFilePath = this.tempCleaner.getTempFilePath("download", ext);

    try {
      const fileResponse = await axios.get(downloadUrl, {
        responseType: "stream",
        timeout: 300000, // 5 minute timeout for large files
      });

      const writer = fs.createWriteStream(tempFilePath);

      await new Promise<void>((resolve, reject) => {
        fileResponse.data.pipe(writer);
        writer.on("finish", resolve);
        writer.on("error", (err) => {
          this.tempCleaner.deleteFile(tempFilePath);
          reject(err);
        });
      });

      // Get file size
      const stats = fs.statSync(tempFilePath);
      const sizeBytes = stats.size;

      console.log(`[DownloadService] Downloaded ${sizeBytes} bytes to ${tempFilePath}`);

      return {
        filePath: tempFilePath,
        filename: path.basename(tempFilePath),
        sizeBytes,
        isAudio: audioOnly,
      };
    } catch (error) {
      // Cleanup on error
      this.tempCleaner.deleteFile(tempFilePath);
      console.error("[DownloadService] File download failed:", error);
      throw new Error("Gagal mengunduh file dari server.");
    }
  }

  /**
   * Check if file exceeds Telegram's 50MB limit
   */
  isFileTooLarge(sizeBytes: number): boolean {
    return sizeBytes > TELEGRAM_FILE_LIMIT_BYTES;
  }

  /**
   * Get direct download URL without saving to disk (for large files)
   */
  async getDirectUrl(url: string): Promise<string> {
    const cobaltUrl = `${CONFIG.API.COBALT}/api/json`;
    const requestBody: CobaltRequest = {
      url,
      videoQuality: "720",
      filenamePattern: "basic",
    };

    try {
      const { data } = await axios.post<CobaltResponse>(cobaltUrl, requestBody, {
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        timeout: 30000,
      });

      if (data.status === "error") {
        throw new Error(data.text);
      }

      if (data.status === "picker") {
        const item = data.picker.find((p) => p.type === "video") || data.picker[0];
        return item?.url || "";
      }

      return data.url;
    } catch (error) {
      console.error("[DownloadService] Failed to get direct URL:", error);
      throw new Error("Gagal mendapatkan link download.");
    }
  }
}
