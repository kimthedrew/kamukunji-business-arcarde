#!/bin/bash

# KBA Build Script for Production
echo "🚀 Starting KBA production build..."

# Exit on any error
set -e

# Build the React app
echo "📦 Building React app..."
cd client

# Install client dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📥 Installing client dependencies..."
    npm install
fi

# Build the React app
echo "🔨 Building React app..."
npm run build

# Go back to root
cd ..

echo "✅ Build completed successfully!"
echo "📁 Built files are in client/build/"
echo "🚀 Ready for deployment!"
