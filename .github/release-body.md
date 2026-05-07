# oh-my-codebuddy v4.13.6: Reliability & macOS Hardening

Bug fixes for session lifecycle, macOS launch path, and team auth, plus reviewer/designer agent upgrades for Opus 4.7. Net delivery is **14 PRs**: the omx-teams backport (#2903) shipped and was reverted (#2910) within the window, so team-runtime behavior matches v4.13.5.

## Highlights

### macOS launch path

- **`--madmax`/`--yolo` now require tmux on macOS** (#2909) — instead of silently launching direct, the launcher exits with a `brew install tmux` hint when tmux is missing, and surfaces the underlying error if `tmux new-session`/`attach-session` fails.

### Session and cancel reliability

- **Stop hook: clean up orphan session state** (#2912, fixes #2911) — sessions terminated by `cancel`/`stop` no longer leave behind active mode-state files that re-arm continuations.
- **Cancel: clear Ralph stop hook artifacts** (#2897) — `cancelomc` now also clears the stop-hook scaffolding so Ralph can't restart.
- **Persistent mode: ignore orphan autopilot routing echo** (#2899) — stale routing echoes from previous sessions no longer hijack the active session.
- **Launch: preserve Claude auth in runtime config** (#2908, fixes #2906) — `claude.json` auth payload survives launcher rewrites.

### Team and autoresearch correctness

- **Team: use claude bare mode with API key auth** (#2890) — fixes auth handoff into team-spawned `claude` workers when `ANTHROPIC_API_KEY` is the active credential.
- **Team: require delegation evidence for broad completions** (#2895) — broad task closures must show delegation evidence rather than self-declared completion.
- **Autoresearch: stop discarding the first passing candidate** (#2905, by @stevenmorrisroe) — supervisor no longer drops the bootstrap candidate that already meets acceptance.

### Agent upgrades for Opus 4.7

- **Designer agent: domain-aware override of Opus 4.7 editorial defaults** (#2893) — keeps designer outputs in the requested register instead of being rewritten by global editorial behavior.
- **Code-reviewer agent: discovery/filter separation for Opus 4.7** (#2892) — splits "what could be wrong" from "what is severe enough to surface" so reviews don't drown in low-signal nits.

### State and tooling fixes

- **Project memory: keep detector authoritative for schema-known fields on rescan** (#2883) — rescans no longer clobber detector-owned fields with stale values.
- **Project memory: preserve unknown fields across rescan** (#2882) — fields the schema doesn't recognize are passed through instead of dropped.
- **Wiki: honor `workingDirectory` for manual worktrees** (#2880) — wiki tools resolve against the worktree root the user passed, not the parent repo.
- **Post-tool verifier: recognize Edit success output** (#2877) — `Edit` results no longer flagged as failures by the verifier.
- **Pre-tool: warn on fallback slop language** (#2878) — flags filler phrasing in tool-call narration before it reaches the user.
- **Planning artifacts: timestamp canonical handoff files** (#2894) — handoff artifacts now carry timestamps so consumers can detect staleness.

### Docs

- **Explain the prebuild-install warning** (#2914, fixes #2913) — clarifies the harmless `prebuild-install` warning during `npm install`.

## Reverted in this window

- **omx-teams backport (#2903)** was reverted by **#2910** after merge-safety review. Team runtime behavior is unchanged from v4.13.5.

## Stats

- **14 PRs net** | **5 features** | **11 fixes** | **1 docs** | **1 backport reverted**

## Install / Update

```bash
npm install -g oh-my-claude-sisyphus@4.13.6
```

Or reinstall the plugin:
```bash
claude /install-plugin oh-my-codebuddy
```

**Full Changelog**: https://github.com/anthropic-ai/oh-my-codebuddy/compare/v4.13.5...v4.13.6

## Contributors

Thank you to all contributors who made this release possible!

@devswha @EthanJStark @RobinNorberg @stevenmorrisroe @anthropic-ai
