import mongoose from "mongoose";
import colors from "colors";
import { errorLogger, logger } from "../shared/logger";
import { httpServer, socketServer } from "../server";

const SHUTDOWN_TIMEOUT_MS = 30000;
declare global {
  var isShuttingDown: boolean;
}
export function gracefulShutdown(signal: string) {
  if (global.isShuttingDown) return;
  global.isShuttingDown = true;

  logger.info(colors.blue(`${signal} received. Shutting down gracefully...`));

  // Stop accepting new connections first
  if (httpServer) {
    httpServer.close(() => {
      logger.info(colors.green("HTTP server closed successfully"));
    });
  }

  // Close socket server if exists
  if (socketServer) {
    socketServer.close(() => {
      logger.info(colors.green("Socket.io server closed successfully"));
    });
  }

  // Close database connection
  if (mongoose.connection.readyState !== 0) {
    mongoose.connection
      .close(true)
      .then(() => {
        logger.info(colors.green("Database connection closed gracefully"));
        process.exit(0);
      })
      .catch((err) => {
        errorLogger.error(colors.red("Error closing database connection"), err);
        process.exit(1);
      });
  } else {
    process.exit(0);
  }

  // Force shutdown after timeout if graceful shutdown fails
  setTimeout(() => {
    errorLogger.error(
      colors.red(`Forcing shutdown after ${SHUTDOWN_TIMEOUT_MS}ms timeout`)
    );
    process.exit(1);
  }, SHUTDOWN_TIMEOUT_MS);
}
