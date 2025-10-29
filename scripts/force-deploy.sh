#!/bin/bash

# KBA Force Deployment Script with Cache Busting
echo "🚀 Starting KBA force deployment with cache busting..."

# Exit on any error
set -e

# Clean everything first
echo "🧹 Cleaning all build artifacts..."
rm -rf client/build
rm -rf server/public
rm -rf node_modules/.cache

# Clean client build
echo "🧹 Cleaning client build..."
cd client
rm -rf build
rm -rf node_modules/.cache
if [ -d "node_modules" ]; then
    echo "📦 Reinstalling client dependencies..."
    rm -rf node_modules
    npm install
fi

# Build fresh React app
echo "🔨 Building fresh React app..."
npm run build

# Verify build
if [ ! -d "build" ]; then
    echo "❌ Build failed - build folder not created!"
    exit 1
fi

# Go back to root
cd ..

# Clean server public directory
echo "🧹 Cleaning server public directory..."
rm -rf server/public
mkdir -p server/public

# Copy fresh build
echo "📋 Copying fresh build to server public directory..."
cp -r client/build/* server/public/

# Verify the copy
if [ ! -f "server/public/index.html" ]; then
    echo "❌ Copy failed - index.html not found!"
    exit 1
fi

# Get the main JS file name
MAIN_JS=$(grep -o 'main\.[^"]*\.js' server/public/index.html | head -1)
echo "🔗 Main JS file: $MAIN_JS"

# Verify the main JS file exists
if [ ! -f "server/public/static/js/$MAIN_JS" ]; then
    echo "❌ Main JS file not found: $MAIN_JS"
    exit 1
fi

# Add a timestamp to force cache invalidation
TIMESTAMP=$(date +%s)
echo "⏰ Adding timestamp for cache busting: $TIMESTAMP"
echo "<!-- Build timestamp: $TIMESTAMP -->" >> server/public/index.html

echo "✅ Force deployment completed successfully!"
echo "📁 Built files are in server/public/"
echo "🔗 Main JS file: $MAIN_JS"
echo "⏰ Build timestamp: $TIMESTAMP"
echo ""
echo "🚀 Ready for deployment!"
echo "💡 Remember to clear browser cache after deployment!"
