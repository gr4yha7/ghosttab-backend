import { Router } from 'express';
import { adminController } from '../controllers/admin.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * @route   POST /admin/chains
 * @desc    Add a new chain
 * @access  Private (Admin only)
 */
router.post('/chains', adminController.addChain);

/**
 * @route   PATCH /admin/chains/:chainId
 * @desc    Update an existing chain
 * @access  Private (Admin only)
 */
router.patch('/chains/:chainId', adminController.updateChain);

/**
 * @route   POST /admin/chains/:chainId/currencies
 * @desc    Add a supported currency to a chain
 * @access  Private (Admin only)
 */
router.post('/chains/:chainId/currencies', adminController.addSupportedCurrency);

export default router;
