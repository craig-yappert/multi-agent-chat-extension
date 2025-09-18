# Development Documentation

This directory contains documentation for developers working on the Multi Agent Chat extension.

## Contents

### Development Guidelines
- **[CLAUDE.md](./CLAUDE.md)** - Instructions and guidelines for Claude Code when working with this codebase

### Development Planning
- **[SESSION_CONTEXT.md](./SESSION_CONTEXT.md)** - Current development context and implementation status
- **[TODO_NEXT_SESSION.md](./TODO_NEXT_SESSION.md)** - Roadmap and tasks for upcoming development sessions

## Development Topics

### Build & Debug
- TypeScript compilation: `npm run compile`
- Watch mode: `npm run watch`
- Debug in VS Code: Press F5
- Package extension: `npx vsce package`

### Code Organization
```
src/
├── agents.ts           # Agent configurations
├── providers.ts        # Provider system
├── providers/          # Provider implementations
├── mcp-server/        # MCP server code
├── ui.ts              # Webview UI
└── extension.ts       # Extension entry point
```

### Testing
- Run tests: `npm test`
- Lint code: `npm run lint`
- Manual testing in Extension Development Host

### Contributing Guidelines
1. Follow existing code patterns
2. Maintain TypeScript strict mode compliance
3. Update relevant documentation
4. Test with MCP server before submitting
5. Consider performance impact of changes

## Development Workflow

1. **Setup Environment**
   - Clone repository
   - Run `npm install`
   - Configure MCP server (optional)

2. **Make Changes**
   - Create feature branch
   - Implement changes
   - Update tests and docs

3. **Test**
   - Run automated tests
   - Test in Extension Development Host
   - Validate MCP integration

4. **Package**
   - Build VSIX package
   - Test installation
   - Document any new settings

## Adding New Documentation

Place development-related docs here:
- API changes
- Development workflows
- Debugging guides
- Architecture decisions