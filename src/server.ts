import { createServer, Server as HttpServer } from 'http';
import net from 'net';
import { Server as SocketServer } from 'socket.io';
import colors from 'colors';
import { validateConfig } from './DB/configValidation';
import { connectToDatabase } from './DB/db';
import app from './app';
import config from './config';
import { logger } from './shared/logger';
import { socketHelper } from './helpers/socketHelper';
import { setupProcessHandlers } from './DB/processHandlers';
import { setupSecurity } from './DB/security';
import { setupCluster } from './DB/cluster';

// Define the types for the servers
let httpServer: HttpServer;
let socketServer: SocketServer;

// Find an available port starting from a preferred one
async function getAvailablePort(
  preferredPort: number,
  host: string
): Promise<{ port: number; changed: boolean }> {
  let port = preferredPort;
  while (true) {
    // eslint-disable-next-line no-await-in-loop
    const isFree = await new Promise<boolean>((resolve) => {
      const tester = net
        .createServer()
        .once('error', () => resolve(false))
        .once('listening', () => tester.close(() => resolve(true)))
        .listen(port, host);
    });
    if (isFree) {
      return { port, changed: port !== preferredPort };
    }
    port += 1; // try next port
  }
}

// Function to start the server
export async function startServer() {
  try {
    // Validate config
    validateConfig();
    // Connect to the database
    await connectToDatabase();
    // Create HTTP server
    httpServer = createServer(app);
    const preferredHttpPort = Number(config.port) || 6002;
    const ipAddress = (config.ip_address as string) || '0.0.0.0';

    // Resolve free ports (avoids EADDRINUSE forever)
    const httpPortInfo = await getAvailablePort(preferredHttpPort, ipAddress);
    const httpPort = httpPortInfo.port;

    // Set timeouts
    httpServer.timeout = 120000;
    httpServer.keepAliveTimeout = 5000;
    httpServer.headersTimeout = 60000;

    // Start HTTP server
    let currentHttpPort = httpPort;
    httpServer.on('error', async (err: any) => {
      if (err && err.code === 'EADDRINUSE') {
        const next = await getAvailablePort(currentHttpPort + 1, ipAddress);
        currentHttpPort = next.port;
        logger.warn(
          colors.yellow(`HTTP port in use. Retrying on ${currentHttpPort}...`)
        );
        httpServer.listen(currentHttpPort, ipAddress);
        return;
      }
      logger.error(colors.red('HTTP server error'), err);
    });

    httpServer.listen(currentHttpPort, ipAddress, () => {
      logger.info(
        colors.yellow(
          `♻️  Application listening on http://${ipAddress}:${currentHttpPort}`
        )
      );
      if (httpPortInfo.changed) {
        logger.warn(
          colors.yellow(
            `Requested port ${preferredHttpPort} was in use. Switched to ${currentHttpPort}.`
          )
        );
      }
    });

    // Set up Socket.io server attached to the HTTP server (no separate port)
    socketServer = new SocketServer(httpServer, {
      cors: {
        origin: config.allowed_origins || '*',
        methods: ['GET', 'POST'],
        credentials: true,
      },
    });
    socketHelper.socket(socketServer);
    logger.info(
      colors.yellow(
        `♻️  Socket attached to HTTP server on http://${ipAddress}:${currentHttpPort}`
      )
    );
  } catch (error) {
    logger.error(colors.red('Failed to start server'), error);
    process.exit(1);
  }
}
// Set up error handlers
setupProcessHandlers();
// Set up security middleware
setupSecurity();
if (config.node_env === 'production') {
  setupCluster();
} else {
  startServer();
}
// Export server instances
export { httpServer, socketServer };
