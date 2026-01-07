import { Request } from 'express';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    walletAddress: string;
    email?: string;
  };
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
  };
}

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface NotificationPayload {
  type: string;
  title: string;
  body: string;
  data?: any;
  userId: string;
}

export interface TabCreatedPayload {
  tabId: string;
  title: string;
  totalAmount: string;
  creatorId: string;
  participants: Array<{
    userId: string;
    shareAmount: string;
  }>;
}

export interface FriendRequestPayload {
  fromUserId: string;
  toUserId: string;
  message?: string;
}

export interface PaymentSettledPayload {
  tabId: string;
  userId: string;
  amount: string;
  txHash: string;
}