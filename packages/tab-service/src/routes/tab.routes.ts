import { Router } from 'express';
import { validate } from '@ghosttab/common';
import { tabController } from '../controllers/tab.controller';
import { authenticate } from '../middleware/auth.middleware';
import {
  createTabSchema,
  updateTabSchema,
  settlePaymentSchema,
  tabIdParamSchema,
  getUserTabsSchema,
} from '../validators/tab.validators';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * @route   POST /tabs
 * @desc    Create a new tab
 * @access  Private
 */
router.post('/', validate(createTabSchema), tabController.createTab);

/**
 * @route   GET /tabs
 * @desc    Get user's tabs
 * @access  Private
 */
router.get('/', validate(getUserTabsSchema), tabController.getUserTabs);

/**
 * @route   GET /tabs/:tabId
 * @desc    Get tab details
 * @access  Private
 */
router.get('/:tabId', validate(tabIdParamSchema), tabController.getTab);

/**
 * @route   PATCH /tabs/:tabId
 * @desc    Update tab details
 * @access  Private (Creator only)
 */
router.patch('/:tabId', validate(updateTabSchema), tabController.updateTab);

/**
 * @route   POST /tabs/:tabId/settle
 * @desc    Settle payment for tab
 * @access  Private
 */
router.post('/:tabId/settle', validate(settlePaymentSchema), tabController.settlePayment);

/**
 * @route   DELETE /tabs/:tabId
 * @desc    Cancel tab
 * @access  Private (Creator only)
 */
router.delete('/:tabId', validate(tabIdParamSchema), tabController.cancelTab);

/**
 * @route   GET /tabs/health
 * @desc    Health check
 * @access  Public
 */
router.get('/health', tabController.healthCheck);

export default router;