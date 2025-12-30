FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY packages/chat-service/package*.json ./packages/chat-service/
COPY packages/common/package*.json ./packages/common/

# Install dependencies
RUN npm install

# Copy source code
COPY packages/chat-service ./packages/chat-service
COPY packages/common ./packages/common

# Build
RUN npm run build --workspace=@ghosttab/common
RUN npm run build --workspace=@ghosttab/chat-service

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY packages/chat-service/package*.json ./packages/chat-service/
COPY packages/common/package*.json ./packages/common/

# Install production dependencies only
RUN npm install --production

# Copy built files
COPY --from=builder /app/packages/chat-service/dist ./packages/chat-service/dist
COPY --from=builder /app/packages/common/dist ./packages/common/dist

EXPOSE 3005

CMD ["node", "packages/chat-service/dist/index.js"]