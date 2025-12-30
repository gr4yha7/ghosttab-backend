import { PrivyClient } from '@privy-io/server-auth';
import { supabase, logger, UnauthorizedError, InternalServerError } from '@ghosttab/common';
import { config } from '../config';
import { generateToken, JwtPayload } from '../utils/jwt';
import { generateStreamToken, upsertStreamUser } from './stream.service';

const privyClient = new PrivyClient(
  config.privy.appId,
  config.privy.appSecret
);

interface VerifyTokenResponse {
  userId: string;
  privyId: string;
  walletAddress: string;
  email?: string;
  isNewUser: boolean;
}

export class AuthService {
  async verifyPrivyToken(privyToken: string): Promise<VerifyTokenResponse> {
    try {
      // Verify the Privy token
      const claims = await privyClient.verifyAuthToken(privyToken);
      
      if (!claims.userId) {
        throw new UnauthorizedError('Invalid Privy token');
      }

      // Get user details from Privy
      const privyUser = await privyClient.getUser({idToken: privyToken});
      
      if (!privyUser) {
        throw new UnauthorizedError('User not found in Privy');
      }

      // Extract wallet address (primary wallet)
      const wallet = privyUser.wallet;
      if (!wallet?.address) {
        throw new UnauthorizedError('No wallet address found');
      }

      const walletAddress = wallet.address;
      const email = privyUser.email?.address;

      // Check if user exists in our database
      const { data: existingUser, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .eq('privy_id', claims.userId)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        logger.error('Database error fetching user', { error: fetchError });
        throw new InternalServerError('Database error');
      }

      let userId: string;
      let isNewUser = false;

      if (!existingUser) {
        // Create new user
        isNewUser = true;
        
        const { data: newUser, error: createError } = await supabase
          .from('users')
          .insert({
            privy_id: claims.userId,
            wallet_address: walletAddress,
            email: email || null,
            username: email?.split('@')[0] || null,
          })
          .select()
          .single();

        if (createError || !newUser) {
          logger.error('Failed to create user', { error: createError });
          throw new InternalServerError('Failed to create user');
        }

        userId = newUser.id;

        // Create Stream Chat user
        await upsertStreamUser(userId, {
          name: newUser.username || email || userId,
          image: newUser.avatar_url || undefined,
        });

        // Generate and store Stream token
        const streamToken = generateStreamToken(userId);
        
        await supabase
          .from('users')
          .update({ stream_token: streamToken })
          .eq('id', userId);

        logger.info('New user created', { userId, privyId: claims.userId });
      } else {
        userId = existingUser.id;

        // Update user info if changed
        const updates: any = {};
        if (email && email !== existingUser.email) {
          updates.email = email;
        }
        if (walletAddress !== existingUser.wallet_address) {
          updates.wallet_address = walletAddress;
        }

        if (Object.keys(updates).length > 0) {
          await supabase
            .from('users')
            .update(updates)
            .eq('id', userId);
        }

        // Ensure Stream user exists
        await upsertStreamUser(userId, {
          name: existingUser.username || email || userId,
          image: existingUser.avatar_url || undefined,
        });

        logger.info('Existing user logged in', { userId });
      }

      return {
        userId,
        privyId: claims.userId,
        walletAddress,
        email,
        isNewUser,
      };
    } catch (error) {
      if (error instanceof UnauthorizedError) {
        throw error;
      }
      logger.error('Error verifying Privy token', { error });
      throw new UnauthorizedError('Invalid authentication token');
    }
  }

  async login(privyToken: string): Promise<{
    token: string;
    user: any;
    streamToken: string;
    isNewUser: boolean;
  }> {
    const { userId, privyId, walletAddress, email, isNewUser } = 
      await this.verifyPrivyToken(privyToken);

    // Generate our JWT
    const jwtPayload: JwtPayload = {
      userId,
      privyId,
      walletAddress,
      email,
    };

    const token = generateToken(jwtPayload);

    // Get full user data
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error || !user) {
      throw new InternalServerError('Failed to fetch user data');
    }

    // Get or generate Stream token
    let streamToken = user.stream_token;
    if (!streamToken) {
      streamToken = generateStreamToken(userId);
      await supabase
        .from('users')
        .update({ stream_token: streamToken })
        .eq('id', userId);
    }

    return {
      token,
      user: {
        id: user.id,
        privyId: user.privy_id,
        walletAddress: user.wallet_address,
        username: user.username,
        email: user.email,
        avatarUrl: user.avatar_url,
        autoSettle: user.auto_settle,
        vaultAddress: user.vault_address,
      },
      streamToken,
      isNewUser,
    };
  }

  async refreshToken(oldToken: string): Promise<{ token: string }> {
    try {
      const { verifyToken } = await import('../utils/jwt');
      const payload = verifyToken(oldToken);

      // Verify user still exists
      const { data: user, error } = await supabase
        .from('users')
        .select('id, privy_id, wallet_address, email')
        .eq('id', payload.userId)
        .single();

      if (error || !user) {
        throw new UnauthorizedError('User not found');
      }

      // Generate new token
      const newToken = generateToken({
        userId: user.id,
        privyId: user.privy_id,
        walletAddress: user.wallet_address,
        email: user.email || undefined,
      });

      return { token: newToken };
    } catch (error) {
      logger.error('Error refreshing token', { error });
      throw new UnauthorizedError('Invalid token');
    }
  }

  async getCurrentUser(userId: string): Promise<any> {
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error || !user) {
      throw new UnauthorizedError('User not found');
    }

    return {
      id: user.id,
      privyId: user.privy_id,
      walletAddress: user.wallet_address,
      username: user.username,
      email: user.email,
      phone: user.phone,
      avatarUrl: user.avatar_url,
      autoSettle: user.auto_settle,
      vaultAddress: user.vault_address,
      createdAt: user.created_at,
    };
  }
}

export const authService = new AuthService();