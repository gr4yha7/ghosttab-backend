import { Redis } from '@upstash/redis';

let redisClient: Redis | null = null;

export const getRedisClient = (): Redis => {
  if (!redisClient) {
    const redisUrl = process.env.UPSTASH_REDIS_URL;
    const redisToken = process.env.UPSTASH_REDIS_TOKEN;

    if (!redisUrl || !redisToken) {
      throw new Error('Missing Upstash Redis environment variables');
    }

    redisClient = new Redis({
      url: redisUrl,
      token: redisToken,
    });
  }

  return redisClient;
};

export const redis = getRedisClient();

// Notification channel helpers
export const getNotificationChannel = (userId: string) => `notifications:${userId}`;

export const publishNotification = async (userId: string, notification: any) => {
  const channel = getNotificationChannel(userId);
  await redis.publish(channel, JSON.stringify(notification));
};