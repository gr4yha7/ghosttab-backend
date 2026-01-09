import { Router } from 'express';
import { validate } from '@ghosttab/common';
import { userController } from '../controllers/user.controller';
import { authenticate } from '../middleware/auth.middleware';
import {
  updateProfileSchema,
  updateAutoSettleSchema,
  searchUsersSchema,
  sendFriendRequestSchema,
  friendshipIdParamSchema,
  friendIdParamSchema,
  getFriendsSchema,
} from '../validators/user.validators';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * @route   GET /users/profile
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/profile', userController.getProfile);

/**
 * @route   PATCH /users/profile
 * @desc    Update user profile
 * @access  Private
 */
router.patch('/profile', validate(updateProfileSchema), userController.updateProfile);

/**
 * @route   PATCH /users/auto-settle
 * @desc    Update auto-settle settings
 * @access  Private
 */
router.patch('/auto-settle', validate(updateAutoSettleSchema), userController.updateAutoSettle);

/**
 * @route   GET /users/search
 * @desc    Search for users by username or email
 * @access  Private
 */
router.get('/search', validate(searchUsersSchema), userController.searchUsers);

/**
 * @route   GET /users/friends
 * @desc    Get user's friends list
 * @access  Private
 */
router.get('/friends', validate(getFriendsSchema), userController.getFriends);

/**
 * @route   GET /users/friends/requests
 * @desc    Get pending friend requests
 * @access  Private
 */
router.get('/friends/requests', userController.getPendingRequests);

/**
 * @route   POST /users/friends/request
 * @desc    Send friend request
 * @access  Private
 */
router.post('/friends/request', validate(sendFriendRequestSchema), userController.sendFriendRequest);

/**
 * @route   POST /users/friends/:friendshipId/accept
 * @desc    Accept friend request
 * @access  Private
 */
router.post(
  '/friends/:friendshipId/accept',
  validate(friendshipIdParamSchema),
  userController.acceptFriendRequest
);

/**
 * @route   DELETE /users/friends/:friendshipId/decline
 * @desc    Decline friend request
 * @access  Private
 */
router.delete(
  '/friends/:friendshipId/decline',
  validate(friendshipIdParamSchema),
  userController.declineFriendRequest
);

/**
 * @route   DELETE /users/friends/:friendId
 * @desc    Remove friend
 * @access  Private
 */
router.delete('/friends/:friendId', validate(friendIdParamSchema), userController.removeFriend);

/**
 * @route   GET /users/health
 * @desc    Health check
 * @access  Public
 */
router.get('/health', userController.healthCheck);

export default router;