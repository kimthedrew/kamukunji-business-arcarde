# Multi-stage build for React + Node.js app
FROM node:18-alpine AS client-build

# Set working directory for client
WORKDIR /app/client

# Copy client package files first for better caching
COPY client/package*.json ./

# Install client dependencies (including dev dependencies for build)
RUN npm ci --include=dev

# Copy entire client directory (including public folder)
COPY client/ ./

# Verify that public folder and index.html exist
RUN ls -la public/ && test -f public/index.html

# Build the React app
RUN npm run build

# Debug: Verify build was successful
RUN echo "Contents of client directory after build:" && ls -la ./
RUN echo "Contents of build directory:" && ls -la ./build/ || echo "Build directory not found"
RUN echo "Checking for index.html:" && test -f ./build/index.html && echo "index.html exists" || echo "index.html not found"

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

# Debug: List contents to verify copy worked
RUN echo "Contents of public directory:" && ls -la ./public/ || echo "Public directory not found"
RUN echo "Contents of root directory:" && ls -la ./

# Create uploads directory
RUN mkdir -p uploads

# Expose port
EXPOSE 8000

# Set environment to production
ENV NODE_ENV=production

# Start the application with PM2
CMD ["pm2-runtime", "start", "index.js", "--name", "kba-app"]
