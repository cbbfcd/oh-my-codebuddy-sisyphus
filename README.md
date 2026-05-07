# oh-my-codebuddy

**CodeBuddy Code 多 Agent 智能编排系统**

基于 [CodeBuddy Code](https://www.codebuddy.ai/docs/zh/cli/overview) 的多智能体编排层。自动委派、并行执行、持久完成。

---

## 快速开始

```bash
# 安装（需要腾讯 npm 源）
npm install -g oh-my-codebuddy --registry=https://mirrors.tencent.com/npm/

# 配置
omcb setup
```

---

## 核心功能

| 功能 | 说明 |
|------|------|
| **Team 编排** | 阶段化流水线：plan → prd → exec → verify → fix |
| **22 个专业 Agent** | 架构、执行、调试、安全审查、性能分析等 |
| **智能模型路由** | lite（快速）→ default → reasoning（深度推理） |
| **40+ Skills** | autopilot、ralph、ultrawork、ecomode、build-fix 等 |
| **持久执行** | 任务不完成不停止，自动验证结果 |
| **HUD 状态栏** | 实时显示编排状态、agent 活动、token 用量 |
| **多 CLI Worker** | 支持 CodeBuddy + Claude + Codex + Gemini 混合 team |

---

## 使用方式

```bash
# 全自动执行
autopilot: build a REST API for task management

# Team 多 agent 协作
/team 3:executor "fix all TypeScript errors"

# 持久模式（不完成不停止）
ralph: refactor the auth module

# 需求澄清（苏格拉底式提问）
/deep-interview "I want to build a task management app"

# Token 节省模式
ecomode
```

---

## 配置

| 路径 | 说明 |
|------|------|
| `~/.codebuddy/agents/` | 用户级 agent 定义 |
| `~/.codebuddy/skills/` | 用户级 skill |
| `.codebuddy/agents/` | 项目级 agent |
| `.omc/state/` | 编排状态（session、notepad、plans） |
| `CODEBUDDY.md` | 项目指令文件 |

---

## 开发

```bash
git clone https://github.com/cbbfcd/oh-my-codebuddy.git
cd oh-my-codebuddy
npm install --legacy-peer-deps
npm run build
npm test
```

---

## 致谢

本项目 fork 自 [oh-my-claudecode](https://github.com/Yeachan-Heo/oh-my-claudecode)，感谢 [Yeachan Heo](https://github.com/Yeachan-Heo) 的开创性工作。

灵感来源：[oh-my-opencode](https://github.com/code-yeongyu/oh-my-opencode) • [Superpowers](https://github.com/obra/superpowers) • [everything-claude-code](https://github.com/affaan-m/everything-claude-code)

---

## License

MIT
