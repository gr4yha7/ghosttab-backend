import * as dotenv from 'dotenv';
dotenv.config();
import * as jwt from 'jsonwebtoken';
import { logger } from './logger';
import { privyClient } from './privy';

export interface JwtPayload {
  userId: string;
  walletAddress: string;
  email?: string;
}

export const verifyToken = async (token: string) => {
  try {
    const decoded = jwt.verify(token, process.env.PRIVY_APP_VERIFICATION_KEY!, {
      algorithms: ['ES256'],
      issuer: 'privy.io',
      audience: process.env.PRIVY_APP_ID!
    });
    logger.info("JWT decoded data", decoded);
    const user = await privyClient.getUser({idToken: token});
    if (decoded.sub! !== user.id) {
      logger.error("User DID mismatch!");
      throw new Error("User DID mismatch!");
    }
    return {
      userId: user.id,
      walletAddress: user.wallet?.address,
      email: user.email?.address
    } as JwtPayload;
  } catch (error) {
    logger.error(error);
    throw new Error('Invalid or expired token');
  }
};
