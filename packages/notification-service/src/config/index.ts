import * as dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.NOTIFICATION_SERVICE_PORT || '3004', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  cors: {
    origins: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
  },

  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  },

  websocket: {
    pingInterval: 30000, // 30 seconds
    maxConnections: 10000,
  },
};

// Validate required environment variables
const requiredEnvVars = [
  'PRIVY_APP_ID',
  'PRIVY_APP_SECRET',
  'SUPABASE_URL',
  'SUPABASE_SERVICE_KEY',
  'REDIS_URL',
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}