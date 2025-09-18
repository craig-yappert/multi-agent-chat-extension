# Release Documentation

This directory contains release notes and version history for the Multi Agent Chat extension.

## Contents

### Version History
- **[changelog.md](./changelog.md)** - Complete changelog with all version updates

### Recent Releases
- **[RELEASE_NOTES_v171.md](./RELEASE_NOTES_v171.md)** - Version 1.7.1 (Latest)
- **[RELEASE_NOTES_v170.md](./RELEASE_NOTES_v170.md)** - Version 1.7.0

## Version Naming Convention

We follow semantic versioning (MAJOR.MINOR.PATCH):
- **MAJOR**: Breaking changes or significant architecture updates
- **MINOR**: New features, non-breaking improvements
- **PATCH**: Bug fixes, performance improvements

## Release Highlights

### v1.7.1 (Current)
- Enhanced MCP server stability
- Performance optimizations
- Bug fixes

### v1.7.0
- MCP WebSocket provider implementation
- Ultra-fast mode configuration
- Enhanced provider routing

### Earlier Versions
See [changelog.md](./changelog.md) for complete history

## Release Process

1. **Pre-Release**
   - Update version in package.json
   - Run full test suite
   - Test MCP server integration
   - Update changelog

2. **Release Build**
   - `npm run vscode:prepublish`
   - `npx vsce package`
   - Test VSIX installation

3. **Documentation**
   - Create release notes
   - Update README if needed
   - Tag release in git

4. **Distribution**
   - Upload to VS Code Marketplace
   - Create GitHub release
   - Announce to users

## Adding Release Notes

When creating new release notes:
1. Use format: `RELEASE_NOTES_vXYZ.md`
2. Include:
   - Version number and date
   - New features
   - Improvements
   - Bug fixes
   - Breaking changes (if any)
   - Migration guide (if needed)
3. Update this README
4. Update main changelog