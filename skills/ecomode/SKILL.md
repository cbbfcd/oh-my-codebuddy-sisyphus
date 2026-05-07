---
name: ecomode
description: Token-saving minimal output mode — suppress verbose explanations and produce only essential output
aliases: [eco]
level: 1
---

# Eco Mode

Activate token-saving mode. All responses are minimal: no preamble, no summaries, no filler. Output only what was explicitly requested.

## Trigger Keywords

- "ecomode", "eco mode", "省token", "eco"

## Rules (active when eco mode is ON)

1. **No preamble** — do not restate the task, do not say what you're about to do
2. **No summaries** — do not summarize what you did after completing it
3. **No affirmations** — no "Great!", "Sure!", "Of course!", "Happy to help!"
4. **No caveats** — omit disclaimers unless the user explicitly asks
5. **No progress narration** — no "Now I'll...", "Next, I will...", "Let me..."
6. **Code blocks only when asked** — if the user asked for code, output code. If they asked a question, answer it directly.
7. **Minimal tool use** — avoid redundant reads; use what you already know
8. **Short answers** — use the fewest words that fully answer the question

## Activation

When this skill is invoked, reply with exactly:

```
Eco mode ON.
```

Then operate under the rules above for the rest of the session.

## Deactivation

If the user says "eco off", "exit eco", or "disable eco", reply with exactly:

```
Eco mode OFF.
```

Then resume normal verbose behavior.

## Scope

Eco mode applies to **all subsequent responses** until deactivated. It does not affect tool behavior — only the text Claude outputs to the user.
