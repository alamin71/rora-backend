import { logger } from "../shared/logger";
import { gracefulShutdown } from "./shutdown";
import colors from "colors";

export function setupProcessHandlers() {
  process.on("uncaughtException", (error) => {
    const errorMessage =
      error && typeof error.message === "string"
        ? error.message
        : String(error);
    if (errorMessage.includes("critical")) {
      logger.error(colors.red("Uncaught Exception critical"), errorMessage);
      gracefulShutdown("uncaughtException");
    }
  });

  process.on("unhandledRejection", (reason, promise) => {
    const reasonMessage =
      reason instanceof Error ? reason.message : String(reason);

    if (reasonMessage.includes("critical")) {
      logger.error(
        colors.red("Unhandled Rejection at critical"),
        promise,
        "reason:",
        reasonMessage
      );
      gracefulShutdown("unhandledRejection");
    }
  });

  // Signal handlers are fine as they are
  process.on("SIGINT", () => {
    gracefulShutdown("SIGINT");
  });

  process.on("SIGTERM", () => {
    gracefulShutdown("SIGTERM");
  });

  process.on("SIGUSR2", () => {
    gracefulShutdown("SIGUSR2");
  });
}
