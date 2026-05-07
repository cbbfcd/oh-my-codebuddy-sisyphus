---
name: build-fix
description: Auto-detect and fix build errors in a loop until the build passes or max attempts reached
aliases: [fix-build]
level: 3
---

# Build-Fix Skill

Detect build errors and fix them automatically in a loop. Stops when the build passes or after a configurable max number of attempts.

## Trigger Keywords

- "build-fix", "fix build", "修复构建", "fix build errors", "build is broken"

## Protocol

### 1. Detect Build Command

Infer the build command from the project:

| Signal | Command |
|--------|---------|
| `package.json` with `build` script | `npm run build` |
| `Makefile` | `make` |
| `Cargo.toml` | `cargo build` |
| `pyproject.toml` / `setup.py` | `python -m build` or `pip install -e .` |
| `go.mod` | `go build ./...` |
| Explicit user instruction | Use as-is |

If ambiguous, ask the user once before starting.

### 2. Run Build

```bash
<build_command> 2>&1 | tee /tmp/build-output.txt
```

Capture stdout + stderr.

### 3. Evaluate Output

- **Build passed** (exit code 0, no errors): report success and stop.
- **Build failed**: extract error lines and proceed to fix.

### 4. Fix Loop

For each failure:

1. Parse error messages — identify file, line, error type
2. Delegate fix to the appropriate agent:
   - TypeScript/JS type errors → `executor` (sonnet)
   - Missing dependencies → `dependency-expert` (lite)
   - Compilation/linking errors → `build-fixer` (lite)
   - Unknown → `debugger` (sonnet)
3. Apply the fix
4. Re-run build
5. Repeat until pass or `MAX_ATTEMPTS` reached (default: 5)

### 5. Stop Conditions

| Condition | Action |
|-----------|--------|
| Build passes | Report success, list fixes applied |
| `MAX_ATTEMPTS` exceeded | Report failure, show remaining errors, ask user |
| Circular dependency detected | Stop, report, ask user |
| Same error repeats 2x | Stop, report — agent is stuck |

## Output Format

After each fix attempt:

```
Attempt N/5: [error summary]
→ Fix: [one-line description of change]
→ Result: PASS / FAIL (N errors remaining)
```

Final summary:

```
Build fixed in N attempts.
Changes: [list of files modified]
```

or:

```
Build still failing after N attempts.
Remaining errors:
- [error 1]
- [error 2]
```

## Configuration

Set via environment or inline:

| Variable | Default | Description |
|----------|---------|-------------|
| `BUILD_FIX_MAX_ATTEMPTS` | `5` | Max fix iterations |
| `BUILD_FIX_CMD` | auto-detect | Override build command |
| `BUILD_FIX_VERBOSE` | `false` | Show full build output |

## Example

```
/build-fix
```

or:

```
The TypeScript build is failing. Fix it.
```
