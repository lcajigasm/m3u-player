# Simplified Release System

## 🎯 Overview

The M3U Player now uses a simplified, single-method automatic release system based on release branches. This provides a clean, controlled way to create releases without the complexity of multiple workflows.

## 🚀 How It Works

### Single Auto-Release Method
- **Trigger**: Push to `release` or `release/*` branches
- **Workflow**: `.github/workflows/auto-release.yml`
- **Helper Script**: `./scripts/auto-release-helper.sh`

### Process Flow
1. **Create release branch** with version update
2. **Push branch** to GitHub
3. **GitHub Actions** automatically builds for all platforms
4. **Release created** with all executables and release notes

## 📋 Available Release Methods

### Method 1: Auto-Release (Recommended)
```bash
./scripts/auto-release-helper.sh 0.2.0
```

**What it does:**
- Updates `package.json` version
- Creates `release/0.2.0` branch
- Commits version change
- Pushes branch (triggers auto-build)
- GitHub Actions creates release automatically

### Method 2: Manual Tag Release (Traditional)
```bash
./scripts/release.sh 0.2.0
```

**What it does:**
- Updates `package.json` version
- Creates and pushes `v0.2.0` tag
- Triggers tag-based workflow
- Creates release manually

## 🔧 Workflows Structure

```
.github/workflows/
├── auto-release.yml    # Branch-based auto-release (NEW)
├── release.yml         # Tag-based manual release (EXISTING)
├── ci.yml             # Continuous integration
└── test.yml           # Quick PR testing
```

## ✅ Benefits of the Simplified System

### For Developers
- **Single command**: `./scripts/auto-release-helper.sh 0.2.0`
- **Clear intent**: Release branches make intentions obvious
- **Safe process**: Can review changes before pushing
- **Clean history**: Separate release branches keep main clean

### For Teams
- **Controlled releases**: Only release branches trigger builds
- **Review process**: Can create PR from release branch if needed
- **Branch cleanup**: Release branches can be deleted after release
- **Clear workflow**: Everyone knows how releases work

### For Automation
- **Reliable triggers**: Branch-based triggers are more predictable
- **Duplicate prevention**: Checks for existing releases
- **Automatic tagging**: Creates proper git tags
- **Professional releases**: Consistent release notes and assets

## 🎯 Best Practices

### 1. Use Semantic Versioning
```bash
./scripts/auto-release-helper.sh 0.1.0   # Initial release
./scripts/auto-release-helper.sh 0.1.1   # Patch release
./scripts/auto-release-helper.sh 0.2.0   # Minor release
./scripts/auto-release-helper.sh 1.0.0   # Major release
```

### 2. Test Before Release
```bash
# Always test locally first
npm run pack
npm run dist
```

### 3. Clean Up After Release
```bash
# Delete release branch after successful release
git branch -d release/0.2.0
git push origin --delete release/0.2.0
```

### 4. Monitor Builds
- Check GitHub Actions after triggering release
- Verify all platforms build successfully
- Test downloaded executables

## 🔄 Migration from Multiple Methods

### Removed Workflows
- `auto-release-version.yml` - Version change detection
- `auto-release-commit.yml` - Commit message triggers

### Simplified Helper Script
- Removed multiple method options
- Focused on single branch-based approach
- Clearer help text and error messages

### Updated Documentation
- `AUTO-RELEASE-GUIDE.md` - Simplified to single method
- `README.md` - Updated with both auto and manual options
- Removed confusing multi-method comparisons

## 🚀 Quick Reference

### Create Auto-Release
```bash
./scripts/auto-release-helper.sh 0.2.0
```

### Create Manual Release
```bash
./scripts/release.sh 0.2.0
```

### Monitor Progress
```bash
# Check GitHub Actions
https://github.com/your-repo/actions

# Check Releases
https://github.com/your-repo/releases
```

## 📚 Documentation Links

- [Auto-Release Guide](AUTO-RELEASE-GUIDE.md) - Detailed branch-based release guide
- [Release Tutorial](RELEASE-TUTORIAL.md) - Manual tag-based releases
- [Build Guide](BUILD-GUIDE.md) - Complete build instructions

---

This simplified system provides the best of both worlds: automated convenience with manual control! 🎉