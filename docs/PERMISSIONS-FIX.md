# GitHub Actions Permissions Fix

## 🐛 Problem Identified

The auto-release workflow was failing with a **403 Forbidden** error when trying to create GitHub releases:

```
⚠️ GitHub release failed with status: 403
❌ Too many retries. Aborting...
Error: Too many retries.
```

## 🔍 Root Cause

GitHub Actions workflows need explicit permissions to perform certain operations. By default, workflows have limited permissions and cannot create releases without explicit permission grants.

## ✅ Solution Applied

### 1. Added Explicit Permissions

Added the required permissions to the workflow:

```yaml
permissions:
  contents: write  # Required to create releases and tags
  actions: read    # Required to read workflow artifacts
```

### 2. Improved Release Checking

Enhanced the release existence check to use GitHub CLI:

```yaml
- name: Check if release exists
  run: |
    # Check if tag exists locally
    if git tag -l "${{ steps.version.outputs.version }}" | grep -q "${{ steps.version.outputs.version }}"; then
      echo "exists=true" >> $GITHUB_OUTPUT
    else
      # Check if release exists on GitHub
      if gh release view "${{ steps.version.outputs.version }}" >/dev/null 2>&1; then
        echo "exists=true" >> $GITHUB_OUTPUT
      else
        echo "exists=false" >> $GITHUB_OUTPUT
      fi
    fi
  env:
    GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### 3. Created Alternative Simple Workflow

Created `simple-release.yml` as a backup that uses GitHub CLI directly:

```yaml
- name: Create release with GitHub CLI
  run: |
    gh release create "$VERSION" \
      --title "m3u-player $VERSION" \
      --notes "Release notes..." \
      dist/*.AppImage \
      dist/*.deb \
      dist/*.rpm
  env:
    GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### 4. Added Cleanup Tools

Created `scripts/cleanup-release.sh` to clean up failed releases:

```bash
#!/bin/bash
# Deletes failed releases and tags
gh release delete "$VERSION" --yes
git tag -d "$VERSION"
git push origin --delete "$VERSION"
```

## 🎯 Why This Fixes the Issue

### Permission Requirements
- **`contents: write`**: Allows creating/modifying repository content including releases and tags
- **`actions: read`**: Allows reading workflow artifacts for upload to releases

### GitHub Token Scopes
The `GITHUB_TOKEN` automatically provided by GitHub Actions has different scopes depending on the permissions granted:
- **Without explicit permissions**: Limited read-only access
- **With `contents: write`**: Can create releases, tags, and modify repository content

### Best Practices Applied
1. **Minimal permissions**: Only grant what's needed
2. **Explicit permissions**: Don't rely on defaults
3. **Error handling**: Better checking for existing releases
4. **Fallback options**: Alternative workflows if main one fails

## 🧪 Testing Strategy

### 1. Simple Release Test
- Branch: `simple-release/0.1.3`
- Tests: Basic Linux build + release creation
- Purpose: Verify permissions work with minimal complexity

### 2. Full Release Test  
- Branch: `release/0.1.4`
- Tests: All platforms + full release workflow
- Purpose: Verify complete workflow with permissions

## 📊 Expected Results

### Before Fix
```
❌ Build: Success (Windows, macOS, Linux)
❌ Release: Failed (403 Forbidden)
❌ Assets: Not uploaded
```

### After Fix
```
✅ Build: Success (Windows, macOS, Linux)  
✅ Release: Success (with proper permissions)
✅ Assets: Uploaded and organized
```

## 🔗 Monitoring

Track the progress of both test releases:

1. **Simple release**: https://github.com/lcajigasm/m3u-player/actions (simple-release branch)
2. **Full release**: https://github.com/lcajigasm/m3u-player/actions (release/0.1.4 branch)

## 📚 Lessons Learned

### GitHub Actions Security Model
- Permissions are restrictive by default (security first)
- Explicit permissions are required for sensitive operations
- `GITHUB_TOKEN` scope changes based on granted permissions

### Workflow Design
- Always include permission requirements in workflow files
- Test with minimal permissions first, then expand as needed
- Provide fallback mechanisms for critical operations

### Debugging Approach
1. **Identify the exact error**: 403 = permissions issue
2. **Check documentation**: GitHub Actions permissions model
3. **Apply minimal fix**: Add only required permissions
4. **Test incrementally**: Simple case first, then complex
5. **Provide alternatives**: Backup workflows for reliability

## 🚀 Next Steps

1. **Monitor current releases**: Verify both test releases succeed
2. **Clean up test releases**: Remove test versions after verification
3. **Update documentation**: Reflect permission requirements
4. **Consider automation**: Auto-cleanup of failed releases

---

This permissions fix should resolve the 403 errors and enable successful automatic releases! 🎉