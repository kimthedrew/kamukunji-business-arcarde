#!/bin/bash

# KBA Deployment Script
echo "🚀 Starting KBA deployment process..."

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ .env file not found. Please copy .env.example to .env and fill in your values."
    exit 1
fi

# Build the React app
echo "📦 Building React app..."
cd client
npm run build
if [ $? -ne 0 ]; then
    echo "❌ React build failed"
    exit 1
fi
cd ..

# Test the production build locally
echo "🧪 Testing production build..."
npm run start:prod &
SERVER_PID=$!

# Wait for server to start
sleep 5

# Test health endpoint
curl -f http://localhost:5000/api/health
if [ $? -eq 0 ]; then
    echo "✅ Health check passed"
else
    echo "❌ Health check failed"
    kill $SERVER_PID
    exit 1
fi

# Stop test server
kill $SERVER_PID

echo "✅ Build successful! Ready for deployment."
echo ""
echo "📋 Next steps:"
echo "1. Push your code to GitHub"
echo "2. Connect your repository to Koyeb"
echo "3. Set environment variables in Koyeb dashboard"
echo "4. Deploy using the koyeb.yaml configuration"
echo ""
echo "🔗 Your app will be available at your Koyeb domain"
