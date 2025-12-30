import { Response, NextFunction } from 'express';
import { AuthenticatedRequest, UnauthorizedError } from '@ghosttab/common';
import { verifyToken } from '../utils/jwt';

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

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    const payload = verifyToken(token);

    // Attach user info to request
    req.user = {
      id: payload.userId,
      privyId: payload.privyId,
      walletAddress: payload.walletAddress,
      email: payload.email,
    };

    next();
  } catch (error) {
    next(new UnauthorizedError('Invalid or expired token'));
  }
};