import * as dotenv from 'dotenv';

dotenv.config();
import { PrivyClient } from '@privy-io/server-auth';

export const privyClient = new PrivyClient(
  process.env.PRIVY_APP_ID!,
  process.env.PRIVY_APP_SECRET!
);

export const getPrivyUser = async (idToken: string) => {
  return privyClient.getUser({idToken})
}