# oh-my-codebuddy 迁移计划：从 Claude Code 到 CodeBuddy Code

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 oh-my-codebuddy（fork 自 anthropic-ai/oh-my-codebuddy）完整迁移为基于 CodeBuddy Code 的 oh-my-codebuddy，1:1 功能对等，移除原项目痕迹，保留中文文档。同时从 oh-my-codex 移植 5 项低成本高价值功能。

**Architecture:** 
- 将所有 Claude Code SDK 引用替换为 CodeBuddy SDK 等价物
- 将 `.claude/` 路径映射到 `.codebuddy/`
- 将 hook event 名称和 MCP 配置格式适配为 CodeBuddy 规范
- 将 `@tencent-ai/agent-sdk` 替换为 CodeBuddy TypeScript SDK
- 重写 installer 将安装目标从 `~/.claude/` 改为 `~/.codebuddy/`
- 从 oh-my-codex 移植确认的 skills 和 agents

**Tech Stack:** TypeScript, CodeBuddy Code SDK, MCP (Model Context Protocol), esbuild, vitest

---

## Phase 0: oh-my-codex 功能集成决策（已确认）

### 背景

经代码验证，oh-my-codebuddy 已是功能超集（~95% 覆盖）。oh-my-codex 的"独有功能"（Mixed CLI Workers、Auto-Nudge、Autoresearch）实际上在 oh-my-codebuddy 中都已存在。真正的差异仅为 Rust 二进制和一些额外 skill/agent markdown 文件。

### 确认集成项 ✅

| # | 功能 | 来源 | 成本 |
|---|---|---|---|
| 1 | `ecomode` skill | `anthropic-ai/oh-my-codex/skills/ecomode/` | 低（1 个 .md 文件） |
| 2 | `build-fix` skill | `anthropic-ai/oh-my-codex/skills/build-fix/` | 低（1 个 .md 文件） |
| 3 | `frontend-ui-ux` skill | `anthropic-ai/oh-my-codex/skills/frontend-ui-ux/` | 低（1 个 .md 文件） |
| 4 | `worker` skill | `anthropic-ai/oh-my-codex/skills/worker/` | 低（1 个 .md 文件） |
| 5 | 3 个额外 agent | `build-fixer`, `dependency-expert`, `performance-reviewer` | 低（3 个 .md 文件） |

### 确认不集成项 ❌

- Native Rust 二进制（omx-explore-harness, omx-sparkshell, omx-runtime-core）— 维护成本高，安装门槛大
- `swarm` skill — 已被 `team` 技能替代
- Hook 模拟层 / config.toml / notify hook — Codex 特有的 workaround
- `web-clone` / `ultragoal` / `performance-goal` — 使用场景窄或已有替代

---

## Phase 1: 核心标识重命名

### Task 1: package.json 与项目元数据

**Files:**
- Modify: `package.json`
- Modify: `tsconfig.json`

- [ ] **Step 1: 更新 package.json 核心字段**

```json
{
  "name": "oh-my-codebuddy",
  "description": "CodeBuddy Code 多 Agent 智能编排系统",
  "bin": {
    "oh-my-codebuddy": "bridge/cli.cjs",
    "omcb": "bridge/cli.cjs",
    "omcb-cli": "bridge/cli.cjs"
  },
  "repository": {
    "type": "git",
    "url": "git+https://github.com/anthropic-ai/oh-my-codebuddy.git"
  },
  "keywords": ["codebuddy", "codebuddy-code", "ai", "agent", "multi-agent", "orchestration", "omcb", "llm"]
}
```

- [ ] **Step 2: 替换 SDK 依赖**

移除：
```
"@tencent-ai/agent-sdk": "^0.1.0"
"@anthropic-ai/sdk": "^0.78.0"
```

保留 `@modelcontextprotocol/sdk`（CodeBuddy 也用 MCP）。CodeBuddy SDK 如有 npm 包则添加。

- [ ] **Step 3: 验证 npm install**

