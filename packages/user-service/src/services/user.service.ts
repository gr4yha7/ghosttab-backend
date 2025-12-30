import {
  supabase,
  logger,
  NotFoundError,
  ConflictError,
  ValidationError,
  publishNotification,
  FriendshipStatus,
} from '@ghosttab/common';
import { otpService } from './otp.service';
import { emailService } from './email.service';

export class UserService {
  async getUserProfile(userId: string): Promise<any> {
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error || !user) {
      throw new NotFoundError('User');
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

  async updateProfile(
    userId: string,
    updates: {
      username?: string;
      email?: string;
      phone?: string;
      avatarUrl?: string;
    }
  ): Promise<any> {
    const { data, error } = await supabase
      .from('users')
      .update({
        ...(updates.username && { username: updates.username }),
        ...(updates.email && { email: updates.email }),
        ...(updates.phone && { phone: updates.phone }),
        ...(updates.avatarUrl && { avatar_url: updates.avatarUrl }),
      })
      .eq('id', userId)
      .select()
      .single();

    if (error || !data) {
      throw new Error('Failed to update profile');
    }

    return this.getUserProfile(userId);
  }

  async updateAutoSettle(
    userId: string,
    autoSettle: boolean,
    vaultAddress?: string
  ): Promise<void> {
    const updates: any = { auto_settle: autoSettle };
    if (vaultAddress) {
      updates.vault_address = vaultAddress;
    }

    const { error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', userId);

    if (error) {
      throw new Error('Failed to update auto-settle settings');
    }

    logger.info('Auto-settle updated', { userId, autoSettle, vaultAddress });
  }

  async searchUsers(query: string, currentUserId: string): Promise<any[]> {
    const { data: users, error } = await supabase
      .from('users')
      .select('id, username, email, wallet_address, avatar_url')
      .or(`username.ilike.%${query}%,email.ilike.%${query}%`)
      .neq('id', currentUserId)
      .limit(20);

    if (error) {
      logger.error('User search error', { error });
      return [];
    }

    return (users || []).map((user) => ({
      id: user.id,
      username: user.username,
      email: user.email,
      walletAddress: user.wallet_address,
      avatarUrl: user.avatar_url,
    }));
  }

  async getFriends(userId: string, status?: FriendshipStatus): Promise<any[]> {
    let query = supabase
      .from('friendships')
      .select(`
        id,
        status,
        created_at,
        friend:friend_id (
          id,
          username,
          email,
          wallet_address,
          avatar_url
        )
      `)
      .eq('user_id', userId);

    if (status) {
      query = query.eq('status', status);
    } else {
      query = query.eq('status', 'ACCEPTED');
    }

    const { data: friendships, error } = await query;

    if (error) {
      logger.error('Error fetching friends', { userId, error });
      return [];
    }

    return (friendships || []).map((f: any) => ({
      friendshipId: f.id,
      status: f.status,
      createdAt: f.created_at,
      friend: {
        id: f.friend.id,
        username: f.friend.username,
        email: f.friend.email,
        walletAddress: f.friend.wallet_address,
        avatarUrl: f.friend.avatar_url,
      },
    }));
  }

  async sendFriendRequest(
    fromUserId: string,
    toIdentifier: string
  ): Promise<{ requiresOTP: boolean; friendRequestId?: string }> {
    // Check if identifier is email or user ID
    const isEmail = toIdentifier.includes('@');

    let toUserId: string | null = null;

    if (isEmail) {
      // Search by email
      const { data: user } = await supabase
        .from('users')
        .select('id, email, username')
        .eq('email', toIdentifier)
        .single();

      if (!user) {
        // Send OTP invite
        const { data: fromUser } = await supabase
          .from('users')
          .select('username, email')
          .eq('id', fromUserId)
          .single();

        await otpService.createAndSendOTP(toIdentifier, 'FRIEND_REQUEST', {
          fromUserId,
          fromUsername: fromUser?.username || fromUser?.email,
        });

        // Also send a regular notification email
        await emailService.sendFriendRequestNotification(
          toIdentifier,
          fromUser?.username || fromUser?.email || 'Someone'
        );

        return { requiresOTP: true };
      }

      toUserId = user.id;
    } else {
      toUserId = toIdentifier;
    }

    // Check if friendship already exists
    const { data: existing } = await supabase
      .from('friendships')
      .select('*')
      .or(`and(user_id.eq.${fromUserId},friend_id.eq.${toUserId}),and(user_id.eq.${toUserId},friend_id.eq.${fromUserId})`)
      .single();

    if (existing) {
      throw new ConflictError('Friend request already exists');
    }

    // Create friendship request
    const { data: friendship, error } = await supabase
      .from('friendships')
      .insert({
        user_id: fromUserId,
        friend_id: toUserId,
        status: 'PENDING',
      })
      .select()
      .single();

    if (error || !friendship) {
      throw new Error('Failed to send friend request');
    }

    // Get sender info
    const { data: fromUser } = await supabase
      .from('users')
      .select('username, email')
      .eq('id', fromUserId)
      .single();

    // Send notification via Redis
    await publishNotification(toUserId, {
      type: 'FRIEND_REQUEST',
      title: 'New Friend Request',
      body: `${fromUser?.username || fromUser?.email} sent you a friend request`,
      data: {
        friendshipId: friendship.id,
        fromUserId,
        fromUsername: fromUser?.username,
      },
      userId: toUserId,
    });

    // Store in notifications table
    await supabase.from('notifications').insert({
      user_id: toUserId,
      type: 'FRIEND_REQUEST',
      title: 'New Friend Request',
      body: `${fromUser?.username || fromUser?.email} sent you a friend request`,
      data: {
        friendshipId: friendship.id,
        fromUserId,
      },
    });

    logger.info('Friend request sent', { fromUserId, toUserId });

    return {
      requiresOTP: false,
      friendRequestId: friendship.id,
    };
  }

  async acceptFriendRequest(
    userId: string,
    friendshipId: string,
    otpCode?: string
  ): Promise<void> {
    // Get friendship
    const { data: friendship, error: fetchError } = await supabase
      .from('friendships')
      .select('*')
      .eq('id', friendshipId)
      .eq('friend_id', userId)
      .eq('status', 'PENDING')
      .single();

    if (fetchError || !friendship) {
      throw new NotFoundError('Friend request');
    }

    // If OTP provided, verify it
    if (otpCode) {
      const { data: user } = await supabase
        .from('users')
        .select('email')
        .eq('id', userId)
        .single();

      if (!user?.email) {
        throw new ValidationError('Email required for OTP verification');
      }

      const verification = await otpService.verifyOTP(
        user.email,
        otpCode,
        'FRIEND_ACCEPT'
      );

      if (!verification.valid) {
        throw new ValidationError('Invalid or expired OTP code');
      }
    }

    // Update friendship status
    const { error: updateError } = await supabase
      .from('friendships')
      .update({ status: 'ACCEPTED' })
      .eq('id', friendshipId);

    if (updateError) {
      throw new Error('Failed to accept friend request');
    }

    // Create reciprocal friendship
    await supabase.from('friendships').insert({
      user_id: userId,
      friend_id: friendship.user_id,
      status: 'ACCEPTED',
    });

    // Get acceptor info
    const { data: acceptor } = await supabase
      .from('users')
      .select('username, email')
      .eq('id', userId)
      .single();

    // Notify the requester
    await publishNotification(friendship.user_id, {
      type: 'FRIEND_ACCEPTED',
      title: 'Friend Request Accepted',
      body: `${acceptor?.username || acceptor?.email} accepted your friend request`,
      data: {
        friendshipId: friendship.id,
        friendId: userId,
      },
      userId: friendship.user_id,
    });

    await supabase.from('notifications').insert({
      user_id: friendship.user_id,
      type: 'FRIEND_ACCEPTED',
      title: 'Friend Request Accepted',
      body: `${acceptor?.username || acceptor?.email} accepted your friend request`,
      data: {
        friendshipId: friendship.id,
        friendId: userId,
      },
    });

    logger.info('Friend request accepted', { userId, friendshipId });
  }

  async declineFriendRequest(userId: string, friendshipId: string): Promise<void> {
    const { error } = await supabase
      .from('friendships')
      .delete()
      .eq('id', friendshipId)
      .eq('friend_id', userId)
      .eq('status', 'PENDING');

    if (error) {
      throw new Error('Failed to decline friend request');
    }

    logger.info('Friend request declined', { userId, friendshipId });
  }

  async removeFriend(userId: string, friendId: string): Promise<void> {
    // Delete both friendship records
    await supabase
      .from('friendships')
      .delete()
      .or(`and(user_id.eq.${userId},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${userId})`);

    logger.info('Friend removed', { userId, friendId });
  }

  async getPendingRequests(userId: string): Promise<any[]> {
    const { data: friendships, error } = await supabase
      .from('friendships')
      .select(`
        id,
        created_at,
        user:user_id (
          id,
          username,
          email,
          wallet_address,
          avatar_url
        )
      `)
      .eq('friend_id', userId)
      .eq('status', 'PENDING');

    if (error) {
      logger.error('Error fetching pending requests', { userId, error });
      return [];
    }

    return (friendships || []).map((f: any) => ({
      friendshipId: f.id,
      createdAt: f.created_at,
      from: {
        id: f.user.id,
        username: f.user.username,
        email: f.user.email,
        walletAddress: f.user.wallet_address,
        avatarUrl: f.user.avatar_url,
      },
    }));
  }
}

export const userService = new UserService();