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
  createGroupTabSchema,
  generateHashSchema,
  submitTransactionSchema,
  getWalletBalanceSchema,
  verifyTabParticipationSchema,
} from '../validators/tab.validators';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * @route   GET /tabs/balance/:address
 * @desc    Get user's USDC balance
 * @access  Private
 */
router.get('/balance/:address', validate(getWalletBalanceSchema), tabController.getUSDCBalance);

/**
 * @route   POST /tabs/generate-hash
 * @desc    Generate transaction hash for signing
 * @access  Private
 */
router.post('/generate-hash', validate(generateHashSchema), tabController.generateHash);

/**
 * @route   POST /tabs/submit-transaction
 * @desc    Submit signed transaction
 * @access  Private
 */
router.post('/submit-transaction', validate(submitTransactionSchema), tabController.submitTransaction);

/**
 * @route   POST /tabs
 * @desc    Create a new tab
 * @access  Private
 */
router.post('/', validate(createTabSchema), tabController.createTab);

/**
 * @route   POST /tabs/group/:groupId
 * @desc    Create a new group tab
 * @access  Private
 */
router.post('/group/:groupId', validate(createGroupTabSchema), tabController.createGroupTab);

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
 * @route   POST /tabs/:tabId/verify-participation
 * @desc    Verify OTP for tab participation
 * @access  Private
 */
router.post('/:tabId/verify-participation', validate(verifyTabParticipationSchema), tabController.verifyParticipation);

/**
* @route   POST /tabs/:tabId/resend-otp
* @desc    Resend OTP for tab participation
* @access  Private
*/
router.post('/:tabId/resend-otp', validate(tabIdParamSchema), tabController.resendOTP);

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