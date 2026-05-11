## Claude Code 状态栏配置

### 配置说明

在 `~/.claude/settings.json` 中添加 `statusLine` 字段，可以在 Claude Code 底部状态栏显示自定义信息（如当前时间、Git 分支等）。

#### 第一步：创建脚本

```bash
mkdir -p ~/.claude/scripts
```

在 `~/.claude/scripts/context-bar.sh` 创建脚本：

```bash
#!/bin/bash
echo "Claude Code | $(date '+%H:%M:%S')"
```

赋予执行权限：

```bash
chmod +x ~/.claude/scripts/context-bar.sh
```

#### 第二步：更新配置文件

在 `~/.claude/settings.json` 中添加（注意与已有字段合并，不要覆盖整个文件）：

```json
{
  "statusLine": {
    "type": "command",
    "command": "~/.claude/scripts/context-bar.sh"
  }
}
```

完整示例（已有其他配置时的合并写法）：

```json
{
  "model": "sonnet",
  "statusLine": {
    "type": "command",
    "command": "~/.claude/scripts/context-bar.sh"
  }
}
```

#### 第三步：验证

重启 Claude Code，状态栏应显示脚本输出内容。

#### 注意事项

- `settings.json` 是 JSON 格式，合并时需保持结构完整，不能直接追加
- 脚本必须有执行权限（`chmod +x`）
- 脚本输出会每隔几秒刷新一次，保持脚本执行速度快（避免耗时操作）

---

## GitHub 仓库信息获取

在 Claude Code 中获取 GitHub 仓库信息有两种方式，选择取决于工具可用性和 token 消耗考量。

### 方式一：gh CLI（推荐）

`gh` 是 GitHub 官方命令行工具，返回结构化纯文本，token 消耗少。

**安装：**

```bash
brew install gh
```

**登录（首次使用）：**

```bash
gh auth login --hostname github.com --git-protocol https --web
```

按提示在浏览器完成授权，或使用 `GH_TOKEN` 环境变量传入 Personal Access Token。

**常用命令：**

```bash
# 查看仓库基本信息和 README
gh repo view owner/repo

# 查看 PR 列表
gh pr list -R owner/repo

# 查看 issue
gh issue list -R owner/repo

# 查看 workflow 运行状态
gh run list -R owner/repo

# 查看 release
gh release list -R owner/repo
```

### 方式二：WebFetch 工具

无需安装，但会抓取完整 HTML 页面转 markdown，包含大量导航、侧边栏等无关内容，token 消耗明显更高。适合 `gh` 不可用时的备选方案。

### token 消耗对比

| 方式 | 返回内容 | token 消耗 |
|------|---------|-----------|
| `gh repo view` | 结构化纯文本 | 低 |
| WebFetch | 完整页面转 markdown | 高（含大量无关内容） |

**结论：优先使用 `gh`，仅在 `gh` 不可用时降级到 WebFetch。**

### 在 Claude Code 中的使用场景

Claude Code 内置了对 `gh` 的支持，系统提示中明确建议：对于 GitHub URL，优先用 `gh` CLI 而非 WebFetch。例如：

```bash
# 查看 PR 详情（比 WebFetch 节省 60-80% token）
gh pr view 42 -R owner/repo

# 查看 PR 评论
gh api repos/owner/repo/pulls/42/comments
```



## RTK — Rust Token Killer

