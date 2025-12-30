import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { errorHandler, notFoundHandler } from '@ghosttab/common';
import { config } from './config';
import chatRoutes from './routes/chat.routes';

export const createApp = (): Application => {
  const app = express();

  // Security middleware
  app.use(helmet());
  
  // CORS
  app.use(
    cors({
      origin: config.cors.origins,
      credentials: true,
    })
  );

  // Body parsing
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Rate limiting
  const limiter = rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.maxRequests,
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use(limiter);

  // Routes
  app.use('/chat', chatRoutes);

  // Root health check
  app.get('/', (req: Request, res: Response) => {
    res.json({
      service: 'GhostTab Chat Service',
      status: 'running',
      version: '1.0.0',
    });
  });

  // Error handlers
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};