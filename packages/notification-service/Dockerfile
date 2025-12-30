FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY packages/notification-service/package*.json ./packages/notification-service/
COPY packages/common/package*.json ./packages/common/

# Install dependencies
RUN npm install

# Copy source code
COPY packages/notification-service ./packages/notification-service
COPY packages/common ./packages/common

# Build
RUN npm run build --workspace=@ghosttab/common
RUN npm run build --workspace=@ghosttab/notification-service

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY packages/notification-service/package*.json ./packages/notification-service/
COPY packages/common/package*.json ./packages/common/

# Install production dependencies only
RUN npm install --production

# Copy built files
COPY --from=builder /app/packages/notification-service/dist ./packages/notification-service/dist
COPY --from=builder /app/packages/common/dist ./packages/common/dist

EXPOSE 3004

CMD ["node", "packages/notification-service/dist/index.js"]