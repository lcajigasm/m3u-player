# Contributing to M3U Player

Thank you for your interest in contributing to M3U Player! This document provides guidelines and information for contributors.

## 🤝 How to Contribute

### Reporting Issues
1. **Search existing issues** first to avoid duplicates
2. **Use the issue template** when creating new issues
3. **Provide detailed information**:
   - Operating system and version
   - Electron/Node.js version
   - Steps to reproduce the issue
   - Expected vs actual behavior
   - Console logs (if applicable)

### Suggesting Features
1. **Check the roadmap** to see if it's already planned
2. **Open a feature request** with detailed description
3. **Explain the use case** and why it would be valuable
4. **Consider implementation complexity**

### Code Contributions

#### Prerequisites
- Node.js 16 or higher
- npm or yarn
- Git
- Basic knowledge of JavaScript, HTML, CSS
- Familiarity with Electron (for desktop features)

#### Development Setup
```bash
# Fork and clone the repository
git clone https://github.com/yourusername/m3u-player.git
cd m3u-player

# Install dependencies
npm install

# Start development mode
npm run dev
```

#### Code Style Guidelines

**JavaScript:**
- Use ES6+ features
- Prefer `const` and `let` over `var`
- Use meaningful variable and function names
- Add comments for complex logic
- Follow existing code patterns

**CSS:**
- Use the existing dark theme color palette
- Follow BEM methodology when possible
- Use CSS custom properties for theming
- Ensure responsive design
- Test on different screen sizes

**HTML:**
- Use semantic HTML elements
- Ensure accessibility (ARIA labels, etc.)
- Keep structure clean and organized

#### Commit Guidelines
- Use conventional commit format: `type(scope): description`
- Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`
- Keep commits atomic and focused
- Write clear commit messages

Examples:
```
feat(player): add picture-in-picture support
fix(search): resolve debouncing issue with filters
docs(readme): update installation instructions
```

#### Pull Request Process

1. **Create a feature branch**:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**:
   - Follow the code style guidelines
   - Add tests if applicable
   - Update documentation if needed

3. **Test your changes**:
   ```bash
   npm run dev
   # Test the functionality thoroughly
   ```

4. **Commit your changes**:
   ```bash
   git add .
   git commit -m "feat(scope): your feature description"
   ```

5. **Push and create PR**:
   ```bash
   git push origin feature/your-feature-name
   ```
   Then create a Pull Request on GitHub

6. **PR Requirements**:
   - Clear title and description
   - Reference related issues
   - Include screenshots/videos for UI changes
   - Ensure all checks pass

## 🏗️ Project Architecture

### File Structure
```
src/
├── index.html          # Main HTML structure
├── js/
│   └── main.js         # Core application logic
└── styles/
    └── main.css        # Styling and themes
```

### Key Components
- **M3UPlayer class**: Main application controller
- **Playlist management**: Parsing and rendering M3U files
- **Video player**: HLS.js integration and native video controls
- **Search system**: Real-time filtering and sorting
- **Electron integration**: Desktop-specific features

### Design Principles
- **Performance first**: Optimize for large playlists
- **User experience**: Intuitive and responsive interface
- **Accessibility**: Support for screen readers and keyboard navigation
- **Cross-platform**: Works on Windows, macOS, and Linux

## 🧪 Testing

### Manual Testing
- Test with various M3U file formats
- Verify functionality on different operating systems
- Test with different stream types (HLS, direct, etc.)
- Ensure responsive design works on different screen sizes

### Test Files
Use the provided test files in `examples/`:
- `basic-test.m3u`: Basic functionality test
- `test-streams.m3u`: HLS and streaming test
- `sample.m3u`: Additional format testing

### Performance Testing
- Test with large playlists (1000+ items)
- Monitor memory usage during playback
- Verify search performance with large datasets

## 📝 Documentation

### Code Documentation
- Add JSDoc comments for functions and classes
- Document complex algorithms and business logic
- Keep README.md updated with new features

### User Documentation
- Update user guides for new features
- Add troubleshooting information for common issues
- Include screenshots for UI changes

## 🎨 Design Guidelines

### Color Palette
The application uses a dark theme with these primary colors:
- **Background**: `#0f172a` to `#334155` (gradient)
- **Primary**: `#3b82f6` (blue)
- **Secondary**: `#0d9488` (teal)
- **Accent**: `#c2410c` (orange)
- **Text**: `#f1f5f9` (light gray)

### UI Principles
- **Consistency**: Use established patterns and components
- **Clarity**: Clear visual hierarchy and readable text
- **Efficiency**: Minimize clicks and cognitive load
- **Feedback**: Provide clear feedback for user actions

## 🚀 Release Process

### Version Numbering
We follow [Semantic Versioning](https://semver.org/):
- **MAJOR**: Breaking changes
- **MINOR**: New features (backward compatible)
- **PATCH**: Bug fixes (backward compatible)

### Release Checklist
- [ ] Update version in `package.json`
- [ ] Update `CHANGELOG.md`
- [ ] Test on all supported platforms
- [ ] Create release notes
- [ ] Tag the release
- [ ] Build and publish distributables

## 🛡️ Security

### Reporting Security Issues
- **Do not** create public issues for security vulnerabilities
- Email security concerns to: security@m3uplayer.com
- Include detailed information about the vulnerability
- Allow time for investigation before public disclosure

### Security Guidelines
- Validate all user inputs
- Sanitize URLs and file paths
- Use HTTPS for external requests
- Follow Electron security best practices

## 📞 Getting Help

### Community
- **GitHub Discussions**: For questions and general discussion
- **GitHub Issues**: For bug reports and feature requests
- **Documentation**: Check the `docs/` folder first

### Maintainers
- Review PRs and issues regularly
- Provide constructive feedback
- Help newcomers get started
- Maintain code quality standards

## 📄 License

By contributing to M3U Player, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to M3U Player! Your help makes this project better for everyone. 🎉