RTK（[rtk-ai/rtk](https://github.com/rtk-ai/rtk)）是一个 CLI 代理工具，用 Rust 编写。核心功能是在命令输出到达 LLM 之前进行过滤和压缩，减少 60-90% 的 token 消耗。单一二进制文件，零外部依赖，支持 100+ 常用命令，官方明确支持 Claude Code。

### 工作原理

通过 Claude Code 的 `PreToolUse` hook 拦截所有 Bash 工具调用，将 `git status` 自动改写为 `rtk git status`，LLM 收到的是压缩后的输出。改写过程对 LLM 完全透明。

注意：只影响 Bash 工具调用，Claude Code 内置的 `Read`、`Grep`、`Glob` 工具不经过 hook，不受影响。

### 安装

> 以下命令供大模型直接执行，完成 RTK 的完整安装和配置。执行前会自动备份 `~/.claude/settings.json`。

```bash
# 1. 备份现有配置
cp ~/.claude/settings.json ~/.claude/settings.json.bak.$(date +%Y%m%d_%H%M%S)

# 2. 安装 RTK
brew install rtk

# 3. 验证安装
rtk --version

# 4. 为 Claude Code 安装 hook（非交互式）
rtk init -g --auto-patch

# 5. 验证 hook 已注入
rtk init --show
```

安装完成后**重启 Claude Code** 使 hook 生效。

### 影响说明

| 影响 | 说明 |
|------|------|
| token 节省 | 30 分钟会话预计节省约 80%（~118k → ~24k tokens） |
| 透明改写 | `git status` 自动变成 `rtk git status`，LLM 感知不到 |
| 仅影响 Bash 工具 | `Read`、`Grep`、`Glob` 不经过 hook，不受影响 |
| 失败兜底 | 命令失败时保存完整原始输出到本地文件，供 LLM 读取 |
| settings.json 变更 | 注入 `PreToolUse` hook 配置，建议安装前备份 |

### 对大模型能力的影响

RTK 只压缩**命令输出**（工具调用返回结果），不触碰用户消息、模型回复和推理过程，不影响模型的理解能力和输出质量。

上下文窗口有限，大量冗余命令输出（如 `cargo test` 的 500 行日志）会挤占有效信息空间。RTK 过滤噪音后，模型能在同样的上下文窗口里保留更多有意义的对话历史，反而有正面效果。

### 卸载

```bash
rtk init -g --uninstall  # 移除 hook 和 settings.json 中的配置
brew uninstall rtk
```

---

## caveman — 压缩模型输出

caveman（[JuliusBrussee/caveman](https://github.com/JuliusBrussee/caveman)）是 Claude Code skill，让模型像穴居人一样说话——去掉冠词、客套、废话，保留全部技术内容，平均减少 **65-75% 输出 token**。

### 工作原理

通过 `PostToolUse` hook 和 session 注入，强制模型用极简风格回复。压缩的是**模型输出**，不处理用户输入，不影响推理过程。

与 RTK 互补：

| 工具 | 压缩对象 | 方向 |
|------|---------|------|
| RTK | Bash 命令输出 | 工具结果 → 模型 |
| caveman | 模型回复 | 模型 → 用户 |

### 压缩级别

| 级别 | 命令 | 效果 |
|------|------|------|
| lite | `/caveman lite` | 去掉客套和填充词 |
| full | `/caveman full` | 默认穴居人风格 |
| ultra | `/caveman ultra` | 电报式极简 |
| wenyan | `/caveman wenyan` | 文言文风格（中文更短） |

触发：`/caveman`；关闭：`normal mode`。

### 安装

> 以下命令供大模型直接执行，完成 caveman 的完整安装。需要 Node ≥18。

```bash
# 验证 Node 版本（需要 ≥18）
node --version

# 安装 caveman（自动检测 Claude Code 并安装插件 + hooks）
curl -fsSL https://raw.githubusercontent.com/JuliusBrussee/caveman/main/install.sh | bash
```

安装完成后**重启 Claude Code** 使 hook 生效。

### 对中文的影响

caveman 压缩模型输出，不处理用户输入，中文提问不受影响。中文回复建议用 `wenyan` 模式，压缩效果优于默认 `full` 模式。

### 附带工具

| 命令 | 功能 |
|------|------|
| `/caveman-commit` | 生成简洁 Conventional Commit 消息 |
| `/caveman-review` | 单行 PR review 评论 |
| `/caveman-stats` | 查看本次会话 token 节省统计 |
| `/caveman-compress <file>` | 压缩 CLAUDE.md 等记忆文件（节省约 46% 输入 token） |

### 卸载

```bash
claude plugin uninstall caveman@caveman
```