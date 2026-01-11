import { Response, NextFunction } from 'express';
import { AuthenticatedRequest, logger, UnauthorizedError, verifyPrivyIdToken } from '@ghosttab/common';

export const authenticate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('No token provided');
    }

    const token = authHeader.substring(7);

    const payload = await verifyPrivyIdToken(token)
    // Attach user info to request
    req.user = {
      id: payload.userId,
      ...payload,
    };

    next();
  } catch (error) {
    logger.error('Authentication failed', { error })
    next(new UnauthorizedError('Invalid or expired token'));
  }
};