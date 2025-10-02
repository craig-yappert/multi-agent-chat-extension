# Custom Agent Prompts

This folder allows you to add **project-specific instructions** to agents using Markdown files.

## How It Works

Each agent gets:
1. **System Prompt** (from `agents.json`) - Core role and behavior
2. **+** **Custom Prompt** (from this folder) - Your project-specific instructions
3. **=** Final context with both!

## Usage

Create a file named `<agent-id>.md` in this folder:

- `architect.md` - Architecture and design standards
- `coder.md` - Coding standards and patterns
- `executor.md` - Execution and deployment procedures
- `reviewer.md` - Review criteria and quality standards
- `documenter.md` - Documentation style and requirements
- `coordinator.md` - Project workflow and delegation rules
- `team.md` - Team collaboration guidelines

## Example: `coder.md`

```markdown
# Project Coding Standards

## TypeScript Requirements
- Always use strict mode
- Prefer `interface` over `type` for object shapes
- Use explicit return types on public functions

## Testing
- Write Jest tests for all new functions
- Aim for 80%+ code coverage

## Style Guide
- Follow the project's ESLint config
- Max line length: 100 characters
- Use meaningful variable names
```

## Benefits

✅ **Richer formatting** - Headers, lists, code blocks, emphasis
✅ **No JSON escaping** - Write natural text without `\n` and `\"`
✅ **Git-friendly** - Easy to track changes and collaborate
✅ **Layered approach** - General behavior + project customization
✅ **Optional** - Only add files for agents you want to customize

## Tips

- Keep prompts focused and actionable
- Use headers to organize sections
- Include examples when helpful
- Update as your project evolves
- Commit to git to share with team
