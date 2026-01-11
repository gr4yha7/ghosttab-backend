# GhostTab Backend

A microservices-based backend for GhostTab - a Venmo-style split payments app using Privy wallets on the Movement Network.

## Quick Start

### Prerequisites

- Node.js 20+
- Docker & Docker Compose
- Redis (via Docker or local install)

### Setup (Choose One Method)

#### Method 1: Automated Setup (Recommended)

```bash
# Clone the repository
git clone <repository>
cd ghosttab-backend

# Make scripts executable
chmod +x setup.sh

# Run setup
./setup.sh

# Configure environment
cp .env.example .env
# Edit .env with your credentials

# Start Redis
docker-compose up -d redis

# Start all services
npm run dev
```

#### Method 2: Manual Setup

```bash
# 1. Install root dependencies
npm install

# 2. Build common package FIRST (this is crucial)
cd packages/common
npm install
npm run build
cd ../..

# 3. Install workspace dependencies
npm install --workspaces

# 4. Build all services
npm run build

# 5. Configure environment
cp .env.example .env
# Edit .env with your credentials

# 6. Start Redis
docker-compose up -d redis

# 7. Start services
npm run dev
```

### Troubleshooting "@ghosttab/common not found"

If you see this error, run:

```bash
./fix-common-module.sh
```

Or manually:

```bash
cd packages/common
npm run clean
npm run build
cd ../..
```

Then restart your IDE's TypeScript server.

## Architecture

```
ghosttab-backend/
├── move_contract/
│   ├── build/
│   ├── scripts/ 
│   ├── sources/
│   └── tests/  
├── packages/
│   ├── common/              # Shared utilities, types, and configurations
│   ├── auth-service/        # Authentication and user onboarding
│   ├── user-service/        # User profiles and friend management
│   ├── tab-service/         # Tab creation and settlement
│   ├── notification-service/# Real-time notifications
│   └── chat-service/        # GetStream chat integration
├── supabase/
│   └── migrations/          # Database migrations
├── docker-compose.yml
└── turbo.json
```

## Tech Stack

- **Framework**: Express.js (TypeScript)
- **Database**: Supabase (PostgreSQL with RLS)
- **Authentication**: Privy (embedded wallets)
- **Blockchain**: Movement Network (MoveVM)
- **Notifications**: Upstash Redis Pub/Sub
- **Chat**: GetStream SDK
- **Email**: MailGun API
- **Monorepo**: Turborepo

## Services

### Auth Service (Port 3001)
- Privy token verification
- JWT generation
- GetStream token generation
- User onboarding

### User Service (Port 3002)
- User profile management
- Friend requests and management
- OTP-based invitations
- User search

### Tab Service (Port 3003)
- Create and manage tabs
- Split calculations
- Settlement tracking
- Auto-settle configuration

### Notification Service (Port 3004)
- WebSocket/SSE for real-time notifications
- Redis Pub/Sub integration
- Push notification delivery

### Chat Service (Port 3005)
- GetStream channel management
- Tab group chat creation
- Message history

## Prerequisites

- Node.js 20+
- Docker and Docker Compose
- Supabase account
- Privy account
- Upstash Redis account
- GetStream account
- Resend account
- Movement Network RPC access

## Setup

### 1. Clone and Install Dependencies

```bash
git clone <repository>
cd ghosttab-backend
npm install
```

### 2. Environment Variables

Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
```

Required environment variables:
- `PRIVY_APP_ID`, `PRIVY_APP_SECRET`
- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_KEY`
- `UPSTASH_REDIS_URL`, `UPSTASH_REDIS_TOKEN`
- `STREAM_API_KEY`, `STREAM_API_SECRET`
- `MAILGUN_API_KEY`
- `MOVEMENT_RPC_URL`, `MOVEMENT_CHAIN_ID`
- `JWT_SECRET`

### 3. Database Setup

Run Supabase migrations:

```bash
# Login to Supabase CLI
supabase login

# Link to your project
supabase link --project-ref <your-project-ref>

# Run migrations
supabase db push
```

Alternatively, run the SQL in `supabase/migrations/001_initial_schema.sql` directly in your Supabase dashboard.

### 4. Development

Run all services in development mode:

```bash
npm run dev
```

Or run specific services:

```bash
npm run dev --workspace=@ghosttab/auth-service
npm run dev --workspace=@ghosttab/user-service
```

### 5. Docker Development

```bash
docker-compose up -d
```

This will start all services and a local Redis instance.

## API Documentation

### Auth Service (localhost:3001)

#### POST `/auth/login`
Login with Privy token
```json
{
  "privyToken": "string"
}
```

Response:
```json
{
  "success": true,
  "data": {
    "token": "jwt_token",
    "user": { ... },
    "streamToken": "stream_token",
    "isNewUser": false
  }
}
```

#### POST `/auth/refresh`
Refresh JWT token
```json
{
  "token": "old_jwt_token"
}
```

#### GET `/auth/me`
Get current user (requires Bearer token)

### User Service (localhost:3002)

#### GET `/users/profile`
Get current user profile

#### PATCH `/users/profile`
Update user profile
```json
{
  "username": "string",
  "email": "string",
  "avatarUrl": "string"
}
```

#### GET `/users/search?q=query`
Search for users

#### GET `/users/friends`
Get friends list

#### GET `/users/friends/requests`
Get pending friend requests

#### POST `/users/friends/request`
Send friend request
```json
{
  "toIdentifier": "email@example.com or userId"
}
```

#### POST `/users/friends/:friendshipId/accept`
Accept friend request (optionally with OTP)
```json
{
  "otpCode": "123456"
}
```

#### DELETE `/users/friends/:friendshipId/decline`
Decline friend request

#### DELETE `/users/friends/:friendId`
Remove friend

## Testing

```bash
# Run tests for all services
npm test

# Run tests for specific service
npm test --workspace=@ghosttab/auth-service
```

## Building for Production

```bash
# Build all services
npm run build

# Build specific service
npm run build --workspace=@ghosttab/auth-service
```

## Deployment

### Using Docker

```bash
docker-compose -f docker-compose.prod.yml up -d
```

### Using Kubernetes

Kubernetes manifests coming soon.

### Environment Specific

- **Staging**: Deploy to Railway/Render with staging environment variables
- **Production**: Deploy with production credentials and enable monitoring

## Monitoring & Logging

- Logs are written to stdout/stderr and files in `logs/`
- Use Winston for structured logging
- Integrate with LogDNA, DataDog, or similar for production

## Security

- All endpoints (except auth) require JWT authentication
- Row Level Security (RLS) enabled on all Supabase tables
- Rate limiting on all services
- Helmet.js for HTTP security headers
- CORS configured for allowed origins only
- Input validation with Zod schemas

## Contributing

1. Create feature branch from `main`
2. Make changes with tests
3. Submit PR with description

## License

Proprietary - All rights reserved

## Support

For issues, contact: support@ghosttab.app