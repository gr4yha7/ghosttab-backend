import { Router } from 'express';
import { validate } from '@ghosttab/common';
import { chatController } from '../controllers/chat.controller';
import { authenticate } from '../middleware/auth.middleware';
import {
  tabIdParamSchema,
  channelIdParamSchema,
  getMessagesSchema,
  sendMessageSchema,
  messageIdParamSchema,
  updateMessageSchema,
  searchMessagesSchema,
  reactionSchema,
} from '../validators/chat.validators';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * @route   GET /chat/token
 * @desc    Get GetStream token for user
 * @access  Private
 */
router.get('/token', chatController.getToken);

/**
 * @route   GET /chat/channels
 * @desc    Get user's channels
 * @access  Private
 */
router.get('/channels', chatController.getUserChannels);

/**
 * @route   GET /chat/unread
 * @desc    Get unread message count
 * @access  Private
 */
router.get('/unread', chatController.getUnreadCount);

/**
 * @route   GET /chat/tabs/:tabId/channel
 * @desc    Get channel by tab ID
 * @access  Private
 */
router.get('/tabs/:tabId/channel', validate(tabIdParamSchema), chatController.getChannelByTabId);

/**
 * @route   GET /chat/channels/:channelId/messages
 * @desc    Get channel messages
 * @access  Private
 */
router.get(
  '/channels/:channelId/messages',
  validate(getMessagesSchema),
  chatController.getMessages
);

/**
 * @route   POST /chat/channels/:channelId/messages
 * @desc    Send message to channel
 * @access  Private
 */
router.post(
  '/channels/:channelId/messages',
  validate(sendMessageSchema),
  chatController.sendMessage
);

/**
 * @route   POST /chat/channels/:channelId/read
 * @desc    Mark messages as read
 * @access  Private
 */
router.post(
  '/channels/:channelId/read',
  validate(channelIdParamSchema),
  chatController.markRead
);

/**
 * @route   GET /chat/channels/:channelId/search
 * @desc    Search messages in channel
 * @access  Private
 */
router.get(
  '/channels/:channelId/search',
  validate(searchMessagesSchema),
  chatController.searchMessages
);

/**
 * @route   DELETE /chat/channels/:channelId/messages/:messageId
 * @desc    Delete message
 * @access  Private
 */
router.delete(
  '/channels/:channelId/messages/:messageId',
  validate(messageIdParamSchema),
  chatController.deleteMessage
);

/**
 * @route   PATCH /chat/messages/:messageId
 * @desc    Update message
 * @access  Private
 */
router.patch(
  '/messages/:messageId',
  validate(updateMessageSchema),
  chatController.updateMessage
);

/**
 * @route   POST /chat/messages/:messageId/reactions
 * @desc    Add reaction to message
 * @access  Private
 */
router.post(
  '/messages/:messageId/reactions',
  validate(reactionSchema),
  chatController.addReaction
);

/**
 * @route   DELETE /chat/messages/:messageId/reactions
 * @desc    Remove reaction from message
 * @access  Private
 */
router.delete(
  '/messages/:messageId/reactions',
  validate(reactionSchema),
  chatController.removeReaction
);

/**
 * @route   GET /chat/health
 * @desc    Health check
 * @access  Public
 */
router.get('/health', chatController.healthCheck);

export default router;