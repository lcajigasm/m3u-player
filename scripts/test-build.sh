#!/bin/bash

# Script to test build configuration locally
# Usage: ./scripts/test-build.sh

set -e

echo "🧪 Testing build configuration locally..."

# Clean previous builds
echo "🧹 Cleaning previous builds..."
rm -rf dist/
rm -rf node_modules/.cache/

# Install dependencies
echo "📦 Installing dependencies..."
npm ci

# Test pack first (faster)
echo "📦 Testing pack build..."
npm run pack

if [ -d "dist" ]; then
    echo "✅ Pack build successful"
    echo "📁 Pack output:"
    ls -la dist/
else
    echo "❌ Pack build failed - no dist directory"
    exit 1
fi

# Test full dist build
echo "🏗️ Testing full dist build..."
npm run dist

echo "📁 Final dist output:"
find dist -type f -name "*" | sort

echo ""
echo "📊 File sizes:"
find dist -type f -name "*" -exec ls -lah {} \;

echo ""
echo "🎯 Expected file types:"
echo "  Linux: .AppImage, .deb, .rpm"
echo "  (Windows and macOS files only generate on their respective platforms)"

echo ""
echo "✅ Local build test completed!"
echo "💡 If this works locally, the issue might be platform-specific or in the GitHub Actions environment."