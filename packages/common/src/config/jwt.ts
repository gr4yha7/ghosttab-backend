import * as dotenv from 'dotenv';
dotenv.config();
import { logger } from './logger';
import { privyClient } from './privy';

export interface JwtPayload {
  userId: string;
  walletAddress: string;
  email?: string;
}

export const verifyToken = async (token: string) => {
  try {
    if (!process.env.PRIVY_APP_ID || !process.env.PRIVY_APP_SECRET) {
      logger.error('Privy environment variables are missing', {
        appId: !!process.env.PRIVY_APP_ID,
        appSecret: !!process.env.PRIVY_APP_SECRET,
      });
    }

    const user = await privyClient.getUser({ idToken: token });
    return {
      userId: user.id,
      walletAddress: user.wallet?.address,
      email: user.email?.address
    } as JwtPayload;
  } catch (error: any) {
    logger.error('Privy token verification failed', {
      message: error.message,
      token: token.substring(0, 20) + '...',
      error: error
    });
    throw new Error(`Invalid or expired token: ${error.message || 'Unknown reason'}`);
  }
};
