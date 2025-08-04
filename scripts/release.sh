#!/bin/bash

# Script para crear un nuevo release
# Uso: ./scripts/release.sh <version>
# Ejemplo: ./scripts/release.sh 1.0.0

set -e

if [ -z "$1" ]; then
    echo "Error: You must provide a version"
    echo "Usage: $0 <version>"
    echo "Example: $0 1.0.0"
    exit 1
fi

VERSION=$1
TAG="v$VERSION"

echo "🚀 Creating release $TAG..."

# Verificar que estemos en la rama main
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "main" ]; then
    echo "⚠️  Warning: You are not on main branch (current: $CURRENT_BRANCH)"
    read -p "Continue? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Verificar que no hay cambios sin commitear
if ! git diff-index --quiet HEAD --; then
    echo "❌ Error: There are uncommitted changes"
    echo "Please commit all changes before creating a release"
    exit 1
fi

# Update package.json with new version
echo "📝 Updating package.json..."
npm version $VERSION --no-git-tag-version

# Commit version change
git add package.json package-lock.json
git commit -m "chore: bump version to $VERSION"

# Create and push tag
echo "🏷️  Creating tag $TAG..."
git tag $TAG
git push origin main
git push origin $TAG

echo "✅ Release $TAG created successfully!"
echo "🔗 Go to GitHub Actions to see build progress:"
echo "   https://github.com/$(git config --get remote.origin.url | sed 's/.*github.com[:/]\([^.]*\).*/\1/')/actions"