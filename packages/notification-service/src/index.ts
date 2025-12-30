import { createServer } from 'http';
import { logger } from '@ghosttab/common';
import { createApp } from './app';
import { config } from './config';
import { NotificationWebSocketServer } from './websocket/server';

let wsServer: NotificationWebSocketServer;

const startServer = async () => {
  try {
    const app = createApp();
    const server = createServer(app);

    // Initialize WebSocket server
    wsServer = new NotificationWebSocketServer(server);

    server.listen(config.port, () => {
      logger.info(`Notification Service started`, {
        port: config.port,
        env: config.nodeEnv,
        websocket: true,
      });
    });

    // Graceful shutdown
    const gracefulShutdown = async () => {
      logger.info('Received shutdown signal, closing server...');
      
      // Close WebSocket server
      if (wsServer) {
        await wsServer.close();
      }

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