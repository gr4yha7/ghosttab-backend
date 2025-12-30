import { logger } from '@ghosttab/common';
import { createApp } from './app';
import { config } from './config';

const startServer = async () => {
  try {
    const app = createApp();

    const server = app.listen(config.port, () => {
      logger.info(`User Service started`, {
        port: config.port,
        env: config.nodeEnv,
      });
    });

    // Graceful shutdown
    const gracefulShutdown = () => {
      logger.info('Received shutdown signal, closing server...');
      server.close(() => {
        logger.info('Server closed');
        process.exit(0);
      });

      // Force shutdown after 10 seconds
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGINT', gracefulShutdown);
  } catch (error) {
    logger.error('Failed to start server', { error });
    process.exit(1);
  }
};

startServer();