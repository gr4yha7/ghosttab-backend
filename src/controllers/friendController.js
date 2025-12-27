const friendService = require('../services/friendService');
const userService = require('../services/userService');
const logger = require('../utils/logger');

class FriendController {
  async getUserFriends(req, res, next) {
    try {
      const { linked_accounts } = req.user;
      const email = linked_accounts.find((wallet) => wallet.type === "email")
      const aptos_wallet = linked_accounts.find((wallet) => wallet.chain_type === "aptos")
      const users = await friendService.getUserFriends(aptos_wallet.address);
      res.json({ success: true, data: users });
    } catch (error) {
      next(error);
    }
  }

  async getPendingRequests(req, res, next) {
    try {
        const { linked_accounts } = req.user;
      const aptos_wallet = linked_accounts.find((wallet) => wallet.chain_type === "aptos")
        console.log(aptos_wallet);
        
      const requests = await friendService.getPendingRequests(aptos_wallet.address);
      
      if (!requests) {
        return res.status(404).json({ 
          success: false, 
          error: 'No pending requests not found' 
        });
      }
      
      res.json({ success: true, data: requests });
    } catch (error) {
      next(error);
    }
  }

  async cancelRequest(req, res, next) {
    try {
      const verifiedSigner = req.verifiedSigner;
      const { signature, message } = req.body;
      const cancelled = await friendService.cancelRequest(verifiedSigner, signature, message);
      
      if (!cancelled) {
        return res.status(404).json({ 
          success: false, 
          error: 'Request not found' 
        });
      }
      
      res.json({ 
        success: true, 
        message: 'Friend request cancelled successfully'
      });
    } catch (error) {
      if (error.message === 'Mismatch Payload') {
        return res.status(400).json({ 
          success: false, 
          error: 'Mismatch Payload' 
        });
      }
      next(error);
    }
  }

  async acceptRequest(req, res, next) {
    try {
        const verifiedSigner = req.verifiedSigner;
        const { signature, message } = req.body;
        const accept = await friendService.acceptRequest(verifiedSigner, signature, message);
        
        if (!accept) {
          return res.status(404).json({ 
            success: false, 
            error: 'Request not found' 
          });
        }
        
        res.json({ 
          success: true, 
          message: 'Friend request accepted successfully'
        });
      } catch (error) {
        if (error.message === 'Mismatch Payload') {
          return res.status(400).json({ 
            success: false, 
            error: 'Mismatch Payload' 
          });
        }
        next(error);
      }
  }

  async sendRequest(req, res, next) {
    const verifiedSigner = req.verifiedSigner;
      const { signature, message } = req.body;
      const request = await friendService.sendFriendRequest(verifiedSigner, message, signature);
      
      if (!request) {
        return res.status(404).json({ 
          success: false, 
          error: 'User not found' 
        });
      }
      
      res.json({ 
        success: true, 
        message: 'Friend request sent successfully'
      });
    } catch (error) {
      if (error.message === 'Mismatch Payload') {
        return res.status(400).json({ 
          success: false, 
          error: 'Mismatch Payload' 
        });
      }
      next(error);
    }

}

module.exports = new FriendController();