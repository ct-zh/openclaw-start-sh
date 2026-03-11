用户指定：只要进行联网搜索，优先使用 searxng skill。

## Feishu 插件 Bug

**bitable.ts 配置读取 bug**：`/opt/openclaw/extensions/feishu/src/bitable.ts` 直接从 `channels.feishu.appId/appSecret` 读取凭证，不支持多账户配置模式。导致 `feishu_bitable_*` 工具在多账户配置下无法注册。

修复方案：使用 `listEnabledFeishuAccounts()` 替代直接读取顶层配置。

详情见 `memory/2026-03-11.md`。

## 代理使用规则
- **除非用户特别说明，否则不要开启代理**
- Mihomo 已安装：`~/bin/mihomo`
- 配置文件：`~/.config/mihomo/config.yaml`
- 需要时启动：`~/bin/mihomo -d ~/.config/mihomo`
- 停止：`pkill -f mihomo`
