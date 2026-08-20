import os from "os";
import colors from "colors";
import { errorLogger, logger } from "../shared/logger";
import { startServer } from "../server";
import cluster from "cluster";

const CONFIG = {
  WORKER_RESTART_DELAY: 5000,
  MAX_RESTART_ATTEMPTS: 5,
  MAX_BACKOFF_DELAY: 60000,
  WORKER_COUNT:
    process.env.NODE_ENV === "production"
      ? os.cpus().length
      : Math.max(2, Math.min(4, os.cpus().length)),
};

export function setupCluster() {
  if (cluster.isPrimary) {
    const workerRestarts = new Map<number, number>();
    let shuttingDown = false;

    logger.info(colors.blue(`Master ${process.pid} is running`));
    logger.info(colors.blue(`Starting ${CONFIG.WORKER_COUNT} workers...`));

    for (let i = 0; i < CONFIG.WORKER_COUNT; i++) {
      cluster.fork();
    }
    cluster.on("message", (worker, message) => {
      if (message === "ready") {
        logger.info(
          colors.green(
            `Worker ${worker.process.pid} is ready to accept connections`
          )
        );
      }
    });

    cluster.on("exit", (worker, code, signal) => {
      const pid = worker.process.pid || 0;
      const restarts = workerRestarts.get(pid) || 0;
      if (shuttingDown) {
        logger.info(
          colors.blue(`Worker ${pid} exited during shutdown, not restarting`)
        );
        return;
      }
      if (signal) {
        logger.warn(
          colors.yellow(`Worker ${pid} was killed by signal: ${signal}`)
        );
      } else if (code !== 0) {
        logger.warn(
          colors.yellow(`Worker ${pid} exited with error code: ${code}`)
        );
      } else {
        logger.info(colors.blue(`Worker ${pid} exited successfully`));
        const newWorker = cluster.fork();
        logger.info(
          colors.blue(
            `Replacing worker ${pid} with new worker ${newWorker.process.pid}`
          )
        );
        return;
      }

      if (restarts < CONFIG.MAX_RESTART_ATTEMPTS) {
        const delay = Math.min(
          CONFIG.WORKER_RESTART_DELAY * Math.pow(2, restarts),
          CONFIG.MAX_BACKOFF_DELAY
        );

        logger.info(
          colors.blue(
            `Restarting worker ${pid} in ${delay}ms (attempt ${restarts + 1})`
          )
        );

        setTimeout(() => {
          const newWorker = cluster.fork();
          workerRestarts.set(newWorker.process.pid || 0, restarts + 1);
        }, delay);
      } else {
        logger.error(
          colors.red(
            `Worker ${pid} failed to restart after ${CONFIG.MAX_RESTART_ATTEMPTS} attempts`
          )
        );
      }
    });

    ["SIGINT", "SIGTERM"].forEach((signal) => {
      process.on(signal, () => {
        shuttingDown = true;
        logger.info(
          colors.yellow(
            `Primary ${process.pid} received ${signal}, initiating graceful shutdown...`
          )
        );
        for (const id in cluster.workers) {
          const worker = cluster.workers[id];
          if (worker) {
            worker.process.kill("SIGTERM");
          }
        }
        setTimeout(() => {
          logger.error(colors.red("Forced shutdown after timeout"));
          process.exit(1);
        }, 30000);
      });
    });
  } else {
    logger.info(colors.blue(`Worker ${process.pid} started`));
    process.on("uncaughtException", (error) => {
      errorLogger.error(
        colors.red(`Worker ${process.pid} uncaught exception`),
        error
      );
      setTimeout(() => process.exit(1), 1000);
    });

    // Start the server
    startServer()
      .then(() => {
        if (process.send) {
          process.send("ready");
        }
      })
      .catch((error) => {
        errorLogger.error(
          colors.red(`Worker ${process.pid} failed to start`),
          error
        );
        process.exit(1);
      });
    process.on("SIGTERM", () => {
      logger.info(
        colors.yellow(
          `Worker ${process.pid} received SIGTERM, shutting down gracefully...`
        )
      );
      setTimeout(() => {
        logger.info(colors.blue(`Worker ${process.pid} exiting after cleanup`));
        process.exit(0);
      }, 5000);
    });
  }
}
