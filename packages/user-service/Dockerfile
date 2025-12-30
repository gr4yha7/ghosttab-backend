FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY packages/user-service/package*.json ./packages/user-service/
COPY packages/common/package*.json ./packages/common/

# Install dependencies
RUN npm install

# Copy source code
COPY packages/user-service ./packages/user-service
COPY packages/common ./packages/common

# Build
RUN npm run build --workspace=@ghosttab/common
RUN npm run build --workspace=@ghosttab/user-service

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY packages/user-service/package*.json ./packages/user-service/
COPY packages/common/package*.json ./packages/common/

# Install production dependencies only
RUN npm install --production

# Copy built files
COPY --from=builder /app/packages/user-service/dist ./packages/user-service/dist
COPY --from=builder /app/packages/common/dist ./packages/common/dist

EXPOSE 3002

CMD ["node", "packages/user-service/dist/index.js"]