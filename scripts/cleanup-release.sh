#!/bin/bash

# Script to cleanup failed releases and retry
# Usage: ./scripts/cleanup-release.sh <version>

set -e

if [ -z "$1" ]; then
    echo "Usage: $0 <version>"
    echo "Example: $0 0.1.2"
    exit 1
fi

VERSION="v$1"

echo "🧹 Cleaning up release $VERSION..."

# Check if release exists
if gh release view "$VERSION" >/dev/null 2>&1; then
    echo "📋 Release $VERSION exists, deleting..."
    gh release delete "$VERSION" --yes
    echo "✅ Release deleted"
else
    echo "ℹ️  Release $VERSION does not exist"
fi

# Check if tag exists
if git tag -l "$VERSION" | grep -q "$VERSION"; then
    echo "🏷️  Tag $VERSION exists locally, deleting..."
    git tag -d "$VERSION"
    echo "✅ Local tag deleted"
fi

# Check if tag exists on remote
if git ls-remote --tags origin | grep -q "refs/tags/$VERSION"; then
    echo "🏷️  Tag $VERSION exists on remote, deleting..."
    git push origin --delete "$VERSION"
    echo "✅ Remote tag deleted"
fi

echo ""
echo "✅ Cleanup completed for $VERSION"
echo "💡 You can now retry the release:"
echo "   ./scripts/auto-release-helper.sh $1"