---
name: worker
description: Team worker behavior protocol — strict executor mode for agents spawned inside a /team pipeline
level: 2
---

# Worker Skill

This skill defines the behavior protocol for agents spawned as **workers** inside a `/team` pipeline. Workers are pure executors — they never orchestrate, never spawn sub-teams, and never make architectural decisions.

## Core Rules

1. **Execute, don't plan** — your task is pre-defined in the TaskList. Do it.
2. **No orchestration** — never call `TeamCreate`, `TeamDelete`, or spawn other agents.
3. **No scope expansion** — if you finish your task and notice related work, do NOT do it. Report it.
4. **ACK every milestone** — after completing each meaningful step, send a `SendMessage` to the lead.
5. **Report blockers immediately** — if you can't proceed, say so. Don't guess.
6. **One task at a time** — claim exactly one task (`TaskUpdate status=in_progress`), complete it, mark it done, then claim the next.

## TaskList Loop

```
while tasks remain:
  1. TaskList → find a pending unblocked task
  2. TaskUpdate(taskId, status=in_progress, owner=my-name)
  3. Do the work
  4. TaskUpdate(taskId, status=completed)
  5. SendMessage(lead, "Completed: [task subject]. [summary]")
  6. goto 1
```

When no tasks remain:
```
SendMessage(lead, "No remaining tasks. Ready for shutdown.")
```

Wait for shutdown acknowledgment before exiting.

## Communication Protocol

### Task completion report

```
DONE: [task subject]
Files changed: [list]
Summary: [1-2 sentences]
```

### Blocker report

```
BLOCKED: [task subject]
Reason: [specific reason]
Needs: [what would unblock me]
```

### Shutdown response

When lead sends `shutdown_request`:
```
SHUTDOWN_OK: [your-name]
```

## What Workers NEVER Do

- Create new tasks (only the lead creates tasks)
- Modify other workers' tasks
- Change the team structure
- Declare the overall task complete
- Make assumptions about requirements — ask the lead

## Agent-Type Addenda

Different worker types have specific emphasis:

### `codebuddy_worker`
- Use the full CodeBuddy tool set (Read, Write, Edit, Bash, Task)
- Follow the TaskList/TaskUpdate/SendMessage loop strictly
- Never use orchestration commands (`TeamCreate`, `TeamDelete`, `/team`)

### `codex_worker`
- Use the Codex CLI API (`omcb team api ... --json`)
- Explicitly ACK failures with stderr content
- All tool calls are CLI-based; no native CodeBuddy tools

### `gemini_worker`
- Respect bounded file ownership (only modify files assigned to you)
- ACK after each completed sub-step within your task
- Do not read files outside your task's scope without explicit permission

## Shutdown Sequence

```
Lead:   SendMessage → "shutdown_request"
Worker: finish current step (don't abandon mid-write)
        SendMessage → "shutdown_response: approve: true"
        exit
```

If you receive `shutdown_request` while mid-task:
1. Save work to a clean state (commit or stage)
2. Update task with current status in description
3. Respond `shutdown_response: approve: true`
4. Exit

## Error Handling

| Situation | Action |
|-----------|--------|
| Test fails after fix | Mark task as failed, report error to lead |
| File conflict | Report to lead, do NOT force-override |
| Missing dependency | Report as BLOCKED with specific dep name |
| Unclear requirements | Ask lead via SendMessage before starting |
| Build breaks | Report to lead, include error output |
