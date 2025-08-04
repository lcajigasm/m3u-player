#!/bin/bash

# Auto Release Helper - Branch-based releases
# Usage: ./scripts/auto-release-helper.sh <version>

set -e

show_help() {
    echo "🚀 Auto Release Helper"
    echo ""
    echo "Creates a release branch and triggers automatic build & release"
    echo ""
    echo "Usage: $0 <version>"
    echo ""
    echo "Examples:"
    echo "  $0 0.2.0    # Create release/0.2.0 branch and trigger auto-release"
    echo "  $0 1.0.0    # Create release/1.0.0 branch and trigger auto-release"
    echo ""
    echo "What this script does:"
    echo "  1. Updates version in package.json"
    echo "  2. Creates a release/<version> branch"
    echo "  3. Commits the version change"
    echo "  4. Pushes the branch (triggers GitHub Actions)"
    echo "  5. GitHub Actions builds executables for all platforms"
    echo "  6. Creates a GitHub release automatically"
    echo ""
}

if [ $# -lt 1 ]; then
    show_help
    exit 1
fi

VERSION=$1

echo "🚀 Auto Release Helper - Version: $VERSION"

# Verify we're in a git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo "❌ Error: Not in a git repository"
    exit 1
fi

# Ensure we're on main branch
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "main" ]; then
    echo "⚠️  Warning: You are not on main branch (current: $CURRENT_BRANCH)"
    read -p "Switch to main branch? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        git checkout main
        git pull origin main
    else
        echo "❌ Staying on current branch. Release cancelled."
        exit 1
    fi
fi

# Check for uncommitted changes
if ! git diff-index --quiet HEAD --; then
    echo "❌ Error: There are uncommitted changes"
    echo "Please commit all changes before creating a release"
    exit 1
fi

echo "📝 Creating release branch..."

# Update version in package.json
npm version $VERSION --no-git-tag-version

# Create release branch
BRANCH_NAME="release/$VERSION"
git checkout -b $BRANCH_NAME

# Commit changes
git add package.json package-lock.json
git commit -m "chore: prepare release $VERSION"

# Push branch (this triggers the workflow)
git push origin $BRANCH_NAME

echo "✅ Release branch $BRANCH_NAME created and pushed!"
echo ""
echo "🎉 Auto-release process initiated!"
echo "⏱️  Expected build time: ~15-20 minutes"
echo "🔗 Monitor progress: https://github.com/$(git config --get remote.origin.url | sed 's/.*github.com[:/]\([^.]*\).*/\1/')/actions"
echo "📦 Executables will be available in GitHub Releases once complete"
echo ""
echo "💡 Tip: You can now switch back to main branch:"
echo "   git checkout main"