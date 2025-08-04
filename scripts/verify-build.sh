#!/bin/bash

# Script to verify build outputs match expected release formats
# Usage: ./scripts/verify-build.sh

set -e

echo "🔍 Verifying build configuration and outputs..."

# Check if dist directory exists
if [ ! -d "dist" ]; then
    echo "❌ No dist directory found. Run 'npm run dist' first."
    exit 1
fi

echo "📁 Contents of dist directory:"
ls -la dist/

echo ""
echo "🔍 Analyzing build outputs by platform..."

# Check for expected file types
echo ""
echo "🪟 Windows files:"
find dist -name "*.exe" -o -name "*.zip" | grep -E "\.(exe|zip)$" | while read file; do
    echo "  ✅ $(basename "$file") ($(du -h "$file" | cut -f1))"
done

echo ""
echo "🍎 macOS files:"
find dist -name "*.dmg" | while read file; do
    echo "  ✅ $(basename "$file") ($(du -h "$file" | cut -f1))"
done

echo ""
echo "🐧 Linux files:"
find dist -name "*.AppImage" -o -name "*.deb" -o -name "*.rpm" -o -name "*.tar.gz" | while read file; do
    echo "  ✅ $(basename "$file") ($(du -h "$file" | cut -f1))"
done

echo ""
echo "📊 Build verification summary:"

# Count files by type
EXE_COUNT=$(find dist -name "*.exe" | wc -l)
ZIP_COUNT=$(find dist -name "*.zip" | wc -l)
DMG_COUNT=$(find dist -name "*.dmg" | wc -l)
APPIMAGE_COUNT=$(find dist -name "*.AppImage" | wc -l)
DEB_COUNT=$(find dist -name "*.deb" | wc -l)
RPM_COUNT=$(find dist -name "*.rpm" | wc -l)
TARGZ_COUNT=$(find dist -name "*.tar.gz" | wc -l)

echo "  Windows executables (.exe): $EXE_COUNT"
echo "  ZIP archives: $ZIP_COUNT"
echo "  macOS disk images (.dmg): $DMG_COUNT"
echo "  Linux AppImages: $APPIMAGE_COUNT"
echo "  Debian packages (.deb): $DEB_COUNT"
echo "  RPM packages (.rpm): $RPM_COUNT"
echo "  Tar.gz archives: $TARGZ_COUNT"

echo ""
echo "🎯 Expected formats for GitHub release:"
echo "  🪟 Windows: .exe installer + .zip portable"
echo "  🍎 macOS: .dmg disk image + .zip archive"
echo "  🐧 Linux: .AppImage + .deb + .rpm + .tar.gz"

# Verify we have the minimum expected files
TOTAL_FILES=$((EXE_COUNT + DMG_COUNT + APPIMAGE_COUNT))

if [ $TOTAL_FILES -ge 3 ]; then
    echo ""
    echo "✅ Build verification passed! Ready for release."
    echo "💡 Run './scripts/auto-release-helper.sh <version>' to create a release"
else
    echo ""
    echo "⚠️  Warning: Some expected file types are missing."
    echo "   This might be normal if building on a single platform."
    echo "   GitHub Actions will build all platforms automatically."
fi

echo ""
echo "🔗 To test the release process:"
echo "   1. Commit your changes"
echo "   2. Run: ./scripts/auto-release-helper.sh 0.1.1"
echo "   3. Monitor: https://github.com/$(git config --get remote.origin.url | sed 's/.*github.com[:/]\([^.]*\).*/\1/')/actions"