#!/bin/bash

echo "🚀 Starting Koyeb build process..."

# Check if we're in the right directory
echo "📁 Current directory: $(pwd)"
echo "📁 Contents: $(ls -la)"

# Check if client directory exists
if [ ! -d "client" ]; then
    echo "❌ Client directory not found!"
    exit 1
fi

echo "✅ Client directory found"

# Check if client/public exists
if [ ! -d "client/public" ]; then
    echo "❌ Client public directory not found!"
    echo "📁 Client contents: $(ls -la client/)"
    exit 1
fi

echo "✅ Client public directory found"
echo "📁 Client public contents: $(ls -la client/public/)"

# Install client dependencies
echo "📦 Installing client dependencies..."
cd client
npm install
if [ $? -ne 0 ]; then
    echo "❌ Failed to install client dependencies"
    exit 1
fi

# Build React app
echo "🔨 Building React app..."
npm run build
if [ $? -ne 0 ]; then
    echo "❌ Failed to build React app"
    exit 1
fi

# Check if build was successful
if [ ! -d "build" ]; then
    echo "❌ Build directory not created!"
    exit 1
fi

echo "✅ React app built successfully"

# Go back to root
cd ..

# Create server/public directory
echo "📁 Creating server/public directory..."
mkdir -p server/public

# Copy build files
echo "📋 Copying build files to server/public..."
cp -r client/build/* server/public/

# Verify copy was successful
if [ ! -f "server/public/index.html" ]; then
    echo "❌ Failed to copy index.html to server/public/"
    echo "📁 Server public contents: $(ls -la server/public/)"
    exit 1
fi

echo "✅ Build files copied successfully"
echo "📁 Server public contents: $(ls -la server/public/)"
echo "🎉 Koyeb build completed successfully!"
