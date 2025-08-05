# M3U Player - Project Structure

## 📁 Directory Structure

```
m3u-player/
├── .github/
│   └── workflows/           # GitHub Actions (3 essential workflows)
│       ├── build-test.yml   # CI testing on push/PR
│       ├── release-tagged.yml # Tagged releases (v*)
│       └── release-branch.yml # Branch releases (release/*)
├── assets/                  # Application assets
│   ├── icons/              # Icon variations
│   ├── icon.icns           # macOS icon
│   ├── icon.ico            # Windows icon
│   ├── icon.png            # Linux icon
│   └── *.svg               # SVG icons
├── docs/                   # Documentation
│   ├── development/        # Developer guides
│   ├── improvements/       # UI/UX improvements
│   ├── releases/          # Release documentation
│   ├── user-guides/       # User troubleshooting
│   └── INDEX.md           # Documentation index
├── examples/              # Sample M3U files
│   └── iptv-org-channels.m3u # IPTV-ORG playlist
├── scripts/               # Build and utility scripts
├── src/                   # Source code
│   ├── js/               # JavaScript files
│   │   ├── main.js       # Alternative main script
│   │   └── script.js     # Main application logic
│   ├── styles/           # Modular CSS
│   │   ├── components.css
│   │   ├── main.css
│   │   └── variables.css
│   ├── index.html        # Main HTML file
│   └── styles.css        # Main stylesheet
├── CHANGELOG.md          # Version history
├── CONTRIBUTING.md       # Contribution guidelines
├── electron-builder.yml  # Build configuration
├── LICENSE               # MIT License
├── main.js               # Electron main process
├── package.json          # Project configuration
├── preload.js            # Electron preload script
└── README.md             # Main documentation
```

## 🔧 Configuration Files

- **package.json**: Project metadata and dependencies
- **electron-builder.yml**: Build configuration for all platforms
- **main.js**: Electron main process entry point
- **preload.js**: Secure bridge between main and renderer processes

## 📚 Documentation Structure

- **docs/INDEX.md**: Master documentation index
- **docs/development/**: Technical guides for developers
- **docs/user-guides/**: End-user troubleshooting and guides
- **docs/releases/**: Release management documentation
- **docs/improvements/**: UI/UX enhancement documentation

## 🚀 GitHub Actions Workflows

1. **build-test.yml**: Continuous integration testing
2. **release-tagged.yml**: Automated releases from version tags
3. **release-branch.yml**: Automated releases from release branches

## 📦 Build Artifacts

- **dist/**: Generated build files (gitignored)
- **examples/**: Sample playlists for testing
- **assets/**: Application icons and resources

## 🧹 Cleaned Up

Removed obsolete files:
- demo-modern.html
- index-modern.html, index-simple.html
- script-modern.js, styles-modern.css
- README-v2.md, IMPLEMENTATION-SUMMARY.md
- Redundant GitHub Actions workflows
- Empty directories and duplicate files

## 📋 Key Features

- Professional dark theme interface
- Real-time loading screens for large files
- IPTV-ORG integration with automatic updates
- Professional modal dialogs
- Comprehensive documentation in English
- Clean, organized codebase structure