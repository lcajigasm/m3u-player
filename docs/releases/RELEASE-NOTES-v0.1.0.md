# Release Notes - v2.0.0

## 🎉 Major Release - Enhanced Player Features

This is a major release of M3U Player featuring dual theme system, enhanced UI, and comprehensive improvements for 2025.

## ✨ New Features

### 🎨 Custom Application Icon
- Added custom M3U Player icon with modern design
- Blue gradient background with play button and M3U branding
- Available in all required formats (PNG, ICO, ICNS)
- Replaces default Electron icon across all platforms

### 🏗️ Automated Build System
- **GitHub Actions workflows** for continuous integration and releases
- **Multi-platform builds**: Windows, macOS (Intel + Apple Silicon), Linux
- **Multiple formats per platform**:
  - Windows: NSIS installer + portable executable
  - macOS: DMG disk image + ZIP archive
  - Linux: AppImage + DEB + RPM packages

### 📚 Comprehensive Documentation
- **Build Guide**: Complete instructions for generating executables
- **Release Tutorial**: Step-by-step release process
- **Troubleshooting Guide**: Common issues and solutions
- All documentation translated to English

### 🛠️ Developer Tools
- **Icon generation script**: Automated icon creation from SVG
- **Release script**: One-command release creation
- **Testing workflows**: Quick build verification for PRs

## 📦 Available Downloads

### Windows
- `m3u-player-Setup-2.0.0.exe` - NSIS installer (recommended)
- `m3u-player-2.0.0-win.zip` - Portable version

### macOS
- `m3u-player-2.0.0.dmg` - Disk image (recommended)
- `m3u-player-2.0.0-mac.zip` - ZIP archive
- Universal builds supporting both Intel and Apple Silicon

### Linux
- `m3u-player-2.0.0.AppImage` - Universal executable (recommended)
- `m3u-player_2.0.0_amd64.deb` - Debian/Ubuntu package
- `m3u-player-2.0.0.x86_64.rpm` - Red Hat/Fedora package

## 🔧 Technical Improvements

### Build Configuration
- Updated product name to `m3u-player` for consistent branding
- Configured electron-builder for optimal packaging
- Added icon support for all platforms
- Optimized build targets for better compatibility

### Workflow Optimization
- **Parallel builds**: All platforms build simultaneously
- **Artifact management**: Organized build outputs
- **Automatic releases**: GitHub releases created automatically
- **Build caching**: Faster subsequent builds

## 📋 System Requirements

### Windows
- Windows 10 or later
- x64 or x86 architecture

### macOS
- macOS 10.14 (Mojave) or later
- Intel or Apple Silicon processors

### Linux
- Most modern distributions (Ubuntu 18.04+, Fedora 30+, etc.)
- x64 architecture
- GLIBC 2.17 or later

## 🚀 Getting Started

1. **Download** the appropriate installer for your platform
2. **Install** following your OS conventions
3. **Launch** m3u-player from your applications
4. **Load** an M3U playlist file or URL
5. **Enjoy** CORS-free IPTV streaming!

## 🔗 Links

- **Repository**: [github.com/lcajigasm/m3u-player](https://github.com/lcajigasm/m3u-player)
- **Documentation**: [docs/](../docs/)
- **Issues**: [GitHub Issues](https://github.com/lcajigasm/m3u-player/issues)
- **Releases**: [GitHub Releases](https://github.com/lcajigasm/m3u-player/releases)

## 🙏 Acknowledgments

- Built with [Electron](https://electronjs.org/)
- Video streaming powered by [HLS.js](https://github.com/video-dev/hls.js/)
- Icons generated with [ImageMagick](https://imagemagick.org/)
- Automated builds via [GitHub Actions](https://github.com/features/actions)

---

**Note**: This is an initial release. Please report any issues or feedback through GitHub Issues. Future releases will include additional features and improvements based on user feedback.

## 🔮 What's Next?

- Enhanced playlist management
- Additional video format support
- User interface improvements
- Performance optimizations
- Community-requested features

Thank you for using M3U Player! 🎉