/**
 * Global error handler setup
 * Catches uncaught exceptions and unhandled rejections
 */

export function setupErrorHandlers(): void {
  process.on("uncaughtException", (error: Error) => {
    console.error("[FATAL] Uncaught Exception:", error.message);
    console.error(error.stack);
    // Don't exit - try to keep bot running
  });

  process.on("unhandledRejection", (reason: unknown) => {
    console.error("[ERROR] Unhandled Rejection:", reason);
    // Don't exit - try to keep bot running
  });

  process.on("SIGINT", () => {
    console.log("\n[INFO] Received SIGINT. Shutting down gracefully...");
    process.exit(0);
  });

  process.on("SIGTERM", () => {
    console.log("[INFO] Received SIGTERM. Shutting down gracefully...");
    process.exit(0);
  });
}
