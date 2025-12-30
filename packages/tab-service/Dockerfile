FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY packages/tab-service/package*.json ./packages/tab-service/
COPY packages/common/package*.json ./packages/common/

# Install dependencies
RUN npm install

# Copy source code
COPY packages/tab-service ./packages/tab-service
COPY packages/common ./packages/common

# Build
RUN npm run build --workspace=@ghosttab/common
RUN npm run build --workspace=@ghosttab/tab-service

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY packages/tab-service/package*.json ./packages/tab-service/
COPY packages/common/package*.json ./packages/common/

# Install production dependencies only
RUN npm install --production

# Copy built files
COPY --from=builder /app/packages/tab-service/dist ./packages/tab-service/dist
COPY --from=builder /app/packages/common/dist ./packages/common/dist

EXPOSE 3003

CMD ["node", "packages/tab-service/dist/index.js"]