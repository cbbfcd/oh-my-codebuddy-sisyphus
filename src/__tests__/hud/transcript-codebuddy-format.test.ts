/**
 * Regression tests for CodeBuddy Code transcript format support.
 *
 * Background: OMC's HUD parser was written against the Anthropic/Claude Code
 * transcript schema (nested `message.content[]` with `type:"tool_use"`
 * blocks). CodeBuddy Code writes a flat top-level schema instead:
 *
 *   {"type":"function_call",        "callId":"…", "name":"Agent", "arguments":"{…}"}
 *   {"type":"function_call_result", "callId":"…", "name":"Agent", "status":"completed",
 *    "output": {"type":"text","text":"Spawned successfully.\nagent_id: Explore-1@…"}}
 *
 * Before the fix, the block-loop never ran for these entries, so `agentMap`
 * stayed empty and the HUD displayed no `agents:` element during parallel
 * subagent runs — verified live via 3 concurrent Explore agents producing
 * output with no agents section at all.
 */
import { afterEach, describe, expect, it } from "vitest";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { parseTranscript } from "../../hud/transcript.js";

const tempDirs: string[] = [];

function createTempTranscript(lines: unknown[]): string {
  const dir = mkdtempSync(join(tmpdir(), "omc-hud-codebuddy-"));
  tempDirs.push(dir);
  const p = join(dir, "transcript.jsonl");
  writeFileSync(p, `${lines.map((l) => JSON.stringify(l)).join("\n")}\n`, "utf8");
  return p;
}

afterEach(() => {
  while (tempDirs.length > 0) {
    const d = tempDirs.pop();
    if (d) rmSync(d, { recursive: true, force: true });
  }
});

describe("HUD transcript — CodeBuddy Code format", () => {
  it("treats a foreground Agent function_call + function_call_result as completed", async () => {
    const callId = "toolu_fg_01";
    const t0 = 1778673000000;
    const transcriptPath = createTempTranscript([
      {
        type: "function_call",
        callId,
        name: "Agent",
        // CodeBuddy writes arguments as a JSON string, not an object
        arguments: JSON.stringify({
          subagent_type: "Explore",
          description: "Find foo",
        }),
        timestamp: t0,
      },
      {
        type: "function_call_result",
        callId,
        name: "Agent",
        status: "completed",
        // Normal foreground output — NOT a "Spawned successfully" ACK
        output: { type: "text", text: "Done. Found 3 matches." },
        timestamp: t0 + 5_000,
      },
    ]);

    const data = await parseTranscript(transcriptPath);

    expect(data.agents).toHaveLength(1);
    expect(data.agents[0]?.status).toBe("completed");
    expect(data.agents[0]?.type).toBe("Explore");
    expect(data.agents[0]?.description).toBe("Find foo");
    expect(data.agentCallCount).toBe(1);
  });

  it("keeps a background Agent running after its 'Spawned successfully' launch ACK", async () => {
    const callId = "toolu_bg_01";
    const t0 = 1778673000000;
    const transcriptPath = createTempTranscript([
      {
        type: "function_call",
        callId,
        name: "Agent",
        arguments: JSON.stringify({
          subagent_type: "Explore",
          description: "Probe A",
          run_in_background: true,
        }),
        timestamp: t0,
      },
      {
        type: "function_call_result",
        callId,
        name: "Agent",
        status: "completed",
        // Launch ACK — the background agent is still running
        output: {
          type: "text",
          text:
            "Spawned successfully.\n" +
            "agent_id: Explore-1@_auto_21094162-c779\n" +
            "name: Explore-1\n" +
            "task_id: agent-cdbce080",
        },
        timestamp: t0 + 150,
      },
    ]);

    const data = await parseTranscript(transcriptPath);

    expect(data.agents).toHaveLength(1);
    expect(data.agents[0]?.status).toBe("running");
    expect(data.agents[0]?.type).toBe("Explore");
  });

  it("shows N running agents when N background Agents are fired in parallel", async () => {
    const t0 = 1778673000000;
    const mk = (n: number) => [
      {
        type: "function_call",
        callId: `toolu_bg_0${n}`,
        name: "Agent",
        arguments: JSON.stringify({
          subagent_type: "Explore",
          description: `Parallel probe ${n}`,
          run_in_background: true,
        }),
        timestamp: t0 + n,
      },
      {
        type: "function_call_result",
        callId: `toolu_bg_0${n}`,
        name: "Agent",
        status: "completed",
        output: {
          type: "text",
          text:
            "Spawned successfully.\n" +
            `agent_id: Explore-${n}@_auto_21094162-c779\n` +
            `name: Explore-${n}\n` +
            `task_id: agent-parallel-${n}`,
        },
        timestamp: t0 + n + 100,
      },
    ];

    const transcriptPath = createTempTranscript([...mk(1), ...mk(2), ...mk(3)]);

    const data = await parseTranscript(transcriptPath);

    expect(data.agents).toHaveLength(3);
    expect(data.agents.every((a) => a.status === "running")).toBe(true);
    expect(data.agentCallCount).toBe(3);
  });

  it("tracks Skill activation via top-level function_call", async () => {
    const transcriptPath = createTempTranscript([
      {
        type: "function_call",
        callId: "toolu_skill_01",
        name: "Skill",
        arguments: JSON.stringify({ skill: "ultrawork", args: "do the thing" }),
        timestamp: 1778673000000,
      },
    ]);

    const data = await parseTranscript(transcriptPath);

    expect(data.lastActivatedSkill?.name).toBe("ultrawork");
    expect(data.lastActivatedSkill?.args).toBe("do the thing");
    expect(data.skillCallCount).toBe(1);
  });

  it("tolerates malformed arguments strings without crashing", async () => {
    const transcriptPath = createTempTranscript([
      {
        type: "function_call",
        callId: "toolu_bad",
        name: "Agent",
        arguments: "{not valid json",
        timestamp: 1778673000000,
      },
    ]);

    const data = await parseTranscript(transcriptPath);

    // The agent is tracked with default values (type "unknown") rather than
    // being dropped — this matches Claude Code's behavior when `input` is
    // missing or unparseable.
    expect(data.agents).toHaveLength(1);
    expect(data.agents[0]?.type).toBe("unknown");
  });

  it("does not double-count when Anthropic-nested and CodeBuddy-flat entries coexist", async () => {
    // Defensive: hybrid transcripts shouldn't cause cross-talk. Feed one of
    // each shape with DIFFERENT call ids and confirm both agents show up.
    const t0 = 1778673000000;
    const transcriptPath = createTempTranscript([
      // Anthropic shape
      {
        timestamp: new Date(t0).toISOString(),
        message: {
          role: "assistant",
          content: [
            {
              type: "tool_use",
              id: "toolu_ant_01",
              name: "Task",
              input: { subagent_type: "executor", description: "Classic path" },
            },
          ],
        },
      },
      // CodeBuddy shape
      {
        type: "function_call",
        callId: "toolu_cb_01",
        name: "Agent",
        arguments: JSON.stringify({
          subagent_type: "Explore",
          description: "Flat path",
        }),
        timestamp: t0 + 10,
      },
    ]);

    const data = await parseTranscript(transcriptPath);

    expect(data.agents).toHaveLength(2);
    const types = data.agents.map((a) => a.type).sort();
    expect(types).toEqual(["Explore", "executor"]);
    expect(data.agentCallCount).toBe(2);
  });
});
