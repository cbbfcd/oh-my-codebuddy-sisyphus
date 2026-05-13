# oh-my-codebuddy

**CodeBuddy Code 多 Agent 智能编排系统**

基于 [CodeBuddy Code](https://www.codebuddy.ai/docs/zh/cli/overview) 的多智能体编排层。自动委派、并行执行、持久完成。

**零学习曲线，最大威力。**

---

## 📦 安装方式

### 方法 1: Plugin 安装（推荐）

在 CodeBuddy Code 会话中**逐行执行**以下命令：

```bash
# 添加市场（市场名为 omc）
/plugin marketplace add cbbfcd/oh-my-codebuddy-sisyphus

# 安装插件（推荐显式指定市场名，避免重名冲突）
/plugin install oh-my-codebuddy-sisyphus@omc
```

安装完成后运行初始化：

```bash
/setup
# 或
/omc-setup
```

### 方法 2: npm CLI 安装

```bash
# 安装
npm install -g oh-my-codebuddy-sisyphus

# 配置
omcb setup
```

**注意**: Plugin 安装方式与 CodeBuddy Code 集成更好，会自动注册 skills 和 agents。

---

## 🎯 系统要求

### 必需
- **CodeBuddy Code CLI** (v1.0.0+)
- **腾讯云账号** + CodeBuddy 订阅

### 推荐
- **tmux** (用于 team 模式和多任务编排)
  - macOS: `brew install tmux`
  - Ubuntu/Debian: `sudo apt install tmux`
  - Windows: `winget install psmux`

### 可选
- **多 AI 编排** (扩展 team 能力):
  - Codex CLI: `npm install -g @openai/codex`
  - Gemini CLI: `npm install -g @google/gemini-cli`

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

## 💡 使用方式

### 1. Team 模式（推荐的编排方式）

Team 采用**分阶段流水线**：plan → prd → exec → verify → fix

```bash
# 在会话中使用
/team 3:executor "修复所有 TypeScript 错误"

# 终端 CLI 使用（启动 tmux 工作进程）
omcb team 2:codex "审查认证模块的安全问题"
omcb team 2:gemini "重新设计 UI 组件"
omcb team 1:claude "实现支付流程"
```

**启用原生 Team 功能**（可选），在 `~/.codebuddy/settings.json` 中配置：

```json
{
  "env": {
    "CODEBUDDY_EXPERIMENTAL_AGENT_TEAMS": "1"
  }
}
```

### 2. Autopilot 自动驾驶模式

适合**端到端的功能开发**，从需求到完成全自动：

```bash
# 会话中
/autopilot "构建一个任务管理 REST API"

# 自然语言触发
autopilot: 构建一个任务管理 REST API
```

### 3. Deep Interview 深度访谈模式

适合**需求不明确**时，通过苏格拉底式提问澄清思路：

```bash
/deep-interview "我想构建一个任务管理应用"
```

### 4. Ralph 持久执行模式

**不完成不停止**，包含验证/修复循环：

```bash
ralph: 重构认证模块
```

### 5. 其他常用模式

```bash
# 最大并行化（批量修复）
/ultrawork "修复所有 lint 错误"
ulw: 修复所有 lint 错误

# 三模型顾问合成（Codex + Gemini + Claude）
/ccg "评估这个架构设计"

# Token 节省模式
ecomode
```

### 6. Provider Advisor（跨 AI 咨询）

```bash
# 终端
omcb ask codex "识别架构风险"
omcb ask gemini "提出 UI 优化建议"

# 会话中
/ask codex "识别架构风险"
```

---

## 🔧 技能与工具管理

### 技能管理

**技能路径**：
- 项目级: `.omc/skills/`
- 用户级: `~/.omc/skills/`

```bash
/skill list      # 列出所有可用技能
/skill add       # 添加新技能
/skillify        # 提取可重用模式为技能
```

### Plugin 管理

```bash
# 重新加载插件（无需重启）
/reload-plugins

# 查看已安装插件
/plugin

# 禁用/启用插件
/plugin disable oh-my-codebuddy-sisyphus
/plugin enable oh-my-codebuddy-sisyphus

# 更新市场
/plugin marketplace update omc

# 卸载插件
/plugin uninstall oh-my-codebuddy-sisyphus
```

---

## 🔄 更新方式

### npm 安装的更新

```bash
npm update -g oh-my-codebuddy-sisyphus
```

### Plugin 安装的更新

```bash
# 1. 更新市场克隆
/plugin marketplace update omc

# 2. 重新运行设置
/setup
```

如遇问题可清除缓存：

```bash
/omc-doctor
```

---

## ⚙️ 配置

### 目录结构

| 路径 | 说明 |
|------|------|
| `~/.codebuddy/agents/` | 用户级 agent 定义 |
| `~/.codebuddy/skills/` | 用户级 skill |
| `.codebuddy/agents/` | 项目级 agent（团队共享） |
| `.omc/state/` | 编排状态（session、notepad、plans） |
| `.omc/skills/` | 项目级 skill |
| `CODEBUDDY.md` | 项目指令文件（自动生成） |

### HUD 状态栏

在 CodeBuddy Code 底部状态栏实时显示：

- 🔄 当前编排模式（autopilot、ralph、team 等）
- 🤖 活跃的 agent 数量
- 📊 Token 使用统计
- ⏱️ 任务执行时间
- ✅ 验证状态

点击 HUD 可查看详细信息和控制面板。

### 环境变量配置

```bash
# 禁用 OMC（临时）
export DISABLE_OMC=1

# 跳过 hooks（调试用）
export OMC_SKIP_HOOKS=autopilot,ralph

# Plugin 目录模式
export OMC_PLUGIN_ROOT=/path/to/plugin/dir
```

---

## 开发

```bash
git clone https://github.com/cbbfcd/oh-my-codebuddy-sisyphus.git
cd oh-my-codebuddy-sisyphus
npm install --legacy-peer-deps
npm run build
npm test
```

---

## 🔍 故障排除

### /plugin 命令未识别

```bash
# 检查 CodeBuddy Code 版本
codebuddy --version

# 更新 CodeBuddy Code
npm update -g @tencent-ai/codebuddy-code

# 重启终端和 CodeBuddy
```

### 插件安装失败

```bash
# 清除缓存并重新安装
rm -rf ~/.codebuddy/plugins/cache
/plugin install oh-my-codebuddy-sisyphus@omc
```

### Team 模式无法启动

```bash
# 检查 tmux 是否安装
tmux -V

# 如未安装，按系统要求章节安装 tmux
```

### Agent 执行异常

```bash
# 运行诊断工具
/omc-doctor

# 查看日志
tail -f .omc/logs/latest.log
```

---

## 📚 进阶用法

### 速率限制自动恢复

```bash
# 检查速率限制状态
omcb wait

# 启用自动恢复守护进程
omcb wait --start
```

### 跨项目技能复用

```bash
# 将项目技能提升为用户级
cp .omc/skills/my-skill.md ~/.omc/skills/

# 在任何项目中使用
/my-skill "任务描述"
```

### 自定义 Agent

在 `~/.codebuddy/agents/` 或 `.codebuddy/agents/` 创建 Markdown 文件：

```markdown
# My Custom Agent

Expert in specific domain...

<trigger_patterns>
custom-task, specialized-work
</trigger_patterns>

## Instructions
...
```

### 通知集成（可选）

支持 Telegram、Discord、Slack 等通知服务：

```bash
/configure-notifications
```

---

## 🔐 安全提示

⚠️ **重要**：插件可以以你的用户权限在计算机上执行任意代码。

**安全建议**：
- ✅ 仅从**可信来源**安装插件
- ✅ 审查插件源代码（开源项目）
- ✅ 使用项目级作用域限制插件范围
- ✅ 定期检查已安装插件 (`/plugin`)
- ⚠️ 企业环境可使用托管市场控制允许的插件

---

## 💡 最佳实践

### 1. 选择合适的模式

| 场景 | 推荐模式 |
|------|---------|
| 完整功能开发 | `/autopilot` |
| 需求不明确 | `/deep-interview` + `/autopilot` |
| 批量修复 | `/ultrawork` |
| 复杂重构 | `ralph` |
| 多任务并行 | `/team` |

### 2. Token 优化

```bash
# 简单任务使用 lite 模型
export OMC_DEFAULT_MODEL=lite

# 启用 Token 节省模式
ecomode

# 定期清理状态
/omc-doctor --clean
```

### 3. 团队协作

```bash
# 在 .codebuddy/settings.json 中配置项目级技能
{
  "extraKnownMarketplaces": {
    "team-tools": {
      "source": {
        "source": "github",
        "repo": "your-org/codebuddy-plugins"
      }
    }
  }
}
```

---

## 🙏 致谢

本项目 fork 自 [oh-my-claudecode](https://github.com/Yeachan-Heo/oh-my-claudecode)，感谢 [Yeachan Heo](https://github.com/Yeachan-Heo) 的开创性工作。

**灵感来源**：
- [oh-my-opencode](https://github.com/code-yeongyu/oh-my-opencode) - Opencode 多智能体系统
- [Superpowers](https://github.com/obra/superpowers) - Claude Code 增强工具集
- [everything-claude-code](https://github.com/affaan-m/everything-claude-code) - Claude Code 全功能扩展

**特别感谢**：
- CodeBuddy Code 团队提供强大的 Plugin 系统
- 腾讯云 AI 团队的技术支持

---

## 📖 相关文档

- [完整参考文档](docs/REFERENCE.md)
- [CLI 参考](https://www.codebuddy.ai/docs/zh/cli/overview)
- [Plugin 系统文档](https://www.codebuddy.ai/docs/zh/cli/plugin-marketplaces)
- [架构说明](docs/ARCHITECTURE.md)
- [迁移指南](docs/MIGRATION.md)

---

## License

MIT
