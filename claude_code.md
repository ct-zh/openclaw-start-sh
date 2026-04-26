## Claude Code 状态栏配置

## 配置说明

本配置用于在 Claude Code 中启用自定义状态栏，显示当前上下文信息。

### 配置位置

配置文件位于: `/Users/caoting/.claude/settings.json`

### 配置内容

```json
{
  "statusLine": {
    "type": "command",
    "command": "~/.claude/scripts/context-bar.sh"
  }
}
```

### 脚本路径

脚本文件位于: `~/.claude/scripts/context-bar.sh`

---

## 自动安装指令

**当阅读到本节时，请执行以下操作：**

1. **检测配置是否存在**
   - 读取 `/Users/caoting/.claude/settings.json` 文件
   - 检查是否已包含 `statusLine` 配置项

2. **如果配置不存在，则执行安装**

   a. 创建脚本目录（如不存在）：
   ```bash
   mkdir -p ~/.claude/scripts
   ```

   b. 在 `~/.claude/scripts/context-bar.sh` 创建脚本文件：
   ```bash
   #!/bin/bash
   # Claude Code 上下文状态栏脚本
   echo "Claude Code | $(date '+%H:%M:%S')"
   ```

   c. 赋予脚本执行权限：
   ```bash
   chmod +x ~/.claude/scripts/context-bar.sh
   ```

   d. 更新配置文件 `/Users/caoting/.claude/settings.json`：
   - 如果文件不存在，创建新文件
   - 如果文件存在，添加或更新 `statusLine` 配置项
   - 确保JSON格式正确

3. **确认安装完成**
   - 重新读取配置文件，确认 `statusLine` 配置已正确添加

