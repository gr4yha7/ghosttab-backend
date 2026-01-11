import { StreamChat } from 'stream-chat';
import { config } from '../config';
import { logger } from '@ghosttab/common';

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

export const generateStreamToken = (streamId: string): string => {
  try {
    const client = getStreamClient();
    const token = client.createToken(streamId);

    logger.info('Generated Stream token', { streamId });
    return token;
  } catch (error) {
    logger.error('Failed to generate Stream token', { streamId, error: error instanceof Error ? error.message : error });
    throw new Error(`Failed to generate chat token: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

export const upsertStreamUser = async (
  streamId: string,
  userData: {
    name?: string;
    image?: string;
  }
): Promise<void> => {
  try {
    const client = getStreamClient();

    await client.upsertUser({
      id: streamId,
      name: userData.name || streamId,
      image: userData.image,
    });

    logger.info('Upserted Stream user', { streamId });
  } catch (error) {
    logger.error('Failed to upsert Stream user', { streamId, error: error instanceof Error ? error.message : error });
    throw new Error(`Failed to create chat user: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

export const deleteStreamUser = async (userId: string): Promise<void> => {
  try {
    const client = getStreamClient();
    await client.deleteUser(userId, { mark_messages_deleted: true });

    logger.info('Deleted Stream user', { userId });
  } catch (error) {
    logger.error('Failed to delete Stream user', { userId, error });
    // Don't throw - deletion is not critical
  }
};