import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthenticatedRequest, UnauthorizedError } from '@ghosttab/common';
import { config } from '../config';

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

    const payload = jwt.verify(token, config.jwt.secret) as any;

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