Run: `npm install`
Expected: 无报错

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: 重命名项目为 oh-my-codebuddy，更新依赖"
```

---

### Task 2: 全局路径常量 `.claude` → `.codebuddy`

**Files:**
- Modify: `src/utils/config-dir.ts`
- Modify: `src/installer/index.ts`
- Modify: `src/lib/paths.ts`
- Modify: `src/lib/env-vars.ts`
- Modify: 所有引用 `CLAUDE_CONFIG_DIR` 的文件（约 30+）

- [ ] **Step 1: 统计影响范围**

Run: `grep -rn "\.claude\b\|CLAUDE_CONFIG_DIR\|getClaudeConfigDir" src/ --include="*.ts" | wc -l`

- [ ] **Step 2: 更新核心路径函数**

```typescript
// src/utils/config-dir.ts
export function getCodebuddyConfigDir(): string {
  return process.env.CODEBUDDY_CONFIG_DIR || join(homedir(), '.codebuddy');
}
export const getClaudeConfigDir = getCodebuddyConfigDir; // 兼容别名
```

- [ ] **Step 3: 全量替换路径引用**

使用 sed 或手动替换所有 `~/.claude/` → `~/.codebuddy/`、`CLAUDE_CONFIG_DIR` → `CODEBUDDY_CONFIG_DIR`。

- [ ] **Step 4: 更新环境变量**

`OMC_PLUGIN_ROOT` → `OMCB_PLUGIN_ROOT`（保留旧变量作为 fallback）

- [ ] **Step 5: 验证编译**

Run: `npx tsc --noEmit`
Expected: 0 errors

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "refactor: 全量迁移路径从 .claude 到 .codebuddy"
```

---

### Task 3: SDK 引用替换

**Files:**
- Modify: `src/index.ts`
- Modify: `src/mcp/omc-tools-server.ts`
- Modify: `src/commands/index.ts`

- [ ] **Step 1: 移除 Claude Agent SDK import**

替换 `@tencent-ai/agent-sdk` 引用为 CodeBuddy SDK 等价物或纯 MCP SDK。

- [ ] **Step 2: 重写 MCP server 创建（使用标准 `@modelcontextprotocol/sdk`）**

```typescript
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
```

- [ ] **Step 3: 更新 OmcSession 接口注释和示例**

将示例代码中的 `query` 调用改为 CodeBuddy SDK 用法。

- [ ] **Step 4: 验证编译**

Run: `npx tsc --noEmit`

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "refactor: 替换 Claude Agent SDK 为 CodeBuddy/MCP SDK"
```

---

### Task 4: Hook 事件名称适配

**Files:**
- Modify: `src/hooks/bridge.ts`
- Modify: `hooks/hooks.json`
- Modify: hook handler 文件

- [ ] **Step 1: 建立 hook 映射表**

Claude Code 14 事件 → CodeBuddy 9 事件：
- 直接映射（7 个）：PreToolUse, PostToolUse, Notification, UserPromptSubmit, Stop, SessionStart, SessionEnd
- 通过 PostToolUse 模拟：SubagentStop（检测 Agent tool 调用完成）
- 通过 PreCompact 映射：PreCompact
- 无需适配（CodeBuddy 不支持，用状态追踪替代）：PostToolUseFailure, SubagentStart, PermissionRequest, WorktreeCreate/Remove

- [ ] **Step 2: 更新 hooks.json 为 CodeBuddy 格式**

```json
{
  "hooks": {
    "Stop": [{ "hooks": [{ "type": "command", "command": "node \"$CODEBUDDY_PROJECT_DIR\"/.codebuddy/hooks/bridge.mjs stop" }] }],
    "UserPromptSubmit": [{ "hooks": [{ "type": "command", "command": "node \"$CODEBUDDY_PROJECT_DIR\"/.codebuddy/hooks/bridge.mjs user-prompt-submit" }] }],
    "SessionStart": [{ "hooks": [{ "type": "command", "command": "node \"$CODEBUDDY_PROJECT_DIR\"/.codebuddy/hooks/bridge.mjs session-start" }] }]
  }
}
```

- [ ] **Step 3: 为缺失事件创建适配层**

```typescript
// src/hooks/compat/codebuddy-adapter.ts
// 通过 PostToolUse 上下文推断 SubagentStart/Stop
```

- [ ] **Step 4: 验证 hook 测试**

Run: `npx vitest run src/__tests__/hooks`

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "refactor: 适配 hook 系统为 CodeBuddy 9 事件模型"
```

---

### Task 5: CLI 启动器迁移

