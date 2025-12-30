import { Response, NextFunction } from 'express';
import { AuthenticatedRequest, sendSuccess, sendCreated } from '@ghosttab/common';
import { streamService } from '../services/stream.service';

export class ChatController {
  async getToken(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new Error('User not authenticated');
      }

      const token = streamService.generateUserToken(req.user.id);
      
      return sendSuccess(res, { token });
    } catch (error) {
      next(error);
    }
  }

  async getChannelByTabId(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new Error('User not authenticated');
      }

      const { tabId } = req.params;
      const channel = await streamService.getChannelByTabId(req.user.id, tabId);
      
      return sendSuccess(res, { channel });
    } catch (error) {
      next(error);
    }
  }

  async getMessages(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new Error('User not authenticated');
      }

      const { channelId } = req.params;
      const { limit, offset } = req.query;

      const result = await streamService.getChannelMessages(req.user.id, channelId, {
        limit: limit ? parseInt(limit as string, 10) : undefined,
        offset: offset ? parseInt(offset as string, 10) : undefined,
      });
      
      return sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  async sendMessage(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new Error('User not authenticated');
      }

      const { channelId } = req.params;
      const { text, attachments } = req.body;

      const message = await streamService.sendMessage(req.user.id, channelId, {
        text,
        attachments,
      });
      
      return sendCreated(res, { message });
    } catch (error) {
      next(error);
    }
  }

  async markRead(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new Error('User not authenticated');
      }

      const { channelId } = req.params;
      await streamService.markRead(req.user.id, channelId);
      
      return sendSuccess(res, { message: 'Messages marked as read' });
    } catch (error) {
      next(error);
    }
  }

  async getUnreadCount(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new Error('User not authenticated');
      }

      const count = await streamService.getUnreadCount(req.user.id);
      
      return sendSuccess(res, { unreadCount: count });
    } catch (error) {
      next(error);
    }
  }

  async searchMessages(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new Error('User not authenticated');
      }

      const { channelId } = req.params;
      const { q } = req.query;

      const messages = await streamService.searchMessages(
        req.user.id,
        channelId,
        q as string
      );
      
      return sendSuccess(res, { messages, total: messages.length });
    } catch (error) {
      next(error);
    }
  }

  async deleteMessage(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new Error('User not authenticated');
      }

      const { channelId, messageId } = req.params;
      await streamService.deleteMessage(req.user.id, channelId, messageId);
      
      return sendSuccess(res, { message: 'Message deleted' });
    } catch (error) {
      next(error);
    }
  }

  async updateMessage(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new Error('User not authenticated');
      }

      const { messageId } = req.params;
      const { text } = req.body;

      const message = await streamService.updateMessage(req.user.id, messageId, text);
      
      return sendSuccess(res, { message });
    } catch (error) {
      next(error);
    }
  }

  async getUserChannels(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new Error('User not authenticated');
      }

      const channels = await streamService.getUserChannels(req.user.id);
      
      return sendSuccess(res, { channels, total: channels.length });
    } catch (error) {
      next(error);
    }
  }

  async addReaction(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new Error('User not authenticated');
      }

      const { channelId, messageId } = req.params;
      const { reactionType } = req.body;

      await streamService.addReaction(req.user.id, channelId, messageId, reactionType);
      
      return sendSuccess(res, { message: 'Reaction added' });
    } catch (error) {
      next(error);
    }
  }

  async removeReaction(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new Error('User not authenticated');
      }

      const { channelId, messageId } = req.params;
      const { reactionType } = req.body;

      await streamService.removeReaction(req.user.id, channelId, messageId, reactionType);
      
      return sendSuccess(res, { message: 'Reaction removed' });
    } catch (error) {
      next(error);
    }
  }

  async healthCheck(req: AuthenticatedRequest, res: Response) {
    return sendSuccess(res, {
      status: 'healthy',
      service: 'chat-service',
      timestamp: new Date().toISOString(),
    });
  }
}

export const chatController = new ChatController();