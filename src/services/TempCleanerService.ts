/**
 * Temp directory cleaner service
 * Runs as a cron job to delete files older than configured max age
 */

import cron from "node-cron";
import fs from "fs";
import path from "path";
import { CONFIG } from "../config/index.js";

export class TempCleanerService {
  private tempDir: string;
  private cronJob: cron.ScheduledTask | null = null;

  constructor(tempDir?: string) {
    this.tempDir = tempDir ?? path.resolve(process.cwd(), "temp");
  }

  /**
   * Ensure temp directory exists
   */
  ensureTempDir(): void {
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  /**
   * Clean temp directory of files older than max age
   */
  cleanTempDirectory(): void {
    try {
      if (!fs.existsSync(this.tempDir)) {
        return;
      }

      const files = fs.readdirSync(this.tempDir);
      const now = Date.now();

      for (const file of files) {
        const filePath = path.join(this.tempDir, file);

        try {
          const stats = fs.statSync(filePath);
          const age = now - stats.mtimeMs;

          if (age > CONFIG.TEMP_FILE_MAX_AGE_MS) {
            fs.unlinkSync(filePath);
            console.log(`[TempCleaner] Deleted old file: ${file}`);
          }
        } catch (err) {
          console.error(`[TempCleaner] Error processing file ${file}:`, err);
        }
      }
    } catch (err) {
      console.error("[TempCleaner] Error cleaning temp directory:", err);
    }
  }

  /**
   * Start the cron job (runs every hour at minute 0)
   */
  start(): void {
    this.ensureTempDir();

    // Run every hour at minute 0
    this.cronJob = cron.schedule("0 * * * *", () => {
      console.log("[TempCleaner] Running scheduled cleanup...");
      this.cleanTempDirectory();
    });

    console.log("[TempCleaner] Service started - cleaning temp files every hour");
  }

  /**
   * Stop the cron job
   */
  stop(): void {
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
      console.log("[TempCleaner] Service stopped");
    }
  }

  /**
   * Get temp directory path
   */
  getTempDir(): string {
    return this.tempDir;
  }

  /**
   * Generate a unique temp file path
   */
  getTempFilePath(prefix: string, extension: string): string {
    const timestamp = Date.now();
    return path.join(this.tempDir, `${prefix}-${timestamp}${extension}`);
  }

  /**
   * Safely delete a file
   */
  deleteFile(filePath: string): void {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (err) {
      console.error(`[TempCleaner] Error deleting file ${filePath}:`, err);
    }
  }
}
