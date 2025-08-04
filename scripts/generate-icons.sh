#!/bin/bash

# Script to generate application icons from SVG
# Requires: imagemagick (brew install imagemagick)

set -e

echo "🎨 Generating application icons..."

# Check if ImageMagick is installed
if ! command -v convert &> /dev/null; then
    echo "❌ ImageMagick not found. Please install it:"
    echo "   macOS: brew install imagemagick"
    echo "   Ubuntu: sudo apt-get install imagemagick"
    echo "   Windows: Download from https://imagemagick.org/script/download.php"
    exit 1
fi

# Create assets directory if it doesn't exist
mkdir -p assets

# Generate PNG (512x512 for Linux)
echo "📱 Generating PNG icon..."
convert assets/icon.svg -resize 512x512 assets/icon.png

# Generate ICO (256x256 for Windows)
echo "🪟 Generating ICO icon..."
convert assets/icon.svg -resize 256x256 assets/icon.ico

# Generate ICNS (512x512 for macOS)
echo "🍎 Generating ICNS icon..."
if command -v iconutil &> /dev/null; then
    # macOS native method
    mkdir -p assets/icon.iconset
    convert assets/icon.svg -resize 16x16 assets/icon.iconset/icon_16x16.png
    convert assets/icon.svg -resize 32x32 assets/icon.iconset/icon_16x16@2x.png
    convert assets/icon.svg -resize 32x32 assets/icon.iconset/icon_32x32.png
    convert assets/icon.svg -resize 64x64 assets/icon.iconset/icon_32x32@2x.png
    convert assets/icon.svg -resize 128x128 assets/icon.iconset/icon_128x128.png
    convert assets/icon.svg -resize 256x256 assets/icon.iconset/icon_128x128@2x.png
    convert assets/icon.svg -resize 256x256 assets/icon.iconset/icon_256x256.png
    convert assets/icon.svg -resize 512x512 assets/icon.iconset/icon_256x256@2x.png
    convert assets/icon.svg -resize 512x512 assets/icon.iconset/icon_512x512.png
    convert assets/icon.svg -resize 1024x1024 assets/icon.iconset/icon_512x512@2x.png
    iconutil -c icns assets/icon.iconset
    mv assets/icon.icns assets/icon.icns
    rm -rf assets/icon.iconset
else
    # Fallback method using ImageMagick
    convert assets/icon.svg -resize 512x512 assets/temp.png
    convert assets/temp.png assets/icon.icns
    rm assets/temp.png
fi

echo "✅ Icons generated successfully!"
echo "📁 Generated files:"
echo "   - assets/icon.png (Linux)"
echo "   - assets/icon.ico (Windows)"
echo "   - assets/icon.icns (macOS)"
echo ""
echo "🚀 You can now build the application with custom icons!"