#!/bin/bash

# KBA Clean Deployment Script
echo "🚀 Starting KBA clean deployment process..."

# Exit on any error
set -e

# Clean up any existing build artifacts
echo "🧹 Cleaning up old build artifacts..."
rm -rf client/build
rm -rf server/public/static
rm -rf server/public/*.html
rm -rf server/public/*.json
rm -rf server/public/*.ico
rm -rf server/public/*.png
rm -rf server/public/*.txt
rm -rf server/public/sw.js

# Build the React app
echo "📦 Building React app..."
cd client

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📥 Installing client dependencies..."
    npm install
fi

# Build the React app
echo "🔨 Building React app..."
npm run build

# Verify build was successful
if [ ! -d "build" ]; then
    echo "❌ Build failed - build folder not created!"
    exit 1
fi

# Go back to root
cd ..

# Clean copy of build to server public directory
echo "📋 Copying build to server public directory..."
rm -rf server/public
mkdir -p server/public
cp -r client/build/* server/public/

# Verify the copy was successful
if [ ! -f "server/public/index.html" ]; then
    echo "❌ Copy failed - index.html not found!"
    exit 1
fi

# Verify the main JS file exists
MAIN_JS=$(grep -o 'main\.[^"]*\.js' server/public/index.html | head -1)
if [ ! -f "server/public/static/js/$MAIN_JS" ]; then
    echo "❌ Main JS file not found: $MAIN_JS"
    exit 1
fi

echo "✅ Clean deployment completed successfully!"
echo "📁 Built files are in server/public/"
echo "🔗 Main JS file: $MAIN_JS"
echo ""
echo "🚀 Ready for deployment!"
