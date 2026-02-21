# Use Node.js LTS
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build arguments
ARG API_KEY
ENV API_KEY=$API_KEY

# Build the application
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy package files for production server
COPY package*.json ./
RUN npm ci --only=production

# Copy built assets and server script
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server.js ./

# Expose port
ENV PORT=8080
EXPOSE 8080

# Start server
CMD ["node", "server.js"]
