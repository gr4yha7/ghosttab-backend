import { StreamChat, Channel } from 'stream-chat';
import { supabase, logger, NotFoundError, ForbiddenError } from '@ghosttab/common';
import { config } from '../config';

let streamClient: StreamChat | null = null;

export const getStreamClient = (): StreamChat => {
  if (!streamClient) {
    streamClient = StreamChat.getInstance(
      config.stream.apiKey,
      config.stream.apiSecret
    );
  }
  return streamClient;
};

export class StreamService {
  /**
   * Generate GetStream token for a user
   */
  async generateUserToken(userId: string): Promise<string> {
    try {
      const streamId = await this.resolveWalletAddress(userId);
      const client = getStreamClient();
      const token = client.createToken(streamId);

      logger.info('Generated Stream token', { userId, streamId });
      return token;
    } catch (error) {
      logger.error('Failed to generate Stream token', { userId, error });
      throw new Error('Failed to generate chat token');
    }
  }

  /**
   * Create or update a Stream user
   */
  async upsertUser(
    userId: string,
    userData: {
      name?: string;
      image?: string;
      role?: string;
    }
  ): Promise<void> {
    try {
      const streamId = await this.resolveWalletAddress(userId);
      const client = getStreamClient();

      await client.upsertUser({
        id: streamId,
        name: userData.name || streamId,
        image: userData.image,
        role: userData.role || 'user',
      });

      logger.info('Upserted Stream user', { userId, streamId });
    } catch (error) {
      logger.error('Failed to upsert Stream user', { userId, error });
      throw new Error('Failed to create/update chat user');
    }
  }

  /**
   * Get channel details by tab ID
   */
  async getChannelByTabId(userId: string, tabId: string): Promise<any> {
    // Verify user is a participant in the tab
    const { data: participant, error: participantError } = await supabase
      .from('tab_participants')
      .select('tab_id')
      .eq('tab_id', tabId)
      .eq('user_id', userId)
      .single();

    if (participantError || !participant) {
      throw new ForbiddenError('You are not a participant in this tab');
    }

    // Get tab with channel ID
    const { data: tab, error: tabError } = await supabase
      .from('tabs')
      .select('stream_channel_id, title')
      .eq('id', tabId)
      .single();

    if (tabError || !tab) {
      throw new NotFoundError('Tab');
    }

    if (!tab.stream_channel_id) {
      throw new NotFoundError('Chat channel');
    }

    try {
      const client = getStreamClient();
      const channel = client.channel('messaging', tab.stream_channel_id);
      await channel.watch();

      return {
        channelId: tab.stream_channel_id,
        channelType: 'messaging',
        tabId,
        tabTitle: tab.title,
        members: channel.state.members,
        memberCount: Object.keys(channel.state.members).length,
      };
    } catch (error) {
      logger.error('Failed to get channel', { tabId, error });
      throw new Error('Failed to get chat channel');
    }
  }

  /**
   * Get channel messages
   */
  async getChannelMessages(
    userId: string,
    channelId: string,
    options: {
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<any> {
    const { limit = 50, offset = 0 } = options;

    try {
      const streamId = await this.resolveWalletAddress(userId);
      const client = getStreamClient();
      const channel = client.channel('messaging', channelId);

      // Verify user is a member
      const { members } = await channel.query();
      const isMember = members?.some((m) => m.user_id === streamId);

      if (!isMember) {
        throw new ForbiddenError('You are not a member of this channel');
      }

      const response = await channel.query({
        messages: { limit, offset },
      });

      return {
        messages: response.messages.map((msg: any) => this.mapMessage(msg)),
        hasMore: response.messages.length === limit,
      };
    } catch (error) {
      if (error instanceof ForbiddenError) {
        throw error;
      }
      logger.error('Failed to get channel messages', { channelId, error });
      throw new Error('Failed to get channel messages');
    }
  }

  /**
   * Send a message to a channel
   */
  async sendMessage(
    userId: string,
    channelId: string,
    message: {
      text: string;
      attachments?: any[];
    }
  ): Promise<any> {
    try {
      const streamId = await this.resolveWalletAddress(userId);
      const client = getStreamClient();
      const channel = client.channel('messaging', channelId);

      // Verify user is a member
      const { members } = await channel.query();
      const isMember = members?.some((m) => m.user_id === streamId);

      if (!isMember) {
        throw new ForbiddenError('You are not a member of this channel');
      }

      const response = await channel.sendMessage({
        text: message.text,
        user_id: streamId,
        attachments: message.attachments,
      });

      logger.info('Message sent', { channelId, userId, streamId });

      return this.mapMessage(response.message);
    } catch (error) {
      if (error instanceof ForbiddenError) {
        throw error;
      }
      logger.error('Failed to send message', { channelId, userId, error });
      throw new Error('Failed to send message');
    }
  }

  /**
   * Mark messages as read
   */
  async markRead(userId: string, channelId: string): Promise<void> {
    try {
      const streamId = await this.resolveWalletAddress(userId);
      const client = getStreamClient();
      const channel = client.channel('messaging', channelId);

      await channel.markRead({ user_id: streamId });

      logger.info('Messages marked as read', { channelId, userId, streamId });
    } catch (error) {
      logger.error('Failed to mark messages as read', { channelId, userId, error });
      // Don't throw - this is not critical
    }
  }

  /**
   * Get user's unread message count
   */
  async getUnreadCount(userId: string): Promise<number> {
    try {
      const streamId = await this.resolveWalletAddress(userId);
      const client = getStreamClient();

      const response = await client.getUnreadCount(streamId);

      return response.total_unread_count || 0;
    } catch (error) {
      logger.error('Failed to get unread count', { userId, error });
      return 0;
    }
  }

  /**
   * Search messages in a channel
   */
  async searchMessages(
    userId: string,
    channelId: string,
    query: string
  ): Promise<any[]> {
    try {
      const streamId = await this.resolveWalletAddress(userId);
      const client = getStreamClient();

      const response = await client.search(
        {
          type: 'messaging',
          id: channelId,
          members: { $in: [streamId] },
        },
        query,
        { limit: 20 }
      );

      return response.results.map((result) => this.mapMessage(result.message));
    } catch (error) {
      logger.error('Failed to search messages', { channelId, query, error });
      return [];
    }
  }

  /**
   * Delete a message (creator or sender only)
   */
  async deleteMessage(
    userId: string,
    channelId: string,
    messageId: string
  ): Promise<void> {
    try {
      const client = getStreamClient();
      const channel = client.channel('messaging', channelId);

      // GetStream will handle permissions automatically
      await channel.getClient().deleteMessage(messageId, true);
      // await channel.deleteMessage(messageId, true);

      logger.info('Message deleted', { channelId, messageId, userId });
    } catch (error) {
      logger.error('Failed to delete message', { channelId, messageId, error });
      throw new Error('Failed to delete message');
    }
  }

  /**
   * Update a message (sender only)
   */
  async updateMessage(
    userId: string,
    messageId: string,
    text: string
  ): Promise<any> {
    try {
      const streamId = await this.resolveWalletAddress(userId);
      const client = getStreamClient();

      const response = await client.updateMessage(
        {
          id: messageId,
          text,
          user_id: streamId,
        },
        streamId
      );

      logger.info('Message updated', { messageId, userId, streamId });

      return this.mapMessage(response.message);
    } catch (error) {
      logger.error('Failed to update message', { messageId, error });
      throw new Error('Failed to update message');
    }
  }

  /**
   * Get user's channels
   */
  async getUserChannels(userId: string): Promise<any[]> {
    try {
      const streamId = await this.resolveWalletAddress(userId);
      const client = getStreamClient();

      const filter = {
        type: 'messaging',
        members: { $in: [streamId] },
      };

      const sort = [{ last_message_at: -1 as const }];

      const channels = await client.queryChannels(filter, sort, {
        watch: false,
        state: true,
      });

      return channels.map((channel) => {
        const lastMessage = channel.state.messages.length > 0
          ? this.mapMessage(channel.state.messages[channel.state.messages.length - 1])
          : null;

        return {
          channelId: channel.id,
          channelType: channel.type,
          name: channel.data?.name,
          tabId: channel.data?.tab_id,
          memberCount: Object.keys(channel.state.members).length,
          lastMessageAt: channel.state.last_message_at,
          unreadCount: channel.countUnread(),
          lastMessage,
        };
      });
    } catch (error) {
      logger.error('Failed to get user channels', { userId, error });
      return [];
    }
  }

  /**
   * Add reaction to a message
   */
  async addReaction(
    userId: string,
    channelId: string,
    messageId: string,
    reactionType: string
  ): Promise<void> {
    try {
      const streamId = await this.resolveWalletAddress(userId);
      const client = getStreamClient();
      const channel = client.channel('messaging', channelId);

      await channel.sendReaction(messageId, {
        type: reactionType,
        user_id: streamId,
      });

      logger.info('Reaction added', { messageId, reactionType, userId, streamId });
    } catch (error) {
      logger.error('Failed to add reaction', { messageId, error });
      throw new Error('Failed to add reaction');
    }
  }

  /**
   * Remove reaction from a message
   */
  async removeReaction(
    userId: string,
    channelId: string,
    messageId: string,
    reactionType: string
  ): Promise<void> {
    try {
      const streamId = await this.resolveWalletAddress(userId);
      const client = getStreamClient();
      const channel = client.channel('messaging', channelId);

      await channel.deleteReaction(messageId, reactionType, streamId);

      logger.info('Reaction removed', { messageId, reactionType, userId, streamId });
    } catch (error) {
      logger.error('Failed to remove reaction', { messageId, error });
      throw new Error('Failed to remove reaction');
    }
  }

  private mapMessage(msg: any): any {
    if (!msg) return null;
    return {
      id: msg.id,
      text: msg.text,
      userId: msg.user?.id,
      user: {
        id: msg.user?.id,
        username: msg.user?.name,
        avatarUrl: msg.user?.image,
        walletAddress: msg.user?.id,
      },
      createdAt: msg.created_at,
      updatedAt: msg.updated_at,
      attachments: msg.attachments,
    };
  }

  private async resolveWalletAddress(userId: string): Promise<string> {
    const { data: user, error } = await supabase
      .from('users')
      .select('wallet_address')
      .eq('id', userId)
      .single();

    if (error || !user) {
      logger.error('Failed to resolve wallet address', { userId, error });
      throw new Error('User profile incomplete for chat');
    }

    return user.wallet_address;
  }
}

export const streamService = new StreamService();