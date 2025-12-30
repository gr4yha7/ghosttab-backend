import { Response, NextFunction } from 'express';
import { AuthenticatedRequest, sendSuccess, sendCreated } from '@ghosttab/common';
import { userService } from '../services/user.service';

export class UserController {
  async getProfile(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new Error('User not authenticated');
      }

      const profile = await userService.getUserProfile(req.user.id);
      return sendSuccess(res, { profile });
    } catch (error) {
      next(error);
    }
  }

  async updateProfile(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new Error('User not authenticated');
      }

      const profile = await userService.updateProfile(req.user.id, req.body);
      return sendSuccess(res, { profile });
    } catch (error) {
      next(error);
    }
  }

  async updateAutoSettle(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new Error('User not authenticated');
      }

      const { autoSettle, vaultAddress } = req.body;
      await userService.updateAutoSettle(req.user.id, autoSettle, vaultAddress);
      
      return sendSuccess(res, { 
        message: 'Auto-settle settings updated',
        autoSettle,
        vaultAddress 
      });
    } catch (error) {
      next(error);
    }
  }

  async searchUsers(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new Error('User not authenticated');
      }

      const { q } = req.query;
      const users = await userService.searchUsers(q as string, req.user.id);
      
      return sendSuccess(res, { users, total: users.length });
    } catch (error) {
      next(error);
    }
  }

  async getFriends(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new Error('User not authenticated');
      }

      const { status } = req.query;
      const friends = await userService.getFriends(req.user.id, status as string);
      
      return sendSuccess(res, { friends, total: friends.length });
    } catch (error) {
      next(error);
    }
  }

  async getPendingRequests(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new Error('User not authenticated');
      }

      const requests = await userService.getPendingRequests(req.user.id);
      
      return sendSuccess(res, { requests, total: requests.length });
    } catch (error) {
      next(error);
    }
  }

  async sendFriendRequest(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new Error('User not authenticated');
      }

      const { toIdentifier } = req.body;
      const result = await userService.sendFriendRequest(req.user.id, toIdentifier);
      
      if (result.requiresOTP) {
        return sendSuccess(res, {
          message: 'Verification code sent to email',
          requiresOTP: true,
        });
      }

      return sendCreated(res, {
        message: 'Friend request sent',
        friendRequestId: result.friendRequestId,
      });
    } catch (error) {
      next(error);
    }
  }

  async acceptFriendRequest(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new Error('User not authenticated');
      }

      const { friendshipId } = req.params;
      const { otpCode } = req.body;
      
      await userService.acceptFriendRequest(req.user.id, friendshipId, otpCode);
      
      return sendSuccess(res, { message: 'Friend request accepted' });
    } catch (error) {
      next(error);
    }
  }

  async declineFriendRequest(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new Error('User not authenticated');
      }

      const { friendshipId } = req.params;
      await userService.declineFriendRequest(req.user.id, friendshipId);
      
      return sendSuccess(res, { message: 'Friend request declined' });
    } catch (error) {
      next(error);
    }
  }

  async removeFriend(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new Error('User not authenticated');
      }

      const { friendId } = req.params;
      await userService.removeFriend(req.user.id, friendId);
      
      return sendSuccess(res, { message: 'Friend removed' });
    } catch (error) {
      next(error);
    }
  }

  async healthCheck(req: AuthenticatedRequest, res: Response) {
    return sendSuccess(res, {
      status: 'healthy',
      service: 'user-service',
      timestamp: new Date().toISOString(),
    });
  }
}

export const userController = new UserController();