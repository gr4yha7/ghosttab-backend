// group.routes.ts
import { Router } from 'express';
import { validate } from '@ghosttab/common';
import { groupController } from '../controllers/group.controller';
import { authenticate } from '../middleware/auth.middleware';
import {
  createGroupSchema,
  updateGroupSchema,
  getGroupTabsSchema,
  getUserGroupsSchema,
  addMembersSchema,
  groupIdParamSchema,
  groupIdParamMemberIdParamSchema,
} from '../validators/group.validators';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * @route   POST /
 * @desc    Create group
 * @access  Private
 */
router.post('/', validate(createGroupSchema), groupController.createGroup);

/**
 * @route   GET /
 * @desc    Get user's groups
 * @access  Private
 */
router.get('/', validate(getUserGroupsSchema), groupController.getUserGroups);

/**
 * @route   GET /:groupId
 * @desc    Get group by ID
 * @access  Private
 */
router.get('/:groupId', validate(groupIdParamSchema), groupController.getGroup);

/**
 * @route   PATCH /:groupId
 * @desc    Update group
 * @access  Private
 */
router.patch('/:groupId', validate(updateGroupSchema), groupController.updateGroup);

/**
 * @route   POST /:groupId/members
 * @desc    Add members
 * @access  Private
 */
router.post('/:groupId/members', validate(addMembersSchema), groupController.addMembers);

/**
 * @route   DELETE /:groupId/members/:memberId
 * @desc    Remove member
 * @access  Private
 */
router.delete('/:groupId/members/:memberId', validate(groupIdParamMemberIdParamSchema), groupController.removeMember);

/**
 * @route   POST /:groupId/admins/:memberId
 * @desc    Make admin
 * @access  Private
 */
router.post('/:groupId/admins/:memberId', validate(groupIdParamMemberIdParamSchema), groupController.makeAdmin);

/**
 * @route   DELETE /:groupId/admins/:adminId
 * @desc    Remove admin
 * @access  Private
 */
router.delete('/:groupId/admins/:adminId', validate(groupIdParamMemberIdParamSchema), groupController.removeAdmin);


/**
 * @route   GET /:groupId/tabs
 * @desc    Get group tabs
 * @access  Private
 */
router.get('/:groupId/tabs', validate(getGroupTabsSchema), groupController.getGroupTabs);

/**
 * @route   POST /:groupId/leave
 * @desc    Leave group
 * @access  Private
 */
router.post('/:groupId/leave', validate(groupIdParamSchema), groupController.leaveGroup);

// Delete group
/**
 * @route   DELETE /:groupId
 * @desc    Delete group
 * @access  Private
 */
router.delete('/:groupId', validate(groupIdParamSchema), groupController.deleteGroup);

export default router;