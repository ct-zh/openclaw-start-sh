# OpenClaw 部署问题记录

## Gateway 配对问题

### 问题现象

Gateway 连接失败，报错：
```
unauthorized: gateway token mismatch
```

或

```
pairing required
```

### 检查清单

#### 1. 检查 Token 是否一致

**配置文件** `~/.openclaw/openclaw.json`：
```bash
cat ~/.openclaw/openclaw.json | grep -A5 '"auth"'
cat ~/.openclaw/openclaw.json | grep -A3 '"remote"'
```

确认 `gateway.auth.token` 和 `gateway.remote.token` 值相同。

#### 2. 检查环境变量覆盖

**Systemd service 文件** `~/.config/systemd/user/openclaw-gateway.service`：
```bash
systemctl --user cat openclaw-gateway | grep -i token
```

检查是否有 `OPENCLAW_GATEWAY_TOKEN` 环境变量覆盖了配置文件中的 token。

#### 3. 检查运行进程的实际环境变量

```bash
# 获取 gateway 进程 PID
ps aux | grep openclaw-gateway | grep -v grep

# 检查进程环境变量
cat /proc/<PID>/environ | tr '\0' '\n' | grep -i token
```

#### 4. 检查设备配对状态

```bash
cat ~/.openclaw/devices/pending.json  # 待批准的配对请求
cat ~/.openclaw/devices/paired.json   # 已配对设备
```

### 解决方案

#### 问题一：Token 不匹配

如果 systemd service 文件中的环境变量与配置文件不一致：

```bash
# 方法1：修改 service 文件中的 token
sed -i 's/OPENCLAW_GATEWAY_TOKEN=<旧值>/OPENCLAW_GATEWAY_TOKEN=<新值>/' ~/.config/systemd/user/openclaw-gateway.service

# 方法2：删除环境变量，让 gateway 使用配置文件中的 token
# 编辑 service 文件，删除 Environment="OPENCLAW_GATEWAY_TOKEN=..." 行

# 重载并重启
systemctl --user daemon-reload
systemctl --user restart openclaw-gateway
```

#### 问题二：设备配对循环依赖

CLI 需要 gateway 连接才能批准配对，但 gateway 需要配对才能连接，形成循环依赖。

**解决方案**：手动修改 `~/.openclaw/devices/paired.json`，将待批准设备直接写入：

1. 从 `pending.json` 获取待批准设备信息：
```bash
cat ~/.openclaw/devices/pending.json
```

2. 手动编辑 `paired.json`：
```bash
nano ~/.openclaw/devices/paired.json
```

3. 添加设备记录（示例）：
```json
{
  "<deviceId>": {
    "deviceId": "<deviceId>",
    "publicKey": "<从 pending.json 复制>",
    "displayName": "agent",
    "platform": "linux",
    "clientId": "gateway-client",
    "clientMode": "backend",
    "role": "operator",
    "roles": ["operator"],
    "scopes": ["operator.admin", "operator.approvals", "operator.pairing"],
    "token": "<gateway.auth.token 的值>",
    "pairedAt": <时间戳>,
    "lastSeen": <时间戳>
  }
}
```

### 环境变量优先级

```
OPENCLAW_GATEWAY_TOKEN 环境变量 > gateway.auth.token 配置项
```

当两者同时存在时，环境变量优先。

### 相关文件

| 文件 | 作用 |
|------|------|
| `~/.openclaw/openclaw.json` | OpenClaw 主配置文件 |
| `~/.config/systemd/user/openclaw-gateway.service` | Gateway systemd 服务配置 |
| `~/.openclaw/devices/pending.json` | 待批准的设备配对请求 |
| `~/.openclaw/devices/paired.json` | 已配对设备列表 |