**Files:**
- Modify: `src/cli/launch.ts`
- Modify: `src/cli/tmux-utils.ts`
- Modify: `bridge/cli.cjs`

- [ ] **Step 1: 替换 CLI 可执行文件检测**

`isClaudeAvailable()` → `isCodebuddyAvailable()`，检测 `which codebuddy`

- [ ] **Step 2: 更新 tmux session 命名**

前缀 `omc-` → `omcb-`

- [ ] **Step 3: 更新启动命令构造**

`claude [args]` → `codebuddy [args]`

- [ ] **Step 4: 更新配置文件引用**

`CLAUDE-omc.md` → `CODEBUDDY-omcb.md`（或确认 CodeBuddy 使用的文件名）

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "refactor: CLI 启动器迁移到 codebuddy 命令"
```

---

### Task 6: Agent 定义适配

**Files:**
- Modify: `agents/*.md`（19 个文件）
- Modify: `src/agents/definitions.ts`
- Modify: `src/config/models.ts`

- [ ] **Step 1: 替换 agent 文件中的 Claude/Anthropic 引用**

Run: `grep -rn "claude\|anthropic\|Claude Code" agents/ --include="*.md"`

批量替换产品名称为 CodeBuddy Code。

- [ ] **Step 2: 更新 model routing**

```typescript
// 映射 haiku/sonnet/opus 到 CodeBuddy 支持的模型
export function resolveModelForCodebuddy(model: ModelType): string {
  // CodeBuddy 支持的模型别名 — 需根据实际文档确认
  const mapping: Record<string, string> = {
    haiku: 'fast',
    sonnet: 'default', 
    opus: 'advanced',
    inherit: 'inherit',
  };
  return mapping[model] || model;
}
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "refactor: 适配 agent 定义为 CodeBuddy Code 格式"
```

---

## Phase 2: MCP 与 Team 模块适配

### Task 7: MCP 配置格式

**Files:**
- Modify: `.mcp.json`
- Modify: `src/mcp/servers.ts`
- Modify: `src/mcp/omc-tools-server.ts`

- [ ] **Step 1: 更新 .mcp.json 为 CodeBuddy JSONC 格式**
- [ ] **Step 2: 重写 MCP server 注册逻辑（stdio 格式）**
- [ ] **Step 3: 验证 MCP 工具命名 `mcp__servername__toolname`**
- [ ] **Step 4: Commit**

---

### Task 8: 自定义 MCP Tools 迁移（LSP/AST）

**Files:**
- Modify: `src/mcp/omc-tools-server.ts`
- Modify: `src/tools/index.ts`

- [ ] **Step 1: 重写为标准 `@modelcontextprotocol/sdk` Server**
- [ ] **Step 2: 保持工具逻辑不变，仅改注册方式**
- [ ] **Step 3: 运行工具测试验证**
- [ ] **Step 4: Commit**

---

### Task 9: Team Runtime 适配

**Files:**
- Modify: `src/team/runtime.ts`
- Modify: `src/team/runtime-v2.ts`
- Modify: `src/team/worker-bootstrap.ts`
- Modify: `src/team/model-contract.ts`

- [ ] **Step 1: 更新 CliAgentType，添加 `'codebuddy'` 类型**
- [ ] **Step 2: 更新 worker 启动命令为 `codebuddy` CLI**
- [ ] **Step 3: 适配 CodeBuddy 原生 Agent Teams（可利用内置 mailbox）**
- [ ] **Step 4: 更新 tmux session 前缀**
- [ ] **Step 5: Commit**

---

### Task 10: Team 通信层

**Files:**
- Modify: `src/team/message-router.ts`
- Modify: `src/team/inbox-outbox.ts`

- [ ] **Step 1: 保持 dispatch-queue 文件锁逻辑不变**
- [ ] **Step 2: 更新 native worker 通信为 CodeBuddy 格式**
- [ ] **Step 3: Commit**

---

## Phase 3: Skill 系统迁移 + codex 功能移植

### Task 11: Skill 文件批量更新

**Files:**
- Modify: `skills/*/SKILL.md`（38 个 skill 目录）

- [ ] **Step 1: 批量替换 skill 中的 Claude/Anthropic 引用**
- [ ] **Step 2: 确认 frontmatter 字段兼容性**
- [ ] **Step 3: 更新安装目标路径为 `~/.codebuddy/skills/`**
- [ ] **Step 4: Commit**

---

### Task 12: 从 oh-my-codex 移植确认的 skills 和 agents

**Files:**
- Create: `skills/ecomode/SKILL.md`
- Create: `skills/build-fix/SKILL.md`
- Create: `skills/frontend-ui-ux/SKILL.md`
- Create: `skills/worker/SKILL.md`
- Create: `agents/build-fixer.md`
- Create: `agents/dependency-expert.md`
- Create: `agents/performance-reviewer.md`

- [ ] **Step 1: 从 oh-my-codex repo 获取 4 个 skill 文件**

```bash
# 从 GitHub 获取原始内容
gh api repos/anthropic-ai/oh-my-codex/contents/skills/ecomode/SKILL.md --jq '.content' | base64 -d > skills/ecomode/SKILL.md
gh api repos/anthropic-ai/oh-my-codex/contents/skills/build-fix/SKILL.md --jq '.content' | base64 -d > skills/build-fix/SKILL.md
gh api repos/anthropic-ai/oh-my-codex/contents/skills/frontend-ui-ux/SKILL.md --jq '.content' | base64 -d > skills/frontend-ui-ux/SKILL.md
gh api repos/anthropic-ai/oh-my-codex/contents/skills/worker/SKILL.md --jq '.content' | base64 -d > skills/worker/SKILL.md
```

- [ ] **Step 2: 获取 3 个 agent 文件**

```bash
gh api repos/anthropic-ai/oh-my-codex/contents/prompts/build-fixer.md --jq '.content' | base64 -d > agents/build-fixer.md
gh api repos/anthropic-ai/oh-my-codex/contents/prompts/dependency-expert.md --jq '.content' | base64 -d > agents/dependency-expert.md
gh api repos/anthropic-ai/oh-my-codex/contents/prompts/performance-reviewer.md --jq '.content' | base64 -d > agents/performance-reviewer.md
```

- [ ] **Step 3: 将内容中的 "codex"/"omx" 引用替换为 "codebuddy"/"omcb"**
- [ ] **Step 4: 在 `src/agents/definitions.ts` 中注册新 agent**
- [ ] **Step 5: 运行测试验证新 agent 加载**

Run: `npx vitest run src/__tests__/agent-registry`

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: 从 oh-my-codex 移植 ecomode/build-fix/frontend-ui-ux/worker skills 和 3 个 agent"
```

