# Multi-stage build for React + Node.js app
FROM node:18-alpine AS client-build

# Set working directory for client
WORKDIR /app/client

# Copy client package files
COPY client/package*.json ./

# Install client dependencies (including dev dependencies for build)
RUN npm ci --include=dev

# Copy client source code
COPY client/ ./

# Build the React app
RUN npm run build

# Production stage
FROM node:18-alpine AS production

# Set working directory
WORKDIR /app

# Install PM2 globally for process management
RUN npm install -g pm2

# Copy server package files
COPY package*.json ./

# Install server dependencies
RUN npm ci --only=production

# Copy server source code
COPY server/ ./

# Copy built React app from client-build stage
COPY --from=client-build /app/client/build ./public

# Create uploads directory
RUN mkdir -p uploads

# Expose port
EXPOSE 5000

# Set environment to production
ENV NODE_ENV=production

# Start the application with PM2
CMD ["pm2-runtime", "start", "index.js", "--name", "kba-app"]
