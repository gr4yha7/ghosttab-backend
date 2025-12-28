const friendService = require('../services/friendService');

class FriendController {
  async getUserFriends(req, res, next) {
    try {
      const id = req.user_id;
      const users = await friendService.getUserFriends(id);
      res.json({ success: true, data: users });
    } catch (error) {
      next(error);
    }
  }

  async getPendingRequests(req, res, next) {
    try {
      const id = req.user_id;
    //   const aptos_wallet = linked_accounts.find((wallet) => wallet.chain_type === "aptos")
      const requests = await friendService.getPendingRequests(id);
      
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
        const caller_id = req.user_id;
        const { request_id } = req.body;
        await friendService.cancelRequestOrRemoveFriend(caller_id, request_id);

        res.json({ 
          success: true, 
          message: 'Friend request updated successfully'
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
        const id = req.user_id;
        const { request_id } = req.body;
        await friendService.acceptRequest(id, request_id);
        
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
    const id = req.user_id;
    const { to_user_id } = req.body;
    try {
    await friendService.sendFriendRequest(id, to_user_id);
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

}

module.exports = new FriendController();