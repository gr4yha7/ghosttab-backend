import * as dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.TAB_SERVICE_PORT || '3003', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  cors: {
    origins: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
  },

  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  },

  // resend: {
  //   apiKey: process.env.RESEND_API_KEY!,
  // },

  mailgun: {
    apiKey: process.env.MAILGUN_API_KEY!,
    sandboxDomain: process.env.MAILGUN_SANDBOX_DOMAIN!,
  },

  otp: {
    expiryMinutes: 10,
    length: 6,
  },

  stream: {
    apiKey: process.env.STREAM_API_KEY!,
    apiSecret: process.env.STREAM_API_SECRET!,
  },

  movement: {
    rpcUrl: process.env.MOVEMENT_RPC_URL!,
    chainId: process.env.MOVEMENT_CHAIN_ID!,
    usdcAddress: process.env.MOVEMENT_USDC_ADDRESS!,
    ghosttabSettlementAddress: process.env.GHOSTTAB_SETTLEMENT_ADDRESS!,
    tabManagerPrivateKey: process.env.TAB_MANAGER_PRIVATE_KEY!,
  },

  shinami: {
    gasStationAccessKey: process.env.GAS_STATION_ACCESS_KEY!,
  }
};

// Validate required environment variables
const requiredEnvVars = [
  'PRIVY_APP_ID',
  'PRIVY_APP_SECRET',
  'SUPABASE_URL',
  'SUPABASE_SERVICE_KEY',
  'REDIS_URL',
  // 'RESEND_API_KEY',
  'MAILGUN_API_KEY',
  'STREAM_API_KEY',
  'STREAM_API_SECRET',
  'MOVEMENT_RPC_URL',
  'MOVEMENT_CHAIN_ID',
  'GAS_STATION_ACCESS_KEY',
  'TAB_MANAGER_PRIVATE_KEY'
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}