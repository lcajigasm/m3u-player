# Changelog

All notable changes to M3U Player will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2024-03-08

### ✨ Features Implemented

#### Core Functionality
- ✅ **Complete M3U/M3U8 player** - Robust parser with metadata support
- ✅ **No CORS limitations** - Plays streams that fail in web browsers
- ✅ **Native HLS support** - Automatic HLS.js integration
- ✅ **Multiple formats** - MP4, WebM, HLS (.m3u8) and more
- ✅ **Auto-type detection** - Automatically identifies stream format

#### User Interface
- ✅ **Modern responsive design** - Works on any window size
- ✅ **Interactive playlist** - Detailed information for each stream
- ✅ **Complete controls** - Play/Pause, Previous/Next, Volume control
- ✅ **Integrated search** - Filter channels by name or group
- ✅ **Visual states** - Loading, error, and playback indicators

#### Advanced Features
- ✅ **Stream diagnostics** - "🔧 Test Stream" button to verify connectivity
- ✅ **Customizable configuration** - HTTP headers, User-Agent, Referer
- ✅ **Export playlists** - Save modified lists in M3U format
- ✅ **Included test files** - To verify functionality
- ✅ **Auto-advance on errors** - Continues to next stream automatically

#### Electron Integration
- ✅ **Native menus** - Complete OS integration
- ✅ **Keyboard shortcuts** - Quick controls (Space, Arrows, etc.)
- ✅ **File dialogs** - Open local M3U files
- ✅ **Persistent configuration** - Saves preferences between sessions
- ✅ **Multi-platform** - Windows, macOS, and Linux

#### Error Handling & Debugging
- ✅ **Robust error handling** - Clear and informative messages
- ✅ **Detailed logging** - Technical information in console
- ✅ **Configurable timeouts** - Prevents blocking on slow streams
- ✅ **Fallback strategies** - Multiple loading methods

### 🔧 Technical Architecture

#### Implemented Stack:
- **Electron 27.0.0** - Desktop application framework
- **HLS.js 1.4.12** - HLS stream playback
- **Electron-Store 8.1.0** - Configuration persistence
- **HTML5 Video API** - Native video playback
- **CSS Grid/Flexbox** - Modern responsive layout

#### Design Patterns:
- **M3UPlayer main class** - Encapsulates all functionality
- **Event-driven architecture** - Asynchronous event handling
- **Promise-based loading** - Async loading with error handling
- **Modular CSS** - Organized and maintainable styles

### 📁 Main Files Created:

```
m3u-player/
├── src/
│   ├── index.html           # Main UI (200+ lines)
│   ├── js/main.js          # Core application logic (1000+ lines)
│   └── styles/main.css     # Complete responsive styles (800+ lines)
├── main.js                 # Electron main process (300+ lines)
├── preload.js              # Secure preload script (100+ lines)
├── examples/               # Test files directory
├── docs/                   # Complete documentation
└── scripts/                # Build and utility scripts
```

### 🧪 Testing & Quality Assurance

#### Included test files:
- `examples/basic-test.m3u` - Guaranteed MP4 videos (Google Cloud Storage)
- `examples/test-streams.m3u` - HLS test streams (Apple, Bitdash)
- `examples/sample.m3u` - Additional examples from different sources

#### Debugging features:
- Detailed console logging with emojis
- Stream connectivity test button per stream
- Technical information in modals
- Error handling with auto-recovery

### 🚀 Deployment & Distribution

#### Available scripts:
- `npm start` - Start application in normal mode
- `npm run dev` - Development mode with DevTools
- `npm run build` - Build for all platforms
- `npm run pack` - Package without installer
- `npm run dist` - Create complete distribution

#### Supported platforms:
- **macOS** - .dmg and .app (Intel + Apple Silicon)
- **Windows** - .exe and NSIS installer (x64 + x86)
- **Linux** - AppImage (x64)

### 📚 Complete Documentation:

- `README.md` - User guide and installation
- `docs/DEBUG.md` - Detailed debugging guide
- `docs/TROUBLESHOOTING.md` - Technical problem solving
- `CHANGELOG.md` - This changelog file
- `CONTRIBUTING.md` - Contribution guidelines
- `LICENSE` - MIT license

## [1.1.0] - 2024-03-08 - Player Improvements

### ✨ New Features:

#### Enhanced Player
- ✅ **Picture-in-Picture** - Complete functionality with support detection
- ✅ **Fullscreen mode** - Immersive mode with keyboard shortcuts
- ✅ **Advanced video controls** - Real-time brightness, contrast, and saturation
- ✅ **Time indicator** - Shows current time and total duration
- ✅ **Reset button** - Restores video filters to default values

#### Visual Improvements
- ✅ **Clearer player** - Removed initial dark filter
- ✅ **More visible controls** - Improved background and contrast
- ✅ **Custom sliders** - Modern design with hover effects
- ✅ **Button states** - Visual indicators for play/pause/loading
- ✅ **Improved responsive design** - Better mobile experience

#### Technical Features
- ✅ **Auto-reset filters** - Reset when loading new stream
- ✅ **Extended keyboard shortcuts** - P (PiP), F (Fullscreen), +/- (Brightness)
- ✅ **State management** - Better visual feedback during loading
- ✅ **Improved logging** - Detailed information for all actions

### 🔧 Bug Fixes:
- ❌ **Very dark video** - Fixed by removing initial filters
- ❌ **Controls not visible** - Improved contrast and background
- ❌ **Persistent filters** - Now reset automatically
- ❌ **Inconsistent states** - Better UI synchronization

## [1.2.0] - 2024-03-08 - Search & Interface Improvements

### ✨ Enhanced Search Interface:

#### Advanced Search
- ✅ **Improved search field** with icon and clear button
- ✅ **Real-time search** by name, group, or type
- ✅ **Smart placeholder** that appears/disappears based on content
- ✅ **Clear button** appears only when there's text

#### Smart Filters
- ✅ **Group filter** - Dropdown with all available groups
- ✅ **Type filter** - HLS, Direct, Stream
- ✅ **Sort button** - Toggles between A-Z and Z-A
- ✅ **Combinable filters** - All filters work together

#### Enhanced Information
- ✅ **Channel counter** - "X of Y channels" when filters are active
- ✅ **Informative tooltips** on all elements
- ✅ **Channel IDs** shown when available
- ✅ **No results message** when no matches found

#### Visual Design Improvements
- ✅ **Larger logos** (48x48px) with hover effects
- ✅ **Improved placeholders** with dark gradients
- ✅ **Staggered entry animations**
- ✅ **Clear visual states** (hover, active, hidden)
- ✅ **Side borders** that light up on hover

### 🚀 Performance Optimizations:

#### Instant Search
- ✅ **Debouncing of 150ms** to prevent excessive searches
- ✅ **Memory filtering** instead of DOM manipulation
- ✅ **Batch rendering** using `requestAnimationFrame`
- ✅ **DocumentFragment** for efficient insertion
- ✅ **Pending search cancellation** when clearing

#### Optimized Rendering
- ✅ **Batch rendering** of 50 elements to avoid UI blocking
- ✅ **Function reuse** (`createPlaylistItem`)
- ✅ **Optimized event listeners** with direct references
- ✅ **Background logo preloading**

#### Centered Search Controls
- ✅ **Centered layout** with max-width of 1000px
- ✅ **Horizontally aligned filters** and centered
- ✅ **Consistent spacing** between elements
- ✅ **Improved responsive design** for mobile

### 🎯 Project Status: **COMPLETE** ✅

M3U Player is fully functional and ready for production use. It includes all planned features, complete documentation, and is prepared for multi-platform distribution.

---

## Upcoming Features (Roadmap)

### 🔮 Planned for v1.3.0:
- [ ] **Favorites system** - Mark and organize favorite channels
- [ ] **Recently played** - Quick access to recent channels
- [ ] **Custom themes** - User-selectable color schemes
- [ ] **Playlist management** - Create and edit playlists within the app
- [ ] **Stream recording** - Record streams to local files

### 🔮 Planned for v1.4.0:
- [ ] **EPG support** - Electronic Program Guide integration
- [ ] **Subtitles support** - External subtitle file loading
- [ ] **Multi-language** - Interface localization
- [ ] **Plugin system** - Extensible architecture for custom features
- [ ] **Cloud sync** - Sync settings and favorites across devices

---

For detailed technical information about any release, see the documentation in the `docs/` folder.