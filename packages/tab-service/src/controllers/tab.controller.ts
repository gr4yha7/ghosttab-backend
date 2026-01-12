import { Response, NextFunction } from 'express';
import { AuthenticatedRequest, sendSuccess, sendCreated, sendNoContent } from '@ghosttab/common';
import { tabService } from '../services/tab.service';
import { blockchainService } from '../services/blockchain.service';

export class TabController {
  async generateHash(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { sender, amount } = req.body;
      const result = await blockchainService.generateHash(sender, amount);
      return sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  async submitTransaction(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { rawTxnHex, publicKey, signature } = req.body;
      const result = await blockchainService.sponsorTransaction(rawTxnHex, publicKey, signature);
      // const result = await blockchainService.submitSignedTx(rawTxnHex, publicKey, signature);
      return sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  async getUSDCBalance(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { address } = req.params;
      const balance = await blockchainService.getUSDCBalance(address);
      return sendSuccess(res, { balance });
    } catch (error) {
      next(error);
    }
  }

  async createTab(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new Error('User not authenticated');
      }

      const tab = await tabService.createTab(req.user.id, req.body);
      return sendCreated(res, { tab });
    } catch (error) {
      next(error);
    }
  }

  async createGroupTab(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new Error('User not authenticated');
      }

      const { groupId } = req.params;
      const tab = await tabService.createGroupTab(req.user.id, groupId, req.body);
      return sendCreated(res, { tab });
    } catch (error) {
      next(error);
    }
  }

  async getTab(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new Error('User not authenticated');
      }

      const { tabId } = req.params;
      const tab = await tabService.getTabById(req.user.id, tabId);

      return sendSuccess(res, { tab });
    } catch (error) {
      next(error);
    }
  }

  async getUserTabs(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new Error('User not authenticated');
      }

      const { status, page, limit } = req.query;
      const result = await tabService.getUserTabs(req.user.id, {
        status: status as any,
        page: page ? parseInt(page as string, 10) : undefined,
        limit: limit ? parseInt(limit as string, 10) : undefined,
      });

      return sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  async updateTab(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new Error('User not authenticated');
      }

      const { tabId } = req.params;
      const tab = await tabService.updateTab(req.user.id, tabId, req.body);

      return sendSuccess(res, { tab });
    } catch (error) {
      next(error);
    }
  }

  async settlePayment(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new Error('User not authenticated');
      }

      const { tabId } = req.params;
      await tabService.settlePayment(req.user.id, tabId, req.body);

      return sendSuccess(res, { message: 'Payment settled successfully' });
    } catch (error) {
      next(error);
    }
  }

  async cancelTab(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new Error('User not authenticated');
      }

      const { tabId } = req.params;
      await tabService.cancelTab(req.user.id, tabId);

      return sendSuccess(res, { message: 'Tab cancelled successfully' });
    } catch (error) {
      next(error);
    }
  }

  async verifyParticipation(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new Error('User not authenticated');
      }

      const { tabId } = req.params;
      const { otpCode, accept } = req.body;

      await tabService.verifyTabParticipation(req.user.id, tabId, otpCode, accept);

      return sendSuccess(res, {
        message: accept ? 'Tab participation accepted' : 'Tab participation declined',
      });
    } catch (error) {
      next(error);
    }
  }

  async resendOTP(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new Error('User not authenticated');
      }

      const { tabId } = req.params;
      await tabService.resendOTP(req.user.id, tabId);

      return sendSuccess(res, { message: 'OTP resent successfully' });
    } catch (error) {
      next(error);
    }
  }

  async healthCheck(req: AuthenticatedRequest, res: Response) {
    return sendSuccess(res, {
      status: 'healthy',
      service: 'tab-service',
      timestamp: new Date().toISOString(),
    });
  }
}

export const tabController = new TabController();