---

## Phase 4: 文档清理与中文化

### Task 13: 移除非中文文档

**Files:**
- Delete: `README.md`, `README.de.md`, `README.es.md`, `README.fr.md`, `README.it.md`, `README.ja.md`, `README.ko.md`, `README.pt.md`, `README.ru.md`, `README.tr.md`, `README.vi.md`
- Rename: `README.zh.md` → `README.md`
- Delete: `CONTRIBUTING.md`, `SECURITY.md`（英文）

- [ ] **Step 1: 执行文件操作**

```bash
rm README.md README.de.md README.es.md README.fr.md README.it.md README.ja.md README.ko.md README.pt.md README.ru.md README.tr.md README.vi.md CONTRIBUTING.md SECURITY.md
mv README.zh.md README.md
```

- [ ] **Step 2: 重写 README.md 为 oh-my-codebuddy 中文文档**
- [ ] **Step 3: Commit**

---

### Task 14: CLAUDE.md / AGENTS.md 重写

**Files:**
- Modify: `CLAUDE.md`（或重命名为 CodeBuddy 等价物）
- Modify: `AGENTS.md`
- Modify: `docs/*.md`

- [ ] **Step 1: 全量替换文档中的 Claude/Anthropic/omc 引用**

替换规则：
- "oh-my-codebuddy" → "oh-my-codebuddy"
- "Claude Code" → "CodeBuddy Code"
- "omc" (CLI) → "omcb"
- "~/.claude/" → "~/.codebuddy/"
- ".omc/" → ".omcb/"（状态目录，需确认）

- [ ] **Step 2: 清空 CHANGELOG.md，重新开始**
- [ ] **Step 3: Commit**

---

### Task 15: 内部注释精简

**Files:**
- 所有 `src/**/*.ts` 文件中的注释

