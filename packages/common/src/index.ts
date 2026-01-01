// Config exports
export { supabase, getSupabaseClient } from './config/supabase';
export { getRedisClient, getNotificationChannel, publishNotification, subscribeToChannel } from './config/redis';
export { logger } from './config/logger';

// Type exports
export type { Database } from './types/database.types';
export type {
  NotificationType,
  FriendshipStatus,
  TabStatus,
  TransactionType,
} from './types/states.types';
export type {
  AuthenticatedRequest,
  ApiResponse,
  PaginationParams,
  NotificationPayload,
  TabCreatedPayload,
  FriendRequestPayload,
  PaymentSettledPayload,
} from './types/api.types';

// Error exports
export {
  AppError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
  ConflictError,
  InternalServerError,
} from './utils/errors';

// Utility exports
export { sendSuccess, sendError, sendCreated, sendNoContent } from './utils/response';

// Validator exports
export {
  emailSchema,
  uuidSchema,
  walletAddressSchema,
  paginationSchema,
  idParamSchema,
  otpCodeSchema,
  decimalAmountSchema,
  txHashSchema,
} from './validators/common.validators';

// Middleware exports
export { errorHandler, notFoundHandler } from './middleware/errorHandler';
export { validate } from './middleware/validate';