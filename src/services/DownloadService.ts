/**
 * Download service for YouTube and TikTok media
 */

import { HttpClient } from "./HttpClient.js";
import { TempCleanerService } from "./TempCleanerService.js";
import { CONFIG } from "../config/index.js";
import fs from "fs";
import { Readable } from "stream";

export type DownloadSource = "youtube" | "tiktok";
export type DownloadFormat = "mp4" | "mp3";

export interface DownloadResult {
  type: "url" | "file";
  path: string;
  format: DownloadFormat;
}

interface DownloadApiResponse {
  status: string;
  url?: string;
}

export class DownloadService {
  private http: HttpClient;
  private tempCleaner: TempCleanerService;

  constructor(http: HttpClient, tempCleaner: TempCleanerService) {
    this.http = http;
    this.tempCleaner = tempCleaner;
  }

  private getApiUrl(source: DownloadSource, format: DownloadFormat, url: string): string {
    const encodedUrl = encodeURIComponent(url);

    if (source === "youtube") {
      return `${CONFIG.API.YOUTUBE_DL}?format=${format}&url=${encodedUrl}`;
    } else {
      return `${CONFIG.API.TIKTOK_DL}?url=${encodedUrl}&format=${format}`;
    }
  }

  /**
   * Download media from YouTube or TikTok
   * Returns either a direct URL or path to downloaded file
   */
  async download(source: DownloadSource, format: DownloadFormat, url: string): Promise<DownloadResult | null> {
    const apiUrl = this.getApiUrl(source, format, url);

    try {
      const response = await this.http.getStream(apiUrl);
      const contentType = response.headers["content-type"] as string | undefined;

      // Handle JSON response (contains URL)
      if (contentType?.includes("application/json")) {
        let data = "";
        for await (const chunk of response.data as Readable) {
          data += chunk;
        }

        const parsed = JSON.parse(data) as DownloadApiResponse;
        if (parsed.status === "success" && parsed.url) {
          return {
            type: "url",
            path: parsed.url,
            format,
          };
        }
        return null;
      }

      // Handle binary stream (download file)
      if (
        contentType?.includes("application/octet-stream") ||
        contentType?.includes("video") ||
        contentType?.includes("audio")
      ) {
        const ext = format === "mp4" ? ".mp4" : ".mp3";
        const prefix = format === "mp4" ? "video" : "audio";
        const tempFilePath = this.tempCleaner.getTempFilePath(prefix, ext);

        await new Promise<void>((resolve, reject) => {
          const writer = fs.createWriteStream(tempFilePath);
          (response.data as Readable).pipe(writer);

          writer.on("finish", resolve);
          writer.on("error", (err) => {
            this.tempCleaner.deleteFile(tempFilePath);
            reject(err);
          });

          // Timeout after 5 minutes
          const timeout = setTimeout(
            () => {
              writer.destroy();
              this.tempCleaner.deleteFile(tempFilePath);
              reject(new Error("Download timeout"));
            },
            5 * 60 * 1000,
          );

          writer.on("finish", () => clearTimeout(timeout));
        });

        return {
          type: "file",
          path: tempFilePath,
          format,
        };
      }

      return null;
    } catch {
      return null;
    }
  }
}
