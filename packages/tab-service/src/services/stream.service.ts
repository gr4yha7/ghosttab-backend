import { StreamChat, Channel } from 'stream-chat';
import { logger } from '@ghosttab/common';
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
  async createTabChannel(
    tabId: string,
    tabTitle: string,
    creatorStreamId: string,
    participantStreamIds: string[]
  ): Promise<string> {
    try {
      const client = getStreamClient();

      const channelId = `tab_${tabId}`;
      const channel = client.channel('messaging', channelId, {
        name: tabTitle,
        created_by_id: creatorStreamId,
        members: [creatorStreamId, ...participantStreamIds],
        tab_id: tabId,
      });

      await channel.create();

      logger.info('Stream channel created', { tabId, channelId, members: participantStreamIds.length + 1 });

      return channelId;
    } catch (error) {
      logger.error('Failed to create Stream channel', { tabId, error });
      throw new Error('Failed to create chat channel');
    }
  }

  async addMembersToChannel(channelId: string, userIds: string[]): Promise<void> {
    try {
      const client = getStreamClient();
      const channel = client.channel('messaging', channelId);

      await channel.addMembers(userIds);

      logger.info('Members added to channel', { channelId, userIds });
    } catch (error) {
      logger.error('Failed to add members to channel', { channelId, error });
      throw new Error('Failed to add members to chat');
    }
  }

  async removeMembersFromChannel(channelId: string, userIds: string[]): Promise<void> {
    try {
      const client = getStreamClient();
      const channel = client.channel('messaging', channelId);

      await channel.removeMembers(userIds);

      logger.info('Members removed from channel', { channelId, userIds });
    } catch (error) {
      logger.error('Failed to remove members from channel', { channelId, error });
      throw new Error('Failed to remove members from chat');
    }
  }

  async sendSystemMessage(
    channelId: string,
    message: string,
    data?: any
  ): Promise<void> {
    try {
      const client = getStreamClient();
      const channel = client.channel('messaging', channelId);

      await channel.sendMessage({
        text: message,
        user_id: 'system',
        attachments: data ? [{ type: 'system', data }] : undefined,
      });

      logger.info('System message sent', { channelId });
    } catch (error) {
      logger.error('Failed to send system message', { channelId, error });
      // Don't throw - system messages are not critical
    }
  }

  async deleteChannel(channelId: string): Promise<void> {
    try {
      const client = getStreamClient();
      const channel = client.channel('messaging', channelId);

      await channel.delete();

      logger.info('Channel deleted', { channelId });
    } catch (error) {
      logger.error('Failed to delete channel', { channelId, error });
      // Don't throw - deletion is not critical
    }
  }

  async getChannel(channelId: string): Promise<Channel | null> {
    try {
      const client = getStreamClient();
      const channel = client.channel('messaging', channelId);
      await channel.watch();

      return channel;
    } catch (error) {
      logger.error('Failed to get channel', { channelId, error });
      return null;
    }
  }
}

export const streamService = new StreamService();