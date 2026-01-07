import * as dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.USER_SERVICE_PORT || '3002', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  
  cors: {
    origins: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
  },
  
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  },
  
  resend: {
    apiKey: process.env.RESEND_API_KEY!,
  },
  
  otp: {
    expiryMinutes: 10,
    length: 6,
  },

  stream: {
    apiKey: process.env.STREAM_API_KEY!,
    apiSecret: process.env.STREAM_API_SECRET!,
  },
};

// Validate required environment variables
const requiredEnvVars = [
  'JWT_SECRET',
  'SUPABASE_URL',
  'SUPABASE_SERVICE_KEY',
  'UPSTASH_REDIS_URL',
  'UPSTASH_REDIS_TOKEN',
  'RESEND_API_KEY',
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}