- [ ] **Step 1: 移除所有英文 JSDoc 中的原作者引用**
- [ ] **Step 2: 核心模块注释改为中文简述**
- [ ] **Step 3: 移除 "Inspired by oh-my-opencode" 等来源声明**
- [ ] **Step 4: Commit**

---

## Phase 5: 测试修复与构建验证

### Task 16: 修复测试套件

**Files:**
- Modify: `src/__tests__/**/*.test.ts`

- [ ] **Step 1: 运行完整测试识别失败数量**

Run: `npx vitest run 2>&1 | tail -5`

- [ ] **Step 2: 批量修复路径常量相关断言**
- [ ] **Step 3: 修复 SDK mock**
- [ ] **Step 4: 逐步修复直到全绿**

Run: `npx vitest run`
Expected: All tests passing

- [ ] **Step 5: Commit**

---

### Task 17: 构建验证

- [ ] **Step 1: 完整构建**

Run: `npm run build`
Expected: dist/ 正常生成

- [ ] **Step 2: CLI 入口验证**

Run: `node bridge/cli.cjs --help`

- [ ] **Step 3: Commit**

---

## Phase 6: 最终清理

### Task 18: 移除原项目痕迹

- [ ] **Step 1: 更新 git remote**
- [ ] **Step 2: 删除残留配置** (`.codex`, `.clawhip`)
- [ ] **Step 3: 最终全量搜索**

Run: `grep -rn "anthropic-ai\|oh-my-codebuddy\|oh-my-opencode\|anthropic-ai/claude-agent-sdk" . --include="*.ts" --include="*.md" --include="*.json" | grep -v node_modules | grep -v ".git/"`
Expected: 0 结果

- [ ] **Step 4: Commit**

---

## 依赖关系

```
Task 1 → Task 2 → Task 3 → Task 4, 5, 6 (可并行)
                                    ↓
                              Task 7 → Task 8
                                    ↓
                              Task 9 → Task 10
                                    ↓
                              Task 11 → Task 12
                                    ↓
                              Task 13 → Task 14 → Task 15
                                    ↓
                              Task 16 → Task 17 → Task 18
```

## 已确认项 ✅

| # | 问题 | 答案 |
|---|---|---|
| 1 | SDK npm 包名 | `@tencent-ai/agent-sdk` |
| 2 | 项目指令文件名 | `CODEBUDDY.md`（支持 `./CODEBUDDY.md`、`./.codebuddy/CODEBUDDY.md`、`CODEBUDDY.local.md`） |
| 3 | 模型 tier 映射 | `haiku` → `lite`，`sonnet` → 默认模型，`opus` → `reasoning` |
| 4 | 状态目录 | 保留 `.omc/`（编排系统自有状态，不与 `~/.codebuddy/` 冲突） |
| 5 | 配置目录 | `~/.codebuddy/`，环境变量 `CODEBUDDY_CONFIG_DIR` |
| 6 | Agent 目录 | `.codebuddy/agents/`（项目级）、`~/.codebuddy/agents/`（用户级） |
| 7 | 兼容性 | CodeBuddy 仍识别 `AGENTS.md`，frontmatter 格式与 Claude Code 100% 兼容 |

### 全局替换映射表

```
@tencent-ai/agent-sdk  →  @tencent-ai/agent-sdk
CLAUDE.md                        →  CODEBUDDY.md
CLAUDE.local.md                  →  CODEBUDDY.local.md
~/.claude/                       →  ~/.codebuddy/
.claude/agents/                  →  .codebuddy/agents/
.claude/skills/                  →  .codebuddy/skills/
.claude/rules/                   →  .codebuddy/rules/
CLAUDE_CONFIG_DIR env            →  CODEBUDDY_CONFIG_DIR
haiku (model tier)               →  lite
sonnet (model tier)              →  default
opus (model tier)                →  reasoning
.omc/ (状态目录)                  →  保留不变
```

## 预估工时

- Phase 1（核心重命名）：2 天
- Phase 2（MCP + Team）：2 天
- Phase 3（Skills + 移植）：1 天
- Phase 4（文档清理）：1 天
- Phase 5（测试修复）：1-2 天
- Phase 6（最终清理）：0.5 天

**总计：7-9 天**
