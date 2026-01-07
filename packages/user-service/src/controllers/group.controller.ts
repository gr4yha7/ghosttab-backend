import { Response, NextFunction } from 'express';
import { AuthenticatedRequest, sendSuccess, sendCreated, sendNoContent } from '@ghosttab/common';
import { groupService } from '../services/group.service';

export class GroupController {
  async createGroup(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new Error('User not authenticated');
      }

      const group = await groupService.createGroup(req.user.id, req.body);
      return sendCreated(res, { group });
    } catch (error) {
      next(error);
    }
  }

  async getGroup(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new Error('User not authenticated');
      }

      const { groupId } = req.params;
      const group = await groupService.getGroupById(req.user.id, groupId);
      
      return sendSuccess(res, { group });
    } catch (error) {
      next(error);
    }
  }

  async getUserGroups(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new Error('User not authenticated');
      }

      const { search, page, limit } = req.query;
      const result = await groupService.getUserGroups(req.user.id, {
        search: search ? search as string : undefined,
        page: page ? parseInt(page as string, 10) : undefined,
        limit: limit ? parseInt(limit as string, 10) : undefined,
      });
      
      return sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  async updateGroup(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new Error('User not authenticated');
      }

      const { groupId } = req.params;
      const group = await groupService.updateGroup(req.user.id, groupId, req.body);
      
      return sendSuccess(res, { group });
    } catch (error) {
      next(error);
    }
  }

  async addMembers(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new Error('User not authenticated');
      }

      const { groupId } = req.params;
      await groupService.addMembers(req.user.id, groupId, req.body);
      
      return sendSuccess(res, { message: 'Members added' });
    } catch (error) {
      next(error);
    }
  }

  async removeMember(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new Error('User not authenticated');
      }

      const { groupId, memberId } = req.params;
      await groupService.removeMember(req.user.id, groupId, memberId);
      
      return sendSuccess(res, { message: 'Member removed' });
    } catch (error) {
      next(error);
    }
  }

  async makeAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new Error('User not authenticated');
      }

      const { groupId, memberId } = req.params;
      await groupService.makeAdmin(req.user.id, groupId, memberId);
      
      return sendSuccess(res, { message: 'Member promoted to admin' });
    } catch (error) {
      next(error);
    }
  }

  async removeAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new Error('User not authenticated');
      }

      const { groupId, adminId } = req.params;
      await groupService.removeAdmin(req.user.id, groupId, adminId);
      
      return sendSuccess(res, { message: 'Admin demoted to member' });
    } catch (error) {
      next(error);
    }
  }

  async getGroupTabs(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new Error('User not authenticated');
      }

      const result = await groupService.getGroupTabs(req.user.id, req.params.groupId, {
        status: req.query.status as any,
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 20,
      });
      
      return sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  async leaveGroup(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new Error('User not authenticated');
      }

      const { groupId } = req.params;
      await groupService.leaveGroup(req.user.id, groupId);
      
      return sendSuccess(res, { message: 'Left group' });
    } catch (error) {
      next(error);
    }
  }

  async deleteGroup(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new Error('User not authenticated');
      }

      const { groupId } = req.params;
      await groupService.deleteGroup(req.user.id, groupId);
      
      return sendSuccess(res, { message: 'Group deleted' });
    } catch (error) {
      next(error);
    }
  }

  async healthCheck(req: AuthenticatedRequest, res: Response) {
    return sendSuccess(res, {
      status: 'healthy',
      service: 'group-service',
      timestamp: new Date().toISOString(),
    });
  }
}

export const groupController = new GroupController();