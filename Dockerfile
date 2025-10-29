# Simplified Dockerfile that builds React app in production stage
FROM node:18-alpine

# Set working directory
WORKDIR /workspace

# Install PM2 globally for process management
RUN npm install -g pm2

# Copy package files
COPY package*.json ./
COPY client/package*.json ./client/

# Install all dependencies (including client dev dependencies)
RUN npm ci --include=dev
RUN cd client && npm ci --include=dev --timeout=300000

# Copy source code
COPY server/ ./server/
COPY client/ ./client/

# Build React app
RUN cd client && npm run build

# Copy built React app to server public directory
RUN mkdir -p server/public && cp -r client/build/* server/public/

# Debug: Verify files were copied
RUN echo "Contents of server/public directory:" && ls -la server/public/ || echo "Server public directory not found"
RUN echo "Checking for index.html:" && test -f server/public/index.html && echo "index.html exists" || echo "index.html not found"

# Create uploads directory
RUN mkdir -p server/uploads

# Expose port
EXPOSE 8000

# Set environment to production
ENV NODE_ENV=production

# Start the application with PM2
CMD ["pm2-runtime", "start", "server/index.js", "--name", "kba-app"]
