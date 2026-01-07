import { Server as HTTPServer } from 'http';
import WebSocket, { WebSocketServer } from 'ws';
import { logger, getRedisClient, getNotificationChannel, subscribeToChannel, verifyPrivyIdToken } from '@ghosttab/common';
import { config } from '../config';
import type { RedisClientType } from 'redis';

interface AuthenticatedWebSocket extends WebSocket {
  userId?: string;
  isAlive?: boolean;
}

export class NotificationWebSocketServer {
  private wss: WebSocketServer;
  private clients: Map<string, Set<AuthenticatedWebSocket>> = new Map();
  private subscriptions: Map<string, RedisClientType> = new Map();

  constructor(server: HTTPServer) {
    this.wss = new WebSocketServer({ 
      server,
      path: '/notifications',
    });

    this.setupServer();
    this.startHeartbeat();
  }

  private setupServer() {
    this.wss.on('connection', async (ws: AuthenticatedWebSocket, request) => {
      try {
        // Extract token from query params or headers
        const url = new URL(request.url!, `http://${request.headers.host}`);
        const token = url.searchParams.get('token') || 
                     request.headers.authorization?.replace('Bearer ', '');

        if (!token) {
          ws.close(1008, 'Authentication required');
          return;
        }

        // Verify JWT
        const payload = await verifyPrivyIdToken(token)
        const userId = payload.userId;

        if (!userId) {
          ws.close(1008, 'Invalid token');
          return;
        }

        ws.userId = userId;
        ws.isAlive = true;

        // Add to clients map
        if (!this.clients.has(userId)) {
          this.clients.set(userId, new Set());
        }
        this.clients.get(userId)!.add(ws);

        logger.info('WebSocket client connected', { userId, totalClients: this.wss.clients.size });

        // Subscribe to user's notification channel
        await this.subscribeToUserNotifications(userId);

        // Send initial connection success message
        this.sendToClient(ws, {
          type: 'connected',
          message: 'Connected to notification service',
          userId,
        });

        // Handle incoming messages
        ws.on('message', (data) => {
          this.handleMessage(ws, data);
        });

        // Handle pong responses
        ws.on('pong', () => {
          ws.isAlive = true;
        });

        // Handle disconnection
        ws.on('close', () => {
          this.handleDisconnection(ws);
        });

        ws.on('error', (error) => {
          logger.error('WebSocket error', { userId, error });
        });

      } catch (error) {
        logger.error('WebSocket authentication failed', { error });
        ws.close(1008, 'Authentication failed');
      }
    });

    logger.info('WebSocket server initialized');
  }

  private async subscribeToUserNotifications(userId: string) {
    // Avoid duplicate subscriptions
    if (this.subscriptions.has(userId)) {
      return;
    }

    try {
      const channel = getNotificationChannel(userId);

      // Subscribe to Redis channel with callback
      const subscriber = await subscribeToChannel(channel, (message) => {
        try {
          const notification = JSON.parse(message);
          this.broadcastToUser(userId, {
            type: 'notification',
            data: notification,
          });
        } catch (error) {
          logger.error('Failed to parse notification', { userId, error });
        }
      });

      // Store subscription
      this.subscriptions.set(userId, subscriber);

      logger.info('Subscribed to user notifications', { userId, channel });
    } catch (error) {
      logger.error('Failed to subscribe to notifications', { userId, error });
    }
  }

  private async unsubscribeFromUserNotifications(userId: string) {
    const subscriber = this.subscriptions.get(userId);
    if (subscriber) {
      try {
        const channel = getNotificationChannel(userId);
        await subscriber.unsubscribe(channel);
        await subscriber.quit();
        this.subscriptions.delete(userId);
        logger.info('Unsubscribed from user notifications', { userId });
      } catch (error) {
        logger.error('Failed to unsubscribe', { userId, error });
      }
    }
  }

  private handleMessage(ws: AuthenticatedWebSocket, data: WebSocket.Data) {
    try {
      const message = JSON.parse(data.toString());

      switch (message.type) {
        case 'ping':
          this.sendToClient(ws, { type: 'pong' });
          break;
        
        case 'subscribe':
          // Client can request specific subscriptions if needed
          break;

        default:
          logger.warn('Unknown message type', { type: message.type, userId: ws.userId });
      }
    } catch (error) {
      logger.error('Failed to handle message', { userId: ws.userId, error });
    }
  }

  private handleDisconnection(ws: AuthenticatedWebSocket) {
    const userId = ws.userId;
    
    if (!userId) {
      return;
    }

    // Remove from clients map
    const userClients = this.clients.get(userId);
    if (userClients) {
      userClients.delete(ws);
      
      // If no more clients for this user, unsubscribe
      if (userClients.size === 0) {
        this.clients.delete(userId);
        this.unsubscribeFromUserNotifications(userId);
      }
    }

    logger.info('WebSocket client disconnected', { 
      userId, 
      remainingConnections: userClients?.size || 0,
      totalClients: this.wss.clients.size 
    });
  }

  private sendToClient(ws: AuthenticatedWebSocket, data: any) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(data));
    }
  }

  private broadcastToUser(userId: string, data: any) {
    const userClients = this.clients.get(userId);
    
    if (!userClients || userClients.size === 0) {
      return;
    }

    const message = JSON.stringify(data);
    let sentCount = 0;

    userClients.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(message);
        sentCount++;
      }
    });

    logger.debug('Broadcast to user', { userId, clients: sentCount });
  }

  private startHeartbeat() {
    setInterval(() => {
      this.wss.clients.forEach((ws: WebSocket) => {
        const client = ws as AuthenticatedWebSocket;
        
        if (client.isAlive === false) {
          logger.info('Terminating inactive client', { userId: client.userId });
          return client.terminate();
        }

        client.isAlive = false;
        client.ping();
      });
    }, config.websocket.pingInterval);
  }

  public getStats() {
    return {
      totalConnections: this.wss.clients.size,
      uniqueUsers: this.clients.size,
      subscriptions: this.subscriptions.size,
    };
  }

  public async close() {
    logger.info('Closing WebSocket server');

    // Unsubscribe from all channels
    for (const [userId] of this.subscriptions) {
      await this.unsubscribeFromUserNotifications(userId);
    }

    // Close all connections
    this.wss.clients.forEach((ws) => {
      ws.close(1001, 'Server shutting down');
    });

    this.wss.close();
  }
}