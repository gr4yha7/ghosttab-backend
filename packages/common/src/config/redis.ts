import * as dotenv from 'dotenv';

dotenv.config();
import { createClient, RedisClientType } from 'redis';
import { logger } from './logger';

let redisClient: RedisClientType | null = null;
let isConnecting = false;

export const getRedisClient = async (): Promise<RedisClientType> => {
  if (redisClient && redisClient.isOpen) {
    return redisClient;
  }

  if (isConnecting) {
    // Wait for connection to complete
    await new Promise(resolve => setTimeout(resolve, 100));
    return getRedisClient();
  }

  isConnecting = true;

  try {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

    redisClient = createClient({
      url: redisUrl,
    });

    redisClient.on('error', (err) => {
      logger.error('Redis Client Error', { error: err });
    });

    redisClient.on('connect', () => {
      logger.info('Redis Client Connected');
    });

    redisClient.on('reconnecting', () => {
      logger.warn('Redis Client Reconnecting');
    });

    await redisClient.connect();
    isConnecting = false;

    return redisClient;
  } catch (error) {
    isConnecting = false;
    logger.error('Failed to connect to Redis', { error });
    throw new Error('Redis connection failed');
  }
};

// Initialize Redis client
let redisClientInstance: RedisClientType;
(async () => {
  redisClientInstance = await getRedisClient();
})();

// Notification channel helpers
export const getNotificationChannel = (userId: string) => `notifications:${userId}`;

export const publishNotification = async (userId: string, notification: any) => {
  try {
    const client = await getRedisClient();
    const channel = getNotificationChannel(userId);
    await client.publish(channel, JSON.stringify(notification));
    logger.debug('Notification published', { userId, channel });
  } catch (error) {
    logger.error('Failed to publish notification', { userId, error });
    throw error;
  }
};

// Subscribe to a channel
export const subscribeToChannel = async (
  channel: string,
  callback: (message: string) => void
): Promise<RedisClientType> => {
  const subscriber = redisClient!.duplicate();
  await subscriber.connect();

  await subscriber.subscribe(channel, (message) => {
    callback(message);
  });

  logger.info('Subscribed to channel', { channel });
  return subscriber;
};