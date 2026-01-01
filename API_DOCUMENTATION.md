# GhostTab Backend API Documentation

## Base URLs
- Auth Service: `http://localhost:3001`
- User Service: `http://localhost:3002`
- Tab Service: `http://localhost:3003`
- Notification Service: `http://localhost:3004`
- Chat Service: `http://localhost:3005`

## Authentication
All endpoints except auth/login require a Bearer token in the Authorization header:
```
Authorization: Bearer <jwt_token>
```

---

## Auth Service (Port 3001)

### POST `/auth/login`
Login with Privy token

**Request:**
```json
{
  "privyToken": "string"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "jwt_token",
    "user": {
      "id": "uuid",
      "privyId": "string",
      "walletAddress": "0x...",
      "username": "string",
      "email": "string",
      "avatarUrl": "string",
      "autoSettle": false,
      "vaultAddress": null
    },
    "streamToken": "stream_token",
    "isNewUser": false
  }
}
```

### POST `/auth/refresh`
Refresh JWT token

**Request:**
```json
{
  "token": "old_jwt_token"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "new_jwt_token"
  }
}
```

### GET `/auth/me`
Get current user profile

**Response:**
```json
{
  "success": true,
  "data": {
    "user": { /* user object */ }
  }
}
```

---

## User Service (Port 3002)

### GET `/users/profile`
Get current user profile

### PATCH `/users/profile`
Update user profile

**Request:**
```json
{
  "username": "string",
  "email": "string",
  "avatarUrl": "string",
  "phone": "string"
}
```

### PATCH `/users/auto-settle`
Update auto-settle settings

**Request:**
```json
{
  "autoSettle": true,
  "vaultAddress": "0x..."
}
```

### GET `/users/search?q=query`
Search for users

**Response:**
```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": "uuid",
        "username": "string",
        "email": "string",
        "walletAddress": "0x...",
        "avatarUrl": "string"
      }
    ],
    "total": 10
  }
}
```

### GET `/users/friends?status=ACCEPTED`
Get friends list

**Query Params:**
- `status`: PENDING | ACCEPTED | BLOCKED (optional)
- `page`: number (default: 1)
- `limit`: number (default: 20)

### GET `/users/friends/requests`
Get pending friend requests

### POST `/users/friends/request`
Send friend request

**Request:**
```json
{
  "toIdentifier": "email@example.com or userId"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Friend request sent",
    "friendRequestId": "uuid",
    "requiresOTP": false
  }
}
```

### POST `/users/friends/:friendshipId/accept`
Accept friend request

**Request:**
```json
{
  "otpCode": "123456" // optional if OTP required
}
```

### DELETE `/users/friends/:friendshipId/decline`
Decline friend request

### DELETE `/users/friends/:friendId`
Remove friend

---

## Tab Service (Port 3003)

### POST `/tabs`
Create a new tab

**Request:**
```json
{
  "title": "Dinner",
  "description": "Italian restaurant",
  "icon": "🍝",
  "totalAmount": "90.00",
  "currency": "MOVE",
  "participants": [
    {
      "userId": "uuid",
      "shareAmount": "30.00" // optional - splits equally if not provided
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "tab": {
      "id": "uuid",
      "title": "Dinner",
      "totalAmount": "90.00",
      "currency": "MOVE",
      "status": "OPEN",
      "streamChannelId": "tab_uuid",
      "creator": { /* user object */ },
      "participants": [
        {
          "user": { /* user object */ },
          "shareAmount": "30.00",
          "paid": false
        }
      ],
      "summary": {
        "totalPaid": "0.00",
        "remaining": "90.00",
        "allSettled": false
      }
    }
  }
}
```

### GET `/tabs?status=OPEN`
Get user's tabs

**Query Params:**
- `status`: OPEN | SETTLED | CANCELLED (optional)
- `page`: number (default: 1)
- `limit`: number (default: 20)

### GET `/tabs/:tabId`
Get tab details

### PATCH `/tabs/:tabId`
Update tab details (creator only)

**Request:**
```json
{
  "title": "Updated Title",
  "description": "Updated description",
  "icon": "🍕"
}
```

### POST `/tabs/:tabId/settle`
Settle payment for tab

**Request:**
```json
{
  "txHash": "0x...",
  "amount": "30.00"
}
```

### DELETE `/tabs/:tabId`
Cancel tab (creator only)

---

## Chat Service (Port 3005)

### GET `/chat/token`
Get GetStream token for user

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "stream_token"
  }
}
```

### GET `/chat/channels`
Get user's channels

**Response:**
```json
{
  "success": true,
  "data": {
    "channels": [
      {
        "channelId": "tab_uuid",
        "channelType": "messaging",
        "name": "Dinner",
        "tabId": "uuid",
        "memberCount": 3,
        "lastMessageAt": "2024-01-01T00:00:00Z",
        "unreadCount": 5
      }
    ],
    "total": 10
  }
}
```

### GET `/chat/tabs/:tabId/channel`
Get channel by tab ID

### GET `/chat/channels/:channelId/messages?limit=50&offset=0`
Get channel messages

### POST `/chat/channels/:channelId/messages`
Send message to channel

**Request:**
```json
{
  "text": "Hello everyone!",
  "attachments": [] // optional
}
```

### POST `/chat/channels/:channelId/read`
Mark messages as read

### GET `/chat/unread`
Get unread message count

### GET `/chat/channels/:channelId/search?q=query`
Search messages in channel

### DELETE `/chat/channels/:channelId/messages/:messageId`
Delete message

### PATCH `/chat/messages/:messageId`
Update message

**Request:**
```json
{
  "text": "Updated message"
}
```

### POST `/chat/messages/:messageId/reactions`
Add reaction to message

**Request:**
```json
{
  "reactionType": "like"
}
```

### DELETE `/chat/messages/:messageId/reactions`
Remove reaction from message

---

## Notification Service (Port 3004)

### WebSocket Connection
Connect to WebSocket for real-time notifications:
```
ws://localhost:3004/notifications?token=jwt_token
```

**Messages Received:**
```json
{
  "type": "notification",
  "data": {
    "type": "TAB_CREATED",
    "title": "New Tab Created",
    "body": "John created 'Dinner'",
    "data": {
      "tabId": "uuid",
      "creatorId": "uuid"
    }
  }
}
```

### GET `/notifications?read=false&page=1&limit=20`
Get user's notifications

**Query Params:**
- `read`: true | false (optional)
- `type`: notification type (optional)
- `page`: number (default: 1)
- `limit`: number (default: 20)

**Response:**
```json
{
  "success": true,
  "data": {
    "notifications": [
      {
        "id": "uuid",
        "userId": "uuid",
        "type": "TAB_CREATED",
        "title": "New Tab Created",
        "body": "John created 'Dinner'",
        "data": {},
        "read": false,
        "createdAt": "2024-01-01T00:00:00Z"
      }
    ],
    "total": 50,
    "page": 1,
    "limit": 20
  }
}
```

### GET `/notifications/unread-count`
Get unread notification count

### PATCH `/notifications/:notificationId/read`
Mark notification as read

### PATCH `/notifications/read-all`
Mark all notifications as read

### DELETE `/notifications/:notificationId`
Delete notification

### DELETE `/notifications`
Delete all notifications

### POST `/notifications/send` (Internal)
Send a notification

**Request:**
```json
{
  "userId": "uuid",
  "type": "CUSTOM_NOTIFICATION",
  "title": "Title",
  "body": "Body text",
  "data": {}
}
```

### POST `/notifications/send-bulk` (Internal)
Send bulk notifications

---

## Notification Types

- `FRIEND_REQUEST` - Friend request received
- `FRIEND_ACCEPTED` - Friend request accepted
- `TAB_CREATED` - New tab created
- `TAB_UPDATED` - Tab updated
- `PAYMENT_RECEIVED` - Payment received
- `PAYMENT_REMINDER` - Payment reminder
- `TAB_SETTLED` - Tab fully settled
- `MESSAGE_RECEIVED` - New message in chat

---

## Error Responses

All errors follow this format:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {} // optional additional details
  }
}
```

**Common Error Codes:**
- `UNAUTHORIZED` - 401: Authentication required or invalid token
- `FORBIDDEN` - 403: Insufficient permissions
- `NOT_FOUND` - 404: Resource not found
- `VALIDATION_ERROR` - 400: Input validation failed
- `CONFLICT` - 409: Resource conflict
- `INTERNAL_SERVER_ERROR` - 500: Server error

---

## Rate Limiting

All services are rate-limited to 100 requests per 15 minutes per IP address.

**Rate Limit Headers:**
- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Remaining requests
- `X-RateLimit-Reset`: Time when limit resets

---

## Pagination

List endpoints support pagination:
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20, max: 100)

**Response includes:**
```json
{
  "data": [...],
  "total": 100,
  "page": 1,
  "limit": 20
}
```