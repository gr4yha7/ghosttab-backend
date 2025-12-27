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
      const { id } = req.params;
      const user = await userService.getUserById(id);
      
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

  async createUser(req, res, next) {
    try {
      const { username, email, wallet_address, avatar_url } = req.body;
      const user = await userService.createUser(username, email, wallet_address, avatar_url);
      
      res.status(201).json({ 
        success: true, 
        data: user,
        message: 'User created successfully'
      });
    } catch (error) {
      // Handle unique constraint violations
      if (error.code === '23505') {
        // Check which field caused the violation
        if (error.message && error.message.includes('username')) {
          return res.status(400).json({ 
            success: false, 
            error: 'Username already exists' 
          });
        }
        if (error.message && error.message.includes('email')) {
          return res.status(400).json({ 
            success: false, 
            error: 'Email already exists' 
          });
        }
        return res.status(400).json({ 
          success: false, 
          error: 'Duplicate entry - this value already exists' 
        });
      }
      next(error);
    }
  }

  async updateUser(req, res, next) {
    try {
      const { id } = req.params;
      const { name, email } = req.body;
      const user = await userService.updateUser(id, name, email);
      
      if (!user) {
        return res.status(404).json({ 
          success: false, 
          error: 'User not found' 
        });
      }
      
      res.json({ 
        success: true, 
        data: user,
        message: 'User updated successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteUser(req, res, next) {
    try {
      const { id } = req.params;
      const deleted = await userService.deleteUser(id);
      
      if (!deleted) {
        return res.status(404).json({ 
          success: false, 
          error: 'User not found' 
        });
      }
      
      res.json({ 
        success: true, 
        message: 'User deleted successfully' 
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new UserController();