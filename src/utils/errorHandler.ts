export function setupErrorHandlers(): void {
  process.on("uncaughtException", (error: Error) => {
    console.error("[FATAL] Uncaught Exception:", error.message);
    console.error(error.stack);
  });

  process.on("unhandledRejection", (reason: unknown) => {
    console.error("[ERROR] Unhandled Rejection:", reason);
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
