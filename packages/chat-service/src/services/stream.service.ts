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
  generateUserToken(userId: string): string {
    try {
      const client = getStreamClient();
      const token = client.createToken(userId);
      
      logger.info('Generated Stream token', { userId });
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
      const client = getStreamClient();
      
      await client.upsertUser({
        id: userId,
        name: userData.name || userId,
        image: userData.image,
        role: userData.role || 'user',
      });
      
      logger.info('Upserted Stream user', { userId });
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
      const client = getStreamClient();
      const channel = client.channel('messaging', channelId);

      // Verify user is a member
      const { members } = await channel.query();
      const isMember = members?.some((m) => m.user_id === userId);

      if (!isMember) {
        throw new ForbiddenError('You are not a member of this channel');
      }

      const response = await channel.query({
        messages: { limit, offset },
      });

      return {
        messages: response.messages,
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
      const client = getStreamClient();
      const channel = client.channel('messaging', channelId);

      // Verify user is a member
      const { members } = await channel.query();
      const isMember = members?.some((m) => m.user_id === userId);

      if (!isMember) {
        throw new ForbiddenError('You are not a member of this channel');
      }

      const response = await channel.sendMessage({
        text: message.text,
        user_id: userId,
        attachments: message.attachments,
      });

      logger.info('Message sent', { channelId, userId });

      return response.message;
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
      const client = getStreamClient();
      const channel = client.channel('messaging', channelId);

      await channel.markRead({ user_id: userId });

      logger.info('Messages marked as read', { channelId, userId });
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
      const client = getStreamClient();
      
      const response = await client.getUnreadCount(userId);
      
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
      const client = getStreamClient();
      
      const response = await client.search(
        {
          type: 'messaging',
          id: channelId,
          members: { $in: [userId] },
        },
        query,
        { limit: 20 }
      );

      return response.results.map((result) => result.message);
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
      const client = getStreamClient();

      const response = await client.updateMessage(
        {
          id: messageId,
          text,
          user_id: userId,
        },
        userId
      );

      logger.info('Message updated', { messageId, userId });

      return response.message;
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
      const client = getStreamClient();

      const filter = {
        type: 'messaging',
        members: { $in: [userId] },
      };

      const sort = [{ last_message_at: -1 as const }];

      const channels = await client.queryChannels(filter, sort, {
        watch: false,
        state: true,
      });

      return channels.map((channel) => ({
        channelId: channel.id,
        channelType: channel.type,
        name: channel.data?.name,
        tabId: channel.data?.tab_id,
        memberCount: Object.keys(channel.state.members).length,
        lastMessageAt: channel.data?.last_message_at,
        unreadCount: channel.countUnread(),
      }));
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
      const client = getStreamClient();
      const channel = client.channel('messaging', channelId);

      await channel.sendReaction(messageId, {
        type: reactionType,
        user_id: userId,
      });

      logger.info('Reaction added', { messageId, reactionType, userId });
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
      const client = getStreamClient();
      const channel = client.channel('messaging', channelId);

      await channel.deleteReaction(messageId, reactionType, userId);

      logger.info('Reaction removed', { messageId, reactionType, userId });
    } catch (error) {
      logger.error('Failed to remove reaction', { messageId, error });
      throw new Error('Failed to remove reaction');
    }
  }
}

export const streamService = new StreamService();