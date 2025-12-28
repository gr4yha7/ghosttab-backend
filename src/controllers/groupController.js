const groupService = require('../services/groupService');
const logger = require('../utils/logger');

class GroupController {
  async getUserGroups(req, res, next) {
    try {
      const user_id = req.user_id;
      const groups = await groupService.getUserGroups(user_id);
      res.json({ success: true, data: groups });
    } catch (error) {
      next(error);
    }
  }

  async removeGroupMember(req, res, next) {
    try {
      const caller_id = req.user_id;
      const { group_id, member_id } = req.body;

      if (!group_id || !member_id) {
        return res.status(400).json({
          success: false,
          error: 'group_id and member_id are required'
        });
      }

      await groupService.removeGroupMember(caller_id, group_id, member_id);

      res.json({
        success: true,
        message: 'Group member removed successfully'
      });
    } catch (error) {
      if (error.message === 'Unauthorized: Only group creator or admins can remove members') {
        return res.status(403).json({
          success: false,
          error: error.message
        });
      }
      if (error.message === 'Cannot remove group creator') {
        return res.status(400).json({
          success: false,
          error: error.message
        });
      }
      next(error);
    }
  }

  async addGroupMember(req, res, next) {
    try {
      const caller_id = req.user_id;
      const { group_id, member_id } = req.body;

      if (!group_id || !member_id) {
        return res.status(400).json({
          success: false,
          error: 'group_id and member_id are required'
        });
      }

      const member = await groupService.addGroupMember(caller_id, group_id, member_id);

      res.json({
        success: true,
        data: member,
        message: 'Group member added successfully'
      });
    } catch (error) {
      if (error.message === 'Unauthorized: Only group creator or admins can add members') {
        return res.status(403).json({
          success: false,
          error: error.message
        });
      }
      if (error.message === 'User is already a member of this group') {
        return res.status(400).json({
          success: false,
          error: error.message
        });
      }
      if (error.message === 'Invalid user ID') {
        return res.status(400).json({
          success: false,
          error: error.message
        });
      }
      next(error);
    }
  }

  async addOrRemoveGroupAdmin(req, res, next) {
    try {
      const caller_id = req.user_id;
      const { group_id, member_id, is_admin } = req.body;

      if (!group_id || !member_id || typeof is_admin !== 'boolean') {
        return res.status(400).json({
          success: false,
          error: 'group_id, member_id, and is_admin (boolean) are required'
        });
      }

      const updatedMember = await groupService.addOrRemoveGroupAdmin(
        caller_id,
        group_id,
        member_id,
        is_admin
      );

      res.json({
        success: true,
        data: updatedMember,
        message: `Group admin status ${is_admin ? 'added' : 'removed'} successfully`
      });
    } catch (error) {
      if (error.message === 'Unauthorized: Only group creator can add/remove admins') {
        return res.status(403).json({
          success: false,
          error: error.message
        });
      }
      if (error.message === 'Cannot change admin status of group creator') {
        return res.status(400).json({
          success: false,
          error: error.message
        });
      }
      if (error.message === 'User is not a member of this group') {
        return res.status(400).json({
          success: false,
          error: error.message
        });
      }
      next(error);
    }
  }

  async createGroup(req, res, next) {
    try {
      const caller_id = req.user_id;
      const { name, description } = req.body;

      if (!name || !name.trim()) {
        return res.status(400).json({
          success: false,
          error: 'Group name is required'
        });
      }

      const group = await groupService.createGroup(caller_id, name, description);

      res.status(201).json({
        success: true,
        data: group,
        message: 'Group created successfully'
      });
    } catch (error) {
      if (error.message === 'Group name is required') {
        return res.status(400).json({
          success: false,
          error: error.message
        });
      }
      next(error);
    }
  }
}

module.exports = new GroupController();
