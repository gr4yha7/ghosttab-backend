import { Router } from 'express';
import { validate } from '@ghosttab/common';
import { authController } from '../controllers/auth.controller';
import { loginSchema, refreshTokenSchema } from '../validators/auth.validators';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

/**
 * @route   POST /auth/login
 * @desc    Login with Privy token
 * @access  Public
 */
router.post('/login', validate(loginSchema), authController.login);

/**
 * @route   POST /auth/refresh
 * @desc    Refresh JWT token
 * @access  Public
 */
// router.post('/refresh', validate(refreshTokenSchema), authController.refresh);

/**
 * @route   GET /auth/me
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/me', authenticate, authController.me);

/**
 * @route   GET /auth/health
 * @desc    Health check
 * @access  Public
 */
router.get('/health', authController.healthCheck);

export default router;