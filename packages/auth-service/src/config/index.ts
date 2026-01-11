import * as dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.AUTH_SERVICE_PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  privy: {
    appId: process.env.PRIVY_APP_ID!,
    appSecret: process.env.PRIVY_APP_SECRET!,
    verificationKey: process.env.PRIVY_VERIFICATION_KEY!.replace(
      /\\n/g,
      "\n"
    ),
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
  'PRIVY_APP_ID',
  'PRIVY_APP_SECRET',
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