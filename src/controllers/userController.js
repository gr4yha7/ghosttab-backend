const userService = require('../services/userService');
const logger = require('../utils/logger');

class UserController {
  async getAllUsers(req, res, next) {
    try {
      const users = await userService.getAllUsers();
      res.json({ success: true, data: users });
    } catch (error) {
      next(error);
    }
  }

  async getUserById(req, res, next) {
    try {
      const wallet = req.params['wallet'];
      const user = await userService.getUserById(wallet);
      
      if (!user) {
        return res.status(404).json({ 
          success: false, 
          error: 'User not found' 
        });
      }
      
      res.json({ success: true, data: user });
    } catch (error) {
      next(error);
    }
  }

  async updateUser(req, res, next) {
    try {
      const { username, country, avatar_url } = req.body;
      const user = await userService.updateUser(req.user_id, username, country, avatar_url);
      if (user.custom_metadata) {
        res.json({ 
          success: true, 
          data: user.custom_metadata,
          message: 'User updated successfully'
        });
      }

    } catch (error) {
      next(error);
    }
  }
}

module.exports = new UserController();