# Release Formats Guide

This document explains the file formats generated for each platform and how users should choose the right download.

## 📦 Available Formats by Platform

### 🪟 Windows

#### `m3u-player-Setup-X.Y.Z.exe` (Recommended)
- **Type**: NSIS installer
- **Size**: ~150-200MB
- **Features**:
  - Automatic installation to Program Files
  - Desktop and Start Menu shortcuts
  - Uninstaller included
  - Administrator privileges may be required
- **Best for**: Most Windows users

#### `m3u-player-X.Y.Z-win.zip`
- **Type**: Portable application
- **Size**: ~150-200MB
- **Features**:
  - No installation required
  - Run directly from any folder
  - Ideal for USB drives or restricted environments
  - No system integration
- **Best for**: Portable use, restricted systems

### 🍎 macOS

#### `m3u-player-X.Y.Z.dmg` (Recommended)
- **Type**: Disk image
- **Size**: ~150-200MB
- **Features**:
  - Standard macOS installation method
  - Drag-and-drop to Applications folder
  - Automatic Gatekeeper handling
  - Universal binary (Intel + Apple Silicon)
- **Best for**: Most macOS users

#### `m3u-player-X.Y.Z-mac.zip`
- **Type**: ZIP archive
- **Size**: ~150-200MB
- **Features**:
  - Direct extraction to any location
  - No disk image mounting required
  - Universal binary (Intel + Apple Silicon)
- **Best for**: Advanced users, automation

### 🐧 Linux

#### `m3u-player-X.Y.Z.AppImage` (Recommended)
- **Type**: Portable application
- **Size**: ~150-200MB
- **Features**:
  - Works on most Linux distributions
  - No installation required
  - Self-contained with all dependencies
  - Just make executable and run
- **Best for**: Most Linux users, universal compatibility

#### `m3u-player_X.Y.Z_amd64.deb`
- **Type**: Debian package
- **Size**: ~150-200MB
- **Features**:
  - Native package manager integration
  - Automatic dependency resolution
  - System integration (menu entries, file associations)
  - Easy updates through package manager
- **Best for**: Debian, Ubuntu, and derivatives

#### `m3u-player-X.Y.Z.x86_64.rpm`
- **Type**: RPM package
- **Size**: ~150-200MB
- **Features**:
  - Native package manager integration
  - Automatic dependency resolution
  - System integration
  - Easy updates through package manager
- **Best for**: Red Hat, Fedora, SUSE, and derivatives

#### `m3u-player-X.Y.Z-linux-x64.tar.gz`
- **Type**: Compressed archive
- **Size**: ~150-200MB
- **Features**:
  - Manual extraction and setup
  - Full control over installation location
  - Includes all binaries and resources
- **Best for**: Advanced users, custom installations

## 🎯 Quick Selection Guide

### For End Users
- **Windows**: Download the `.exe` installer
- **macOS**: Download the `.dmg` file
- **Linux**: Download the `.AppImage` file

### For System Administrators
- **Windows**: Use `.zip` for deployment scripts
- **macOS**: Use `.zip` for automated deployment
- **Linux**: Use `.deb`/`.rpm` for package management

### For Developers
- **All platforms**: Use `.tar.gz` or `.zip` for custom integrations

## 🔧 Installation Instructions

### Windows (.exe)
```cmd
# Download and run installer
m3u-player-Setup-0.1.0.exe

# Follow installation wizard
# Application will be available in Start Menu
```

### Windows (.zip)
```cmd
# Extract to desired location
unzip m3u-player-0.1.0-win.zip

# Run directly
cd m3u-player-0.1.0-win
m3u-player.exe
```

### macOS (.dmg)
```bash
# Download and open disk image
open m3u-player-0.1.0.dmg

# Drag M3U Player to Applications folder
# Launch from Applications or Launchpad
```

### macOS (.zip)
```bash
# Extract archive
unzip m3u-player-0.1.0-mac.zip

# Move to Applications (optional)
mv "M3U Player.app" /Applications/

# Launch application
open "/Applications/M3U Player.app"
```

### Linux (.AppImage)
```bash
# Download and make executable
chmod +x m3u-player-0.1.0.AppImage

# Run directly
./m3u-player-0.1.0.AppImage

# Optional: Move to PATH
sudo mv m3u-player-0.1.0.AppImage /usr/local/bin/m3u-player
```

### Linux (.deb)
```bash
# Install package
sudo dpkg -i m3u-player_0.1.0_amd64.deb

# Fix dependencies if needed
sudo apt-get install -f

# Launch from applications menu or terminal
m3u-player
```

### Linux (.rpm)
```bash
# Install package (Fedora/RHEL)
sudo rpm -i m3u-player-0.1.0.x86_64.rpm

# Or using dnf
sudo dnf install m3u-player-0.1.0.x86_64.rpm

# Launch from applications menu or terminal
m3u-player
```

### Linux (.tar.gz)
```bash
# Extract archive
tar -xzf m3u-player-0.1.0-linux-x64.tar.gz

# Move to desired location
sudo mv m3u-player-0.1.0-linux-x64 /opt/m3u-player

# Create symlink (optional)
sudo ln -s /opt/m3u-player/m3u-player /usr/local/bin/m3u-player

# Run application
m3u-player
```

## 🔍 File Verification

All release files include:
- **Digital signatures** (where supported by platform)
- **Checksums** for integrity verification
- **Version metadata** embedded in executables

### Verify Downloads
```bash
# Check file integrity (if checksums provided)
sha256sum m3u-player-0.1.0.AppImage

# Verify executable permissions
ls -la m3u-player-0.1.0.AppImage
```

## 🚨 Security Notes

### Windows
- Files are not code-signed (may trigger SmartScreen warnings)
- Right-click → Properties → Unblock if downloaded from internet
- Run installer as administrator if needed

### macOS
- Files are not notarized (may trigger Gatekeeper warnings)
- Right-click → Open to bypass Gatekeeper on first run
- System Preferences → Security → Allow if blocked

### Linux
- AppImage files need execute permissions
- Package installations may require sudo privileges
- Verify downloads from trusted sources only

## 📊 Size and Performance

### Typical File Sizes
- **Windows**: 150-200MB (includes Electron runtime)
- **macOS**: 150-200MB (universal binary)
- **Linux**: 150-200MB (self-contained)

### System Requirements
- **RAM**: 512MB minimum, 1GB recommended
- **Storage**: 300MB free space
- **CPU**: x64 architecture (ARM64 for Apple Silicon)

## 🔗 Related Documentation

- [Auto-Release Guide](AUTO-RELEASE-GUIDE.md) - How releases are created
- [Build Guide](../development/BUILD-GUIDE.md) - Building from source
- [Troubleshooting](../user-guides/TROUBLESHOOTING.md) - Installation issues

---

Choose the format that best fits your platform and use case! 🎉