import { createAdapter } from '@socket.io/redis-adapter';
import colors from 'colors';
import Redis from 'ioredis';
import { Secret } from 'jsonwebtoken';
import { Server } from 'socket.io';
import config from '../config';
import { errorLogger, logger } from '../shared/logger';
import { jwtHelper } from './jwtHelper';

let ioInstance: Server | undefined;

// Every authenticated socket joins a room named after its own user id, so any
// service can push an event to a specific user without tracking connections
// itself — no separate "online operators" socket bookkeeping needed, since
// availability already lives in OperatorProfile via the REST API.
const userRoom = (userId: string) => `user:${userId}`;

// In production, server.ts forks multiple worker processes, each with its own
// in-memory Socket.io instance — emitToUser() would silently only reach
// sockets on the SAME worker without this. With REDIS_URL set, events fan out
// to every worker via Redis pub/sub; without it, real-time delivery only
// works within a single process (fine for local/single-worker dev, not for
// production cluster mode).
const attachRedisAdapter = async (io: Server): Promise<void> => {
  if (!config.redis_url) {
    logger.warn(
      colors.yellow(
        'REDIS_URL not set — Socket.io is running without a shared adapter. ' +
          'In cluster mode, users on different workers will miss each other\'s real-time events.'
      )
    );
    return;
  }

  try {
    const pubClient = new Redis(config.redis_url);
    const subClient = pubClient.duplicate();
    await Promise.all([
      new Promise((resolve, reject) => {
        pubClient.once('ready', resolve);
        pubClient.once('error', reject);
      }),
      new Promise((resolve, reject) => {
        subClient.once('ready', resolve);
        subClient.once('error', reject);
      }),
    ]);
    io.adapter(createAdapter(pubClient, subClient));
    logger.info(colors.green('Socket.io Redis adapter attached'));
  } catch (error) {
    errorLogger.error(
      'Socket.io Redis adapter failed to connect — falling back to in-memory adapter',
      error
    );
  }
};

const socket = async (io: Server) => {
  ioInstance = io;

  await attachRedisAdapter(io);

  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token as string | undefined;
      if (!token) {
        return next(new Error('Authentication token is required'));
      }
      const decoded = jwtHelper.verifyToken(token, config.jwt.jwt_secret as Secret);
      socket.data.userId = decoded.id as string;
      next();
    } catch (error) {
      next(new Error('Invalid or expired token'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.data.userId as string;
    socket.join(userRoom(userId));
    logger.info(colors.blue(`Socket connected: ${userId}`));

    socket.on('disconnect', () => {
      logger.info(colors.red(`Socket disconnected: ${userId}`));
    });
  });
};

const emitToUser = (userId: string, event: string, payload: unknown) => {
  ioInstance?.to(userRoom(userId)).emit(event, payload);
};

const emitToUsers = (userIds: string[], event: string, payload: unknown) => {
  if (!ioInstance || !userIds.length) return;
  ioInstance.to(userIds.map(userRoom)).emit(event, payload);
};

export const socketHelper = { socket, emitToUser, emitToUsers };
