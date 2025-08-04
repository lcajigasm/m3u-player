# Automatic Release Guide

This guide explains how to use automatic releases that trigger when pushing to release branches, providing a clean and controlled release process.

## 🎯 Branch-Based Auto-Release

**Workflow**: `auto-release.yml`  
**Trigger**: Push to `release` or `release/*` branches

The system automatically creates releases when you push to a release branch, eliminating the need to manually create tags while maintaining full control over when releases happen.

### Quick Start

```bash
# Using the helper script (recommended)
./scripts/auto-release-helper.sh 0.2.0

# Manual process
git checkout -b release/0.2.0
npm version 0.2.0 --no-git-tag-version
git add package.json package-lock.json
git commit -m "chore: prepare release 0.2.0"
git push origin release/0.2.0
```

## 🔧 How It Works

### Auto-Release Features
- ✅ **Branch trigger**: Activates on push to `release` or `release/*` branches
- ✅ **Version detection**: Automatically reads version from `package.json`
- ✅ **Duplicate prevention**: Checks if release already exists before creating
- ✅ **Automatic tagging**: Creates git tags automatically
- ✅ **Multi-platform builds**: Builds for Windows, macOS, and Linux simultaneously
- ✅ **Professional releases**: Generates release notes and organizes assets

## 🚀 Creating a Release

### Using the Helper Script (Recommended)

```bash
./scripts/auto-release-helper.sh 0.2.0
```

This script will:
1. Update the version in `package.json`
2. Create a `release/0.2.0` branch
3. Commit the version change
4. Push the branch to trigger the auto-release

### Manual Process

If you prefer to do it manually:

```bash
# 1. Create and switch to release branch
git checkout -b release/0.2.0

# 2. Update version
npm version 0.2.0 --no-git-tag-version

# 3. Commit changes
git add package.json package-lock.json
git commit -m "chore: prepare release 0.2.0"

# 4. Push branch (triggers auto-release)
git push origin release/0.2.0
```

### Monitor the Build

1. Go to **Actions** tab in your GitHub repository
2. Find the running workflow
3. Monitor build progress (~15-20 minutes)
4. Check **Releases** section for the new release

### Verify Release

Once complete, verify:
- [ ] Release appears in GitHub Releases
- [ ] All platform executables are present
- [ ] Version tag was created
- [ ] Release notes are generated

## 📋 Workflow Details

### Release Branch Naming
The workflow triggers on these branch patterns:
- `release` - Single release branch
- `release/*` - Version-specific branches (e.g., `release/0.2.0`, `release/1.0.0`)

### Generated Assets
Each release includes executables for all platforms:
- **Windows**: `.exe` installer and portable version
- **macOS**: `.dmg` disk image and `.zip` archive (Intel + Apple Silicon)
- **Linux**: `.AppImage`, `.deb`, and `.rpm` packages

### Automatic Features
- **Tag creation**: Creates `v0.2.0` style tags automatically
- **Release notes**: Generated from commits and pull requests
- **Asset organization**: All executables properly named and organized

## 🛠️ Customization

### Modify Trigger Branches

Edit `.github/workflows/auto-release.yml` to change trigger branches:

```yaml
on:
  push:
    branches:
      - release
      - release/*
      - deploy    # Add custom branch
```

### Custom Release Notes

Modify the `body` section in `.github/workflows/auto-release.yml`:

```yaml
body: |
  🎉 **Custom Release Notes**
  
  Your custom content here...
  
  Version: ${{ needs.check-version.outputs.new-version }}
```

## 🐛 Troubleshooting

### Release Not Triggered

1. **Check branch name**: Ensure it matches `release` or `release/*` pattern
2. **Verify push**: Make sure the branch was pushed to GitHub
3. **Check version format**: Follows semantic versioning (e.g., `0.2.0`)
4. **Review workflow logs**: Look for errors in Actions tab

### Duplicate Releases

All workflows include duplicate prevention:
- Check if tag already exists
- Skip release creation if duplicate found
- Log the duplicate attempt

### Build Failures

1. **Check individual platform logs**: Windows, macOS, Linux
2. **Verify dependencies**: Ensure `package.json` is correct
3. **Test locally**: Run `npm run dist` locally first

## 🎯 Best Practices

### 1. Use Semantic Versioning
Always use proper version format: `0.1.0`, `1.0.0`, `2.1.3`

### 2. Test Before Release
Run local builds before triggering auto-release:
```bash
npm run pack  # Quick test
npm run dist  # Full build test
```

### 3. Monitor Builds
Always check GitHub Actions after triggering a release.

### 4. Keep Workflows Updated
Regularly update workflow dependencies and Node.js versions.

### 5. Clean Up Release Branches
After successful releases, you can delete the release branches:
```bash
git branch -d release/0.2.0
git push origin --delete release/0.2.0
```

## 🔗 Related Documentation

- [Build Guide](BUILD-GUIDE.md) - Complete build instructions
- [Release Tutorial](RELEASE-TUTORIAL.md) - Manual release process
- [Troubleshooting](TROUBLESHOOTING.md) - Common issues

---

With this automatic release workflow, you can create professional releases with just a simple push to a release branch! 🚀