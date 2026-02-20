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

  ensureTempDir(): void {
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

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
          }
        } catch (err) {
          console.error(`[TempCleaner] Error processing file ${file}:`, err);
        }
      }
    } catch (err) {
      console.error("[TempCleaner] Error cleaning temp directory:", err);
    }
  }

  start(): void {
    this.ensureTempDir();

    this.cronJob = cron.schedule("0 * * * *", () => {
      this.cleanTempDirectory();
    });

    console.log("[TempCleaner] Service started - cleaning temp files every hour");
  }

  stop(): void {
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
      console.log("[TempCleaner] Service stopped");
    }
  }

  getTempDir(): string {
    return this.tempDir;
  }

  getTempFilePath(prefix: string, extension: string): string {
    const timestamp = Date.now();
    return path.join(this.tempDir, `${prefix}-${timestamp}${extension}`);
  }

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
