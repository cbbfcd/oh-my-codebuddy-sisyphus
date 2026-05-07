---
name: setup
description: Use first for install/update routing — sends setup, doctor, or MCP requests to the correct OMC setup flow
level: 2
---

# Setup

Use `/oh-my-codebuddy:setup` as the unified setup/configuration entrypoint.

## Usage

```bash
/oh-my-codebuddy:setup                # full setup wizard
/oh-my-codebuddy:setup doctor         # installation diagnostics
/oh-my-codebuddy:setup mcp            # MCP server configuration
/oh-my-codebuddy:setup wizard --local # explicit wizard path
```

## Routing

Process the request by the **first argument only** so install/setup questions land on the right flow immediately:

- No argument, `wizard`, `local`, `global`, or `--force` -> route to `/oh-my-codebuddy:omc-setup` with the same remaining args
- `doctor` -> route to `/oh-my-codebuddy:omc-doctor` with everything after the `doctor` token
- `mcp` -> route to `/oh-my-codebuddy:mcp-setup` with everything after the `mcp` token

Examples:

```bash
/oh-my-codebuddy:setup --local          # => /oh-my-codebuddy:omc-setup --local
/oh-my-codebuddy:setup doctor --json    # => /oh-my-codebuddy:omc-doctor --json
/oh-my-codebuddy:setup mcp github       # => /oh-my-codebuddy:mcp-setup github
```

## Notes

- `/oh-my-codebuddy:omc-setup`, `/oh-my-codebuddy:omc-doctor`, and `/oh-my-codebuddy:mcp-setup` remain valid compatibility entrypoints.
- Prefer `/oh-my-codebuddy:setup` in new documentation and user guidance.

Task: {{ARGUMENTS}}
