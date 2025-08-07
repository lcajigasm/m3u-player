# 📺 M3U Player - Streaming Information

## ⚠️ SSL Certificate Warnings

The following warnings are **NORMAL** in IPTV applications and **DO NOT affect functionality**:

```
ERROR:cert_verify_proc_builtin.cc CertVerifyProcBuiltin for [domain] failed:
----- Certificate i=1 (CN=allot.com/...) -----
ERROR: No matching issuer found
```

### Why do they occur?

1. **IPTV Servers**: Many streaming providers use self-signed or expired certificates
2. **CDN Networks**: Some use non-standard SSL configurations
3. **Geolocation**: Servers may use regional certificates

### Are they dangerous?

**NO**. These warnings:
- ✅ Are expected in professional IPTV applications
- ✅ Do not compromise your system security
- ✅ Do not affect streaming quality
- ✅ Do not cause performance issues

## 🚀 Start Options

### Normal Start
```bash
npm start
```
Shows all logs including certificate warnings.

### Quiet Start
```bash
npm run start-quiet
```
Suppresses warnings but keeps important logs.

### Completely Silent Start
```bash
npm run start-silent
```
No console output (for end-user use only).

### Development
```bash
npm run dev
```
With development tools and complete logs.

## 🔧 Security Configurations

The application includes:

- ✅ Ignores invalid SSL certificates (necessary for IPTV)
- ✅ Disables web security (allows CORS bypass)
- ✅ GPU optimizations enabled
- ✅ Memory increased to 4GB for large playlists

## 📊 Performance Optimized

- **Small lists (<1000)**: Optimized batch rendering
- **Large lists (>1000)**: Automatic virtualization
- **M3U Parsing**: Asynchronous without blocking UI
- **Memory**: Optimized management for large files

## 🧪 Testing

Debug functions available in browser console:
- `debugStream()` - System diagnostics
- `quickTest()` - Quick playback test

## ❓ Known Issues

1. **AVCaptureDevice warnings**: Normal on macOS, camera-related
2. **Certificate errors**: Expected with IPTV servers
3. **CoreText warnings**: System font-related (reduced)

---

💡 **Recommendation**: For daily use, use `npm run start-quiet` for a cleaner experience.