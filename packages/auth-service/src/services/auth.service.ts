import { supabase, logger, UnauthorizedError, InternalServerError, privyClient } from '@ghosttab/common';
import { generateStreamToken, upsertStreamUser } from './stream.service';

interface VerifyTokenResponse {
  userId: string;
  privyId: string;
  walletAddress: string;
  email?: string;
  isNewUser: boolean;
}

export class AuthService {
  async verifyPrivyIdTokenAndGetUser(privyIdToken: string): Promise<VerifyTokenResponse> {
    try {
      // Get user details from Privy
      const privyUser = await privyClient.getUser({idToken: privyIdToken});
      
      if (!privyUser) {
        throw new UnauthorizedError('User not found in Privy');
      }

      // Extract wallet address (primary wallet)
      const wallet = privyUser.wallet;
      if (!wallet?.address) {
        throw new UnauthorizedError('No wallet address found');
      }

      const walletAddress = wallet.address;
      const privyUserId = privyUser.id
      const email = privyUser.email?.address;

      // Check if user exists in our database
      const { data: existingUser, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .eq('privy_id', privyUserId)
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
            id: privyUserId,
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

        logger.info('New user created', { userId, privyId: privyUserId });
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
        privyId: privyUserId,
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
    // token: string;
    user: any;
    streamToken: string;
    isNewUser: boolean;
  }> {
    const { userId, isNewUser } = 
      await this.verifyPrivyIdTokenAndGetUser(privyToken);

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
      // token,
      user: {
        id: user.id,
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