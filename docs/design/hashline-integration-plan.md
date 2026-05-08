# Hashline Integration Plan

> Status: design draft  
> Date: 2026-05-08  
> Scope: integrate hashline-style, hash-anchored file editing into oh-my-codebuddy (OMC) for CodeBuddy Code.

## Executive Summary

Hashline is worth integrating into OMC, but it should be introduced as an opt-in OMC toolchain first, not as an unconditional replacement for CodeBuddy Code's native file tools.

The evidence supports the core benefit: hashline moves file editing from exact old-text reproduction to line-anchor addressing. Can Boluk's benchmark changed only the edit harness, not the model, and reported that hashline matched or beat replace-style editing for most tested models, with weak models gaining the most: Grok Code Fast 1 improved from 6.7% to 68.3%, MiniMax more than doubled, and Grok 4 Fast used 61% fewer output tokens because retry loops dropped. Source: [The Harness Problem](https://blog.can.ac/2026/02/12/the-harness-problem/).

The right OMC design is:

- Port the upstream hashline semantics and tests from `oh-my-pi`, including stale-anchor recovery and metadata-stripping safety fixes.
- Expose `hashline_read`, `hashline_grep`, and `hashline_edit` through both OMC MCP registration paths: the SDK/in-process server and the standalone bridge used by `.mcp.json`.
- Add a staged `--edit-mode=builtin|both|hashline` launch mode.
- Default to `builtin` until OMC-specific benchmarks prove that hashline improves edit success without unacceptable token or workflow regressions. `both` and `hashline` remain explicit opt-in modes during rollout.

Do not implement a simplified "two-character hash" from scratch. Upstream hashline has important operational details: token-aware bigram anchors, stale-anchor rebase, rich mismatch errors, truncation-marker stripping, nested-anchor stripping, and multi-section preflight.

## Evidence Base

### CodeBuddy Code Capabilities

CodeBuddy Code documents MCP as the supported extension surface for external tools and data sources. MCP servers can provide tools, resources, and prompts, and CodeBuddy supports STDIO/SSE/HTTP transports, project/user/local scopes, and tool permission rules. Source: [CodeBuddy MCP documentation](https://www.codebuddy.ai/docs/zh/cli/mcp).

CodeBuddy CLI also supports tool gating at launch:

- `--allowedTools <tools...>`
- `--disallowedTools <tools...>`
- `--mcp-config <fileOrString>`
- `--strict-mcp-config`

Source: [CodeBuddy CLI reference](https://www.codebuddy.ai/docs/zh/cli/reference).

This makes a hashline MCP integration technically aligned with CodeBuddy's documented extension model.

### OMC Current Integration Points

OMC already exposes custom tools through an in-process MCP server named `t`. `src/mcp/omc-tools-server.ts` aggregates tool arrays, assigns categories, filters disabled categories with `OMC_DISABLE_TOOLS`, converts enabled tools to SDK tools, and exposes names as `mcp__t__<tool_name>`.

OMC also exposes tools through a standalone MCP bridge. The repository `.mcp.json` points CodeBuddy at `bridge/mcp-server.cjs`, and `src/mcp/tool-registry.ts` is the standalone server's tool aggregation path. A complete integration must update both paths.

Relevant current behavior:

- `allTools` is the central aggregation point for MCP tools.
- `DISABLE_TOOLS_GROUP_MAP` maps environment names to tool categories.
- `getOmcToolNames()` returns MCP-formatted tool names for allowed-tool configuration.

Therefore hashline should be added as a first-class OMC tool category rather than a separate sidecar MCP server for the MVP.

`src/cli/launch.ts` is the correct place for a user-facing `--edit-mode` flag because it already extracts OMC-specific launch flags before forwarding remaining args to CodeBuddy. `src/team/worker-bootstrap.ts` is the correct place for team-worker-specific guidance because it already injects per-agent-type instructions into worker overlays.

### Upstream Hashline Implementation Details

The current `oh-my-pi` implementation is more than a short content hash.

`packages/coding-agent/src/edit/line-hash.ts` defines 647 two-letter bigrams chosen because they tokenize as single tokens in modern BPE vocabularies. It formats anchors as `LINE+ID|TEXT`, for example `42sr|function hi() {`, not the older blog illustration `42:f1|...`. It also uses structural ordinal suffixes (`1st`, `2nd`, `3rd`, `th`) for brace-only lines to reduce anchor token cost.

The same file documents the default edit payload separator `~`, selected after a separator benchmark. In that benchmark, `~` had the highest edit-tool success rate (94.9%) and lowest patch-failure rate (5.6%) among tested separators.

`packages/coding-agent/src/edit/modes/hashline.ts` includes:

- `ANCHOR_REBASE_WINDOW = 5`
- `READ_TRUNCATION_NOTICE_RE`
- recursive hashline-prefix stripping
- `HashlineMismatchError`
- `tryRebaseAnchor`
- multi-section `preflightHashlineSection`
- `executeHashlineSingle`
- `mergeSamePathSections`

These details should be treated as part of the feature, not as optional polish.

### Upstream Operational Lessons

`oh-my-pi` issue #158 documents an agent loop caused by stale line IDs after edits. The maintainer notes that the edit system intentionally rejects stale tags and returns corrected refs so the agent can recover without necessarily re-reading. Source: [oh-my-pi issue #158](https://github.com/can1357/oh-my-pi/issues/158).

`oh-my-pi` PR #715 fixes a silent corruption bug where read metadata, line anchors, and truncation markers could leak into edited file content. The fix adds truncation-marker detection, recursive stripping of nested anchors, and tests for these cases. Source: [oh-my-pi PR #715](https://github.com/can1357/oh-my-pi/pull/715).

These two cases are directly relevant to OMC because OMC is optimized for long-running, multi-agent workflows where stale context and repeated edits are common.

### Industry Context

The broader editing-system evidence points in the same direction:

- The Anthropic Claude Code feature request for hash-based line addressing lists common `str_replace` failures: CRLF/LF mismatch, reformatting, tab-indented files, stale files, and backslash escapes. It also warns that MCP workarounds create a "two tools" problem when the model is not consistently instructed to prefer the MCP tool. Source: [Claude Code issue #25775](https://github.com/anthropics/claude-code/issues/25775).
- Aider documents multiple edit formats and says different models work better or worse with different formats. Source: [Aider edit formats](https://aider.chat/docs/more/edit-formats.html).
- Cursor trained a separate apply model because file editing itself is a distinct bottleneck, and its public writeup says full-file rewrites outperformed diff-style edits for files under 400 lines in their setting. Source: [Cursor Instant Apply](https://cursor.com/blog/instant-apply).

The conclusion is not "hashline is universally best." The defensible conclusion is narrower: edit format and tool feedback strongly affect coding-agent reliability, so OMC should expose a model-agnostic, measurable hash-anchored editing path and roll it out based on local evidence.

## Review of the Previous Assessment

This section reviews the previous evaluation and corrects claims that were too broad or insufficiently grounded.

### Confirmed

The recommendation to integrate hashline as an OMC-native capability is well supported.

Evidence:

- Can Boluk's benchmark isolates the harness variable.
- CodeBuddy supports MCP and tool gating.
- OMC already has an in-process MCP tool server.
- OMC's long-running multi-agent workflows are exactly where stale context, retries, and edit-format failures accumulate.

### Confirmed With Stronger Constraint

The previous assessment correctly argued against a simple `str_replace` wrapper or naive patch format. It also correctly identified stale-anchor recovery and PR #715's corruption fix as mandatory.

However, the implementation recommendation should be stricter: port upstream semantics and test cases, not just the public concept.

Required upstream behaviors:

- `LINE+ID|TEXT` anchor format.
- `~` payload separator.
- Parse and validate `@PATH` multi-section inputs.
- Reject stale anchors with updated hashline context.
- Attempt only unique, local anchor rebase within a bounded window.
- Strip read-output anchors and truncation notices defensively.
- Preflight multi-section edits before writing any file.

### Correction: Do Not Claim General Whitespace-Insensitive Hashing

Some public discussions describe hashline as "whitespace-insensitive." That is too broad for the current `oh-my-pi` implementation.

The current `computeLineHash` removes carriage returns and trailing whitespace with `trimEnd()`, but it does not ignore leading indentation for normal content lines. Structural brace-only lines receive special handling, but general tab-vs-space indentation changes will normally change the hash.

Accurate statement:

Hashline avoids requiring the model to reproduce old whitespace in the edit request. It does not guarantee that anchors survive every formatter-induced whitespace change. If a formatter changes the anchored line, the edit should reject safely and return updated context.

### Correction: Do Not Copy Bun-Specific Code Unchanged

`oh-my-pi` uses `Bun.hash.xxHash32`. OMC's `package.json` declares Node.js `>=20.0.0` and has no Bun runtime dependency. Therefore a direct copy of `line-hash.ts` would not run unchanged.

Implementation must preserve upstream semantics while adapting runtime dependencies:

- Preferred: implement a small, deterministic TypeScript `xxHash32` helper with tests against known vectors.
- Alternative: add an npm xxHash dependency only after explicit approval, because OMC project rules discourage new dependencies without approval.

### Correction: Tool Gating Should Be Mode-Specific

The previous assessment proposed making `hashline_read` and `hashline_grep` the only visible read path when hashline is enabled. The evidence supports this only for a strict editing mode, not for all sessions.

Reason:

- Claude Code issue #25775 correctly warns about the two-tools problem.
- CodeBuddy's native `Read`, `Grep`, `Edit`, and `Write` may still be useful for non-editing workflows and broader file types.
- OMC should avoid reducing the default tool surface before measuring impact.

Revised position:

- `builtin`: no hashline guidance and native tools remain primary.
- `both`: expose hashline tools and guidance, but do not disable native tools. This is opt-in until benchmark data says otherwise.
- `hashline`: strict mode for edit-heavy workers or benchmark runs; disallow native `Read`, `Grep`, `Edit`, and `Write` only if hashline equivalents are available for the task.

### Correction: Benchmark Metrics Must Be Split

The earlier acceptance threshold mixed task success and edit-tool success. That is not scientifically clean.

Required metrics:

- `edit_tool_success`: did the edit tool parse, validate, and write as intended?
- `task_success`: did the final code solve the task?
- `retry_count`: how often did the model need another edit attempt?
- `output_tokens`: did anchors and guidance increase or reduce total output cost?
- `mismatch_recovery_rate`: after stale anchor rejection, did the next attempt succeed?
- `silent_corruption_count`: did anchors, truncation notices, or metadata reach disk?

Hashline should not graduate to default mode unless task success is non-regressive and edit-tool behavior materially improves.

## Design Goals

1. Improve edit reliability for OMC's multi-agent and long-running workflows.
2. Keep the initial diff small and reversible.
3. Avoid new dependencies unless benchmark or implementation evidence justifies them.
4. Preserve CodeBuddy's native workflow by default.
5. Make rollout measurable with OMC-specific data.
6. Treat upstream safety lessons as required behavior.

## Non-Goals

- Do not replace CodeBuddy Code's built-in `Edit` globally in the first release.
- Do not intercept or rewrite CodeBuddy native `Read` output through hooks; CodeBuddy hook docs do not establish a safe contract for mutating model-visible tool results.
- Do not implement LSP formatting-on-write in the first slice.
- Do not support binary, notebook, image, archive, or document formats in hashline tools initially.
- Do not claim hashline will eliminate all whitespace-related failures; it primarily removes old-text reproduction and makes stale content explicit.

## Proposed Architecture

### Tool Surface

Add `src/tools/hashline-tools.ts` with three tools.

#### `hashline_read`

Reads a UTF-8 text file and returns hashline-prefixed content.

Input:

```json
{
  "path": "src/example.ts",
  "offset": 1,
  "limit": 200
}
```

Output format:

```text
1sr|export function hello() {
2th|  return "world";
3th|}
```

Rules:

- Use `LINE+ID|TEXT`.
- `offset` is 1-indexed.
- Preserve line content exactly except for display prefix.
- Reject unsupported/binary files.
- Include truncation notices in a format recognized by the edit-side stripper.

#### `hashline_grep`

Searches text files and returns matching lines with hashline anchors.

Input:

```json
{
  "pattern": "function hello",
  "path": "src",
  "context": 2
}
```

Implementation options:

- Use the existing internal search patterns if available.
- Otherwise invoke `rg` through a safe helper only after validating paths and arguments.

The first implementation can be conservative: exact regex search with line anchors is sufficient for edit targeting.

#### `hashline_edit`

Applies a compact, line-anchored patch.

Input:

```json
{
  "input": "@src/example.ts\n= 2th\n~  return \"hello\";"
}
```

Required DSL:

```text
@PATH
+ ANCHOR
~inserted line
< ANCHOR
~inserted line
= A..B
~replacement line
- A..B
```

Rules:

- Every inserted or replacement payload line starts with `~`.
- `@PATH` is required for every file section.
- Multiple `@PATH` sections are allowed.
- Same-path sections are merged before application.
- Multi-section edits must preflight all sections before writing any file.
- On mismatch, return updated hashline context and do not write.
- Preserve BOM and original line ending style where possible.
- Strip hashline prefixes and truncation notices from payloads defensively.
- Reuse OMC's path restriction policy. In strict security mode, `@PATH` must resolve inside the project/worktree root and symlink escape must be rejected.
- Prefer atomic writes so failed writes do not leave partial files.

### Internal Modules

Suggested structure:

```text
src/tools/hashline/
|-- line-hash.ts
|-- parser.ts
|-- apply.ts
|-- format.ts
|-- errors.ts
`-- index.ts

src/tools/hashline-tools.ts
src/__tests__/hashline-tools.test.ts
src/__tests__/hashline-core.test.ts
```

The split keeps the public MCP tool wrappers small and makes core behavior unit-testable.

### Runtime Adaptation From `oh-my-pi`

Port the semantics, not the runtime assumptions:

- Replace `Bun.hash.xxHash32` with Node-compatible deterministic hashing.
- Replace Bun file APIs with Node `fs/promises`.
- Keep anchor grammar and payload separator behavior aligned with upstream.
- Include attribution and license notes if upstream code is copied or substantially adapted.

## OMC Integration Points

### Tool Registry

Update `src/tools/index.ts`:

- Export `hashlineTools`.
- Add them to `allCustomTools` if SDK consumers should see them outside MCP.

Update `src/constants/names.ts`:

- Add `TOOL_CATEGORIES.HASHLINE = "hashline"`.

Update `src/mcp/omc-tools-server.ts`:

- Import `hashlineTools`.
- Add `hashline` to `DISABLE_TOOLS_GROUP_MAP`.
- Add `...tagCategory(hashlineTools, TOOL_CATEGORIES.HASHLINE)` to `allTools`.
- Extend `ToolNameFilterOptions` and `getExcludedCategories()`.

Update standalone MCP registration:

- Import `hashlineTools` in `src/mcp/tool-registry.ts`.
- Add hashline tools to the standalone `allTools` array.
- Verify `src/mcp/standalone-server.ts` ListTools output includes the new tools.
- Ensure build output for `bridge/mcp-server.cjs` includes the new registration path.

Expected MCP names:

```text
mcp__t__hashline_read
mcp__t__hashline_grep
mcp__t__hashline_edit
```

### Launch Modes

Add an OMC-specific launch flag in `src/cli/launch.ts`:

```text
--edit-mode=builtin|both|hashline
```

Recommended behavior:

| Mode | Native tools | Hashline tools | Prompt guidance | Intended use |
| --- | --- | --- | --- | --- |
| `builtin` | unchanged | hidden or unguided | none | default current behavior |
| `both` | available | available | prefer hashline for precise multi-line edits | exploratory rollout |
| `hashline` | disallow native edit/read/search where safe | available | strict hashline contract | benchmarks, edit-heavy workers |

Do not default to `both` or `hashline` until local benchmarks justify it. Adding extra tools and prompt guidance by default can itself create tool-selection noise.

### Worker Guidance

Add optional hashline guidance in `src/team/worker-bootstrap.ts`.

Preferred first target:

- executor-style workers
- codebuddy/codex/gemini workers assigned edit-heavy tasks
- benchmark runners

Avoid changing reviewer/critic/security roles unless they edit files.

### Prompt Contract

Adapt upstream `prompts/tools/hashline.md`.

Minimum required guidance:

- Anchors must be copied exactly from latest `hashline_read` or `hashline_grep`.
- Do not include line content after the anchor in op lines.
- Use narrow operations.
- Prefer insert/delete over wide replace when possible.
- On mismatch, use updated refs from the tool result and retry once.
- Do not write unified diff syntax.

## Rollout Plan

### Phase 0: Research Lock

Deliverables:

- This design document.
- Decision record on Node-compatible hash implementation.
- Inventory of upstream files/tests to port.

Exit criteria:

- Design accepted.
- No unresolved licensing concern.
- No new dependency added without approval.

### Phase 1: Core Library and Tests

Deliverables:

- Node-compatible `line-hash` implementation.
- Parser and apply engine.
- Unit tests ported from upstream, including stale-anchor and truncation-marker cases.

Required tests:

- Anchor formatting uses `LINE+ID|TEXT`.
- Hash mismatch throws and returns updated context.
- Unique shifted anchors can rebase within the configured window.
- Ambiguous matching hashes reject.
- Truncation markers do not prevent prefix stripping.
- Nested/double-prefixed anchors are stripped recursively.
- Multi-section edit preflight prevents partial writes.
- CRLF/BOM preservation.

Exit criteria:

- Unit tests pass.
- No disk writes on failed preflight or mismatch.
- Path traversal and symlink escape attempts are rejected when OMC path restrictions are enabled.
- Atomic write behavior is covered by at least one failure-mode test.

### Phase 2: MCP Tool Registration

Deliverables:

- `hashline_read`
- `hashline_grep`
- `hashline_edit`
- `OMC_DISABLE_TOOLS=hashline`
- Docs update in `docs/TOOLS.md` only after implementation lands.

Exit criteria:

- MCP tool names appear through `getOmcToolNames()`.
- MCP tool names appear through the standalone MCP server's ListTools response.
- Tool schemas validate required inputs.
- Manual smoke test can read, edit, and recover from stale anchors.
- `bridge/mcp-server.cjs` build output exposes the same hashline tools as the TypeScript source registry.

### Phase 3: Launch and Worker Modes

Deliverables:

- `--edit-mode` parsing.
- Allowed/disallowed tool adjustments for strict mode.
- Worker overlay guidance for edit-heavy workers.

Exit criteria:

- `builtin` mode matches current behavior.
- `both` mode exposes hashline tools without blocking native tools.
- `hashline` mode can run an edit-heavy task using only hashline file tools.

### Phase 4: Benchmark and Graduation

Deliverables:

- `benchmarks/hashline-edit/` fixture generator and scorer.
- Results across at least three model/provider configurations used by OMC.
- Report comparing `builtin`, `both`, and `hashline`.

Suggested fixture sources:

- OMC TypeScript files.
- OMC Markdown docs.
- JSON/JSONC config files.
- Tab-indented samples.
- CRLF samples.
- Files touched by formatter-like mutations.

Metrics:

- `edit_tool_success`
- `task_success`
- `retry_count`
- `output_tokens`
- `mismatch_recovery_rate`
- `silent_corruption_count`
- wall-clock time

Graduation criteria:

- `task_success` is not worse than builtin by more than statistical noise.
- `edit_tool_success` improves by at least 10 percentage points, or edit failures drop by at least 50%.
- `silent_corruption_count` is zero.
- `mismatch_recovery_rate` is at least 80% in stale-anchor fixtures.
- Token usage is non-regressive or justified by success gains.

## Risk Register

| Risk | Evidence | Mitigation |
| --- | --- | --- |
| Two-tools confusion | Claude Code issue #25775 calls MCP workaround fragile when native tools remain preferred | Add explicit modes; strict mode gates native tools; guidance only in relevant modes |
| Silent metadata corruption | oh-my-pi PR #715 documents anchors/truncation markers written to disk | Port stripping helpers and tests before exposing write capability |
| Stale-anchor loops | oh-my-pi issue #158 reports stale LINE+ID loop | Return updated context on mismatch; include retry guidance |
| Token overhead from line anchors | Hashline adds prefixes to read/search output | Preserve upstream token-aware bigrams; benchmark output tokens |
| Runtime mismatch | Upstream uses Bun, OMC uses Node >=20 | Port runtime dependencies; test hash vectors |
| Over-disabling native tools | Native CodeBuddy tools may support workflows hashline does not | Make strict gating opt-in and worker-scoped first |
| Partial writes in multi-file edits | Multi-section edits can fail midway without preflight | Preflight all sections before any write |
| Incomplete MCP exposure | OMC has both SDK/in-process and standalone MCP registration paths | Register and test hashline tools in both paths |
| Path or symlink escape | Hashline edit introduces new write-capable tool surface | Reuse path restrictions; reject traversal and symlink escape in strict mode |

## Open Questions

1. Should `hashline_grep` use direct Node file traversal, existing OMC search utilities, or a validated `rg` subprocess?
2. Should `hashline_read` support directory summaries, or stay file-only for the MVP?
3. Should strict `hashline` mode disable `Write`, or provide `hashline_write` for create/overwrite workflows first?
4. Should benchmark scoring use exact original restoration, tests, LLM grading, or a combined rubric?
5. How should the implementation preserve upstream attribution in source files copied from `oh-my-pi`?

## Final Recommendation

Proceed with a staged hashline integration, starting with a faithful Node-compatible port of upstream core behavior and tests.

The highest-confidence path is not to invent a new edit abstraction. It is to reuse the proven hashline contract, expose it through OMC's existing MCP tool server, and let OMC-specific benchmarks decide when and where it should become default. This is consistent with OMC's current architecture, CodeBuddy's documented MCP/tool-permission surfaces, and the empirical evidence that editing harnesses are a major reliability lever.
