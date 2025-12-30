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

export const generateStreamToken = (userId: string): string => {
  try {
    const client = getStreamClient();
    const token = client.createToken(userId);
    
    logger.info('Generated Stream token', { userId });
    return token;
  } catch (error) {
    logger.error('Failed to generate Stream token', { userId, error });
    throw new Error('Failed to generate chat token');
  }
};

export const upsertStreamUser = async (
  userId: string,
  userData: {
    name?: string;
    image?: string;
  }
): Promise<void> => {
  try {
    const client = getStreamClient();
    
    await client.upsertUser({
      id: userId,
      name: userData.name || userId,
      image: userData.image,
    });
    
    logger.info('Upserted Stream user', { userId });
  } catch (error) {
    logger.error('Failed to upsert Stream user', { userId, error });
    throw new Error('Failed to create chat user');
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