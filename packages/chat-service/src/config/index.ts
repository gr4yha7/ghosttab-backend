import * as dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.CHAT_SERVICE_PORT || '3005', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  
  jwt: {
    secret: process.env.JWT_SECRET!,
  },
  
  cors: {
    origins: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
  },
  
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
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
  'STREAM_API_KEY',
  'STREAM_API_SECRET',
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}