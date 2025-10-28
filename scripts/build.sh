#!/bin/bash

# KBA Build Script for Production
echo "🚀 Starting KBA production build..."

# Exit on any error
set -e

# Build the React app
echo "📦 Building React app..."
cd client

# Verify public folder exists
echo "🔍 Checking public folder..."
if [ ! -d "public" ]; then
    echo "❌ Public folder not found!"
    exit 1
fi

if [ ! -f "public/index.html" ]; then
    echo "❌ index.html not found in public folder!"
    exit 1
fi

echo "✅ Public folder and index.html found"

# Install client dependencies if node_modules doesn't exist
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

echo "✅ Build completed successfully!"
echo "📁 Built files are in client/build/"
echo "🚀 Ready for deployment!"
