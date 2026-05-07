---
name: ask
description: Process-first advisor routing for CodeBuddy, Codex, or Gemini via `omcb ask`, with artifact capture and no raw CLI assembly
---

# Ask

Use OMC's canonical advisor skill to route a prompt through the local CodeBuddy, Codex, or Gemini CLI and persist the result as an ask artifact.

## Usage

```bash
/oh-my-codebuddy:ask <codebuddy|codex|gemini> <question or task>
```

Examples:

```bash
/oh-my-codebuddy:ask codex "review this patch from a security perspective"
/oh-my-codebuddy:ask gemini "suggest UX improvements for this flow"
/oh-my-codebuddy:ask codebuddy "draft an implementation plan for issue #123"
```

## Routing

**Required execution path — always use this command:**

```bash
omcb ask {{ARGUMENTS}}
```

**Do NOT manually construct raw provider CLI commands.** Never run `codex`, `codebuddy`, or `gemini` directly to fulfill this skill. The `omcb ask` wrapper handles correct flag selection, artifact persistence, and provider-version compatibility automatically. Manually assembling provider CLI flags will produce incorrect or outdated invocations.

## Requirements

- The selected local CLI must be installed and authenticated.
- Verify availability with the matching command:

```bash
codebuddy --version
codex --version
gemini --version
```

## Artifacts

`omcb ask` writes artifacts to:

```text
.omc/artifacts/ask/<provider>-<slug>-<timestamp>.md
```

Task: {{ARGUMENTS}}
