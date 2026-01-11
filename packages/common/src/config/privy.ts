import * as dotenv from 'dotenv';

dotenv.config();
import { PrivyClient } from '@privy-io/server-auth';

if (!process.env.PRIVY_APP_ID || !process.env.PRIVY_APP_SECRET) {
  console.error('CRITICAL: PRIVY_APP_ID or PRIVY_APP_SECRET is missing from environment');
}

export const privyClient = new PrivyClient(
  process.env.PRIVY_APP_ID || 'missing-app-id',
  process.env.PRIVY_APP_SECRET || 'missing-app-secret'
);

export const getPrivyUser = async (idToken: string) => {
  return privyClient.getUser({ idToken })
}