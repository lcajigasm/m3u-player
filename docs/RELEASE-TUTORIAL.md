# Release Tutorial: Creating Multi-Platform Executables

This tutorial provides a step-by-step guide for creating releases of the M3U Player application with automated builds for Windows, macOS, and Linux.

## 🎯 Overview

The M3U Player uses GitHub Actions to automatically build executables for all major operating systems whenever you create a release tag. This ensures consistent, professional builds without manual intervention.

## 🔧 Workflow Configuration

### Current Workflows

1. **`ci.yml`** - Continuous Integration
   - Runs on every push and PR
   - Verifies code compiles correctly
   - Quick feedback for developers

2. **`release.yml`** - Build and Release
   - Triggered by version tags (`v*`)
   - Builds for Windows, macOS, and Linux
   - Creates GitHub release with all executables

3. **`test.yml`** - Quick Test
   - Runs on pull requests
   - Fast compilation check
   - Linux-only for speed

## 🚀 Creating a Release

### Step 1: Prepare Your Code

Ensure your code is ready for release:

```bash
# Make sure you're on main branch
git checkout main
git pull origin main

# Verify everything works locally
npm install
npm run pack
```

### Step 2: Create Release (Automated Method)

Use the provided release script:

```bash
# This will handle everything automatically
./scripts/release.sh 0.1.0
```

The script will:
- Update `package.json` version
- Create a commit
- Create and push a git tag
- Trigger the build workflow

### Step 3: Create Release (Manual Method)

If you prefer manual control:

```bash
# Update version in package.json
npm version 0.1.0 --no-git-tag-version

# Commit the version change
git add package.json package-lock.json
git commit -m "chore: bump version to 0.1.0"

# Create and push tag
git tag v0.1.0
git push origin main
git push origin v0.1.0
```

### Step 4: Monitor Build Progress

1. Go to your GitHub repository
2. Click on **Actions** tab
3. Find the "Build and Release" workflow
4. Watch the progress of each platform build

Expected build times:
- Windows: 5-8 minutes
- macOS: 6-10 minutes
- Linux: 4-6 minutes

### Step 5: Verify Release

Once builds complete:

1. Go to **Releases** section in your repository
2. Find your new release (e.g., `v0.1.0`)
3. Verify all expected files are present:
   - Windows: `.exe` installer and portable
   - macOS: `.dmg` and `.zip` files
   - Linux: `.AppImage`, `.deb`, and `.rpm` files

## 📦 Generated Executables

### Windows Files
- `m3u-player-Setup-0.1.0.exe` - NSIS installer
- `m3u-player-0.1.0-win.zip` - Portable version

### macOS Files
- `m3u-player-0.1.0.dmg` - Disk image
- `m3u-player-0.1.0-mac.zip` - Compressed app
- Universal builds (Intel + Apple Silicon)

### Linux Files
- `m3u-player-0.1.0.AppImage` - Universal executable
- `m3u-player_0.1.0_amd64.deb` - Debian package
- `m3u-player-0.1.0.x86_64.rpm` - RPM package

## 🎨 Adding Application Icons

To replace the default Electron icon:

### Step 1: Create Icon Files

You need three icon formats:
- `icon.png` - 512x512 pixels (Linux)
- `icon.ico` - 256x256 pixels (Windows)
- `icon.icns` - 512x512 pixels (macOS)

### Step 2: Place Icons

```bash
mkdir -p assets
# Copy your icon files to:
# assets/icon.png
# assets/icon.ico
# assets/icon.icns
```

### Step 3: Update Configuration

The `package.json` is already configured to use these icons:

```json
{
  "build": {
    "mac": {
      "icon": "assets/icon.icns"
    },
    "win": {
      "icon": "assets/icon.ico"
    },
    "linux": {
      "icon": "assets/icon.png"
    }
  }
}
```

## 🔄 Release Workflow Details

### Parallel Builds

The workflow builds all platforms simultaneously:

```yaml
jobs:
  build-windows:    # Runs on windows-latest
  build-macos:      # Runs on macos-latest  
  build-linux:      # Runs on ubuntu-latest
  release:          # Combines all artifacts
```

### Artifact Management

- Each platform uploads its build artifacts
- Release job downloads all artifacts
- Creates a single GitHub release with all files

### Automatic Release Notes

GitHub automatically generates release notes based on:
- Commits since last release
- Pull requests merged
- Contributors involved

## 🐛 Troubleshooting

### Build Fails

1. **Check the logs**: Go to Actions → Failed workflow → View logs
2. **Common issues**:
   - Missing dependencies in `package.json`
   - Syntax errors in code
   - Missing files referenced in build config

### Release Not Created

1. **Verify tag format**: Must start with `v` (e.g., `v0.1.0`)
2. **Check permissions**: Ensure GITHUB_TOKEN has release permissions
3. **Build completion**: All platform builds must succeed

### Missing Executables

1. **Platform-specific failures**: Check individual job logs
2. **File paths**: Verify `electron-builder` configuration
3. **Dependencies**: Ensure all required packages are installed

## 📋 Pre-Release Checklist

Before creating a release:

- [ ] Code is tested and working
- [ ] Version number follows semantic versioning
- [ ] CHANGELOG.md is updated
- [ ] All dependencies are properly declared
- [ ] Icons are in place (if custom icons desired)
- [ ] Documentation is up to date

## 🎉 Post-Release Tasks

After successful release:

1. **Test downloads**: Verify executables work on target platforms
2. **Update documentation**: Ensure README reflects new version
3. **Announce release**: Share with users/community
4. **Monitor feedback**: Watch for issues or bug reports

## 🔗 Related Documentation

- [Build Guide](BUILD-GUIDE.md) - Detailed build configuration
- [Troubleshooting](TROUBLESHOOTING.md) - Common issues and solutions
- [Contributing](../CONTRIBUTING.md) - Development guidelines

---

This automated release process ensures consistent, professional builds across all platforms with minimal manual effort! 🚀