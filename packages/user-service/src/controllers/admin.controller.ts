import { Request, Response, NextFunction } from 'express';
import { adminService } from '../services/admin.service';
import { logger } from '@ghosttab/common';

export class AdminController {
  async addChain(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.id;
      const chain = await adminService.addChain(userId, req.body);
      res.status(201).json(chain);
    } catch (error) {
      next(error);
    }
  }

  async updateChain(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.id;
      const { chainId } = req.params;
      const chain = await adminService.updateChain(userId, chainId, req.body);
      res.json(chain);
    } catch (error) {
      next(error);
    }
  }

  async addSupportedCurrency(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.id;
      const { chainId } = req.params;
      const chainSet = await adminService.addSupportedCurrency(userId, chainId, req.body);
      res.json(chainSet);
    } catch (error) {
      next(error);
    }
  }
}

export const adminController = new AdminController();
