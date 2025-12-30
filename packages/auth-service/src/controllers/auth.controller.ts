import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest, sendSuccess, sendCreated } from '@ghosttab/common';
import { authService } from '../services/auth.service';

export class AuthController {
  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { privyToken } = req.body;

      const result = await authService.login(privyToken);

      if (result.isNewUser) {
        return sendCreated(res, result);
      }

      return sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  async refresh(req: Request, res: Response, next: NextFunction) {
    try {
      const { token } = req.body;

      const result = await authService.refreshToken(token);

      return sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  async me(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new Error('User not authenticated');
      }

      const user = await authService.getCurrentUser(req.user.id);

      return sendSuccess(res, { user });
    } catch (error) {
      next(error);
    }
  }

  async healthCheck(req: Request, res: Response) {
    return sendSuccess(res, {
      status: 'healthy',
      service: 'auth-service',
      timestamp: new Date().toISOString(),
    });
  }
}

export const authController = new AuthController();