#!/bin/bash

# KBA Aggressive Deployment Script with Maximum Cache Busting
echo "🚀 Starting KBA aggressive deployment with maximum cache busting..."

# Exit on any error
set -e

# Clean everything first
echo "🧹 Cleaning ALL build artifacts and caches..."
rm -rf client/build
rm -rf server/public
rm -rf node_modules/.cache
rm -rf client/node_modules/.cache

# Clean client build completely
echo "🧹 Cleaning client build completely..."
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

# Clean server public directory completely
echo "🧹 Cleaning server public directory completely..."
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
MAIN_CSS=$(grep -o 'main\.[^"]*\.css' server/public/index.html | head -1)
echo "🔗 Main JS file: $MAIN_JS"
echo "🔗 Main CSS file: $MAIN_CSS"

# Verify the main files exist
if [ ! -f "server/public/static/js/$MAIN_JS" ]; then
    echo "❌ Main JS file not found: $MAIN_JS"
    exit 1
fi

if [ ! -f "server/public/static/css/$MAIN_CSS" ]; then
    echo "❌ Main CSS file not found: $MAIN_CSS"
    exit 1
fi

# Add aggressive cache busting headers to HTML
TIMESTAMP=$(date +%s)
RANDOM_ID=$(openssl rand -hex 4)
echo "⏰ Adding aggressive cache busting: timestamp=$TIMESTAMP, random=$RANDOM_ID"

# Add cache busting to HTML
echo "<!-- Build timestamp: $TIMESTAMP -->" >> server/public/index.html
echo "<!-- Random ID: $RANDOM_ID -->" >> server/public/index.html

# Add cache busting headers to static files
echo "📝 Adding cache busting headers to static files..."
find server/public -name "*.js" -exec sh -c 'echo "/* Cache bust: $TIMESTAMP */" > temp && cat "$1" >> temp && mv temp "$1"' _ {} \;
find server/public -name "*.css" -exec sh -c 'echo "/* Cache bust: $TIMESTAMP */" > temp && cat "$1" >> temp && mv temp "$1"' _ {} \;

# Create a version file for debugging
echo "{\"timestamp\": $TIMESTAMP, \"random\": \"$RANDOM_ID\", \"js\": \"$MAIN_JS\", \"css\": \"$MAIN_CSS\"}" > server/public/version.json

echo "✅ Aggressive deployment completed successfully!"
echo "📁 Built files are in server/public/"
echo "🔗 Main JS file: $MAIN_JS"
echo "🔗 Main CSS file: $MAIN_CSS"
echo "⏰ Build timestamp: $TIMESTAMP"
echo "🎲 Random ID: $RANDOM_ID"
echo ""
echo "🚀 Ready for deployment!"
echo "💡 This should force complete cache invalidation!"
