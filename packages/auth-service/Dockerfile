FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY packages/auth-service/package*.json ./packages/auth-service/
COPY packages/common/package*.json ./packages/common/

# Install dependencies
RUN npm install

# Copy source code
COPY packages/auth-service ./packages/auth-service
COPY packages/common ./packages/common

# Build
RUN npm run build --workspace=@ghosttab/common
RUN npm run build --workspace=@ghosttab/auth-service

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY packages/auth-service/package*.json ./packages/auth-service/
COPY packages/common/package*.json ./packages/common/

# Install production dependencies only
RUN npm install --production

# Copy built files
COPY --from=builder /app/packages/auth-service/dist ./packages/auth-service/dist
COPY --from=builder /app/packages/common/dist ./packages/common/dist

EXPOSE 3001

CMD ["node", "packages/auth-service/dist/index.js"]