# Build Guide: Generate Executables for Multiple Operating Systems

This guide will walk you through step-by-step to generate executables of your M3U Player application for Windows, macOS, and Linux using GitHub Actions.

## 📋 Prerequisites

- GitHub repository
- Project configured with `electron-builder`
- Access to GitHub Actions (included in public repositories)

## 🏗️ Workflow Structure

The project includes three main workflows:

### 1. CI Workflow (`ci.yml`)

- **Purpose**: Verify that code compiles correctly
- **Runs on**: Every push and pull request
- **Function**: Quick test without generating executables

### 2. Release Workflow (`release.yml`)

- **Purpose**: Generate executables for distribution
- **Runs on**: When creating tags or manually
- **Function**: Creates installers for Windows, macOS, and Linux

### 3. Test Workflow (`test.yml`)

- **Purpose**: Quick build verification for PRs
- **Runs on**: Pull requests only
- **Function**: Fast compilation test

## 🚀 How to Generate Executables

### Method 1: Using Automatic Script (Recommended)

```bash
# Run from project root
./scripts/release.sh 1.0.0
```

This script:

1. Updates version in `package.json`
2. Creates a commit with the change
3. Creates and pushes the tag
4. Automatically triggers the workflow

### Method 2: Manual

```bash
# 1. Update version (optional)
npm version 1.0.0 --no-git-tag-version

# 2. Commit changes
git add .
git commit -m "chore: release v1.0.0"

# 3. Create and push tag
git tag v1.0.0
git push origin main
git push origin v1.0.0
```

### Method 3: Manual Execution from GitHub

1. Go to your repository on GitHub
2. Navigate to **Actions** → **Build and Release**
3. Click **Run workflow**
4. Select branch and execute

## 📦 Output Formats by Operating System

### Windows

- **`.exe`** - NSIS installer (recommended for distribution)
- **Portable** - Executable without installation

### macOS

- **`.dmg`** - Disk image (macOS standard format)
- **`.zip`** - Compressed file
- **Architectures**: x64 (Intel) and ARM64 (Apple Silicon)

### Linux

- **`.AppImage`** - Portable executable (works on all distributions)
- **`.deb`** - Package for Debian/Ubuntu
- **`.rpm`** - Package for Red Hat/Fedora/SUSE

## 🔍 Monitor the Process

### 1. View Progress

- Go to **Actions** in your GitHub repository
- Click on the "Build and Release" workflow
- Watch the progress of each job (Windows, macOS, Linux)

### 2. Estimated Times

- **Windows**: ~5-8 minutes
- **macOS**: ~6-10 minutes
- **Linux**: ~4-6 minutes
- **Release**: ~1-2 additional minutes

### 3. Download Artifacts

During development, you can download executables from:

- **Actions** → **Workflow run** → **Artifacts** (bottom section)

## 📥 Access the Executables

### For Releases (Tags)

1. Go to the **Releases** section of your repository
2. Find your version (e.g., `v1.0.0`)
3. Download files from **Assets**

### For Testing (No Tag)

1. Go to **Actions** → **Workflow run**
2. Download from **Artifacts** section

## 🛠️ Advanced Customization

### Add Icons

Place these files in the `assets/` folder:

```
assets/
├── icon.icns    # macOS (512x512 px)
├── icon.ico     # Windows (256x256 px)
└── icon.png     # Linux (512x512 px)
```

Then update `package.json`:

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

### Modify Output Formats

Edit the `build` section in `package.json`:

```json
{
  "build": {
    "win": {
      "target": [
        { "target": "nsis", "arch": ["x64"] },
        { "target": "zip", "arch": ["x64"] }
      ]
    }
  }
}
```

## 🐛 Common Troubleshooting

### Error: "Cannot find electron-builder"

```bash
npm install --save-dev electron-builder
```

### Error: "Permission denied" on macOS

- Ensure repository has correct permissions
- Verify `GITHUB_TOKEN` is configured

### Build fails on Windows

- Check for special characters in paths
- Verify all dependencies are in `package.json`

### Very large files

- Electron executables are large (~100-200MB) by nature
- Consider additional compression for distribution

## 📊 Complete Flow Example

```bash
# 1. Develop new feature
git checkout -b feature/new-feature
# ... make changes ...
git commit -m "feat: new feature"
git push origin feature/new-feature

# 2. Create pull request and merge to main

# 3. Create release
./scripts/release.sh 1.2.0

# 4. Wait ~15-20 minutes for all executables to generate

# 5. Share download links from GitHub Releases
```

## 🎯 Best Practices

1. **Semantic Versioning**: Use `v1.0.0`, `v1.1.0`, `v2.0.0`
2. **Testing**: Always test locally before release
3. **Changelog**: Keep an updated change log
4. **Frequent Releases**: Better many small versions than few large ones
5. **Backup**: Artifacts are deleted after 30 days

## 🔗 Useful Links

- [electron-builder Documentation](https://www.electron.build/)
- [GitHub Actions Docs](https://docs.github.com/en/actions)
- [Semantic Versioning](https://semver.org/)

---

With this setup, you'll have professional installers for all major platforms with just creating a tag! 🎉
