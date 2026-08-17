# Chrome Network Capture

本工具由 Chrome 扩展和本机 Node 服务组成。你正常操作 Chrome 页面时，扩展会采集所选标签页中的全部 HTTP(S) 请求与可读取响应，并仅发送至本机 `127.0.0.1`。AI/Skill 通过 MCP 工具先读取轻量索引，再按请求 ID 获取具体请求，避免把全部流量或大响应直接放进上下文。

> 采集内容包含原始请求/响应头和正文，可能含 Cookie、Authorization、Token、个人数据和业务日志。仅在已获授权的页面使用；不要把原始捕获内容提交到仓库、工单或外部服务。

## 启动本地服务

要求：Node.js 22.12 或更高版本。无第三方依赖。

```bash
cd chrome-network-capture/companion
npm start
```

服务只监听 `http://127.0.0.1:37777`。原始捕获数据按日期和采集会话保存至本目录的 `captures/YYYY-MM-DD/<sessionId>.jsonl`；同一标签页每次开始采集都会生成独立会话文件。服务启动时会恢复全部 JSONL 文件中的最近保留记录，`DELETE /captures` 或 `network_capture_clear` 会同时清空内存和全部保存文件。

默认保存目录可通过 `NETWORK_CAPTURE_STORAGE_DIR` 覆盖。`captures/` 已被 `.gitignore` 忽略，原始数据可能包含 Cookie、Authorization 和 Token，不应提交或同步到外部服务。

可选限制：

```bash
NETWORK_CAPTURE_MAX_EVENTS=500 NETWORK_CAPTURE_MAX_BODY_BYTES=1048576 npm start
```

## 加载扩展

1. 在 Chrome 打开 `chrome://extensions`。
2. 打开右上角“开发者模式”。
3. 点击“加载已解压的扩展程序”。
4. 选择本目录下的 `extension/` 文件夹。
5. 打开任意 HTTP(S) 页面，点击扩展图标，选择“开始采集”。Chrome 会显示调试连接提示；这是读取网络请求所必需的权限提示。
6. 之后你只需正常操作该标签页。点击“停止采集”、关闭标签或解除调试连接会停止采集。

扩展会采集当前选中的 HTTP(S) 标签页的所有请求；不执行、修改或重放请求。

## MCP 配置

先保持本地服务运行，再将以下配置加入你的 MCP 客户端：

```json
{
  "mcpServers": {
    "chrome-network-capture": {
      "command": "node",
      "args": ["/绝对路径/reverse-skill/chrome-network-capture/companion/mcp.js"]
    }
  }
}
```

提供的工具：

- `network_capture_status`：本地服务和采集会话状态。
- `network_capture_list`：请求轻量索引，支持 URL、方法、状态、MIME 类型过滤。
- `network_capture_get`：按 ID 读取所需部分；仅显式请求时才返回 headers 或 body。
- `network_capture_clear`：清除本机内存缓存。
- `log_search_run`：将日志查询排队，扩展会在唯一已开始采集的标签页中使用当前浏览器登录态执行。
- `log_search_result`：按命令 ID 读取查询结果。

`log_search_run` 不复制 Cookie 到代码或 MCP。扩展只在当前被采集的标签页内向已确认的 `/api/log/log/advanced/search` 发起请求，因此浏览器按正常同源规则携带当前登录态。扩展约每 6 秒轮询一次本地命令；请保持恰好一个标签页处于采集状态。

推荐调用顺序：先用 `network_capture_list`（例如 URL 包含 `log` 或 `search`）定位刚发生的请求，然后用 `network_capture_get` 只读取该请求的 `requestBody`、`responseHeaders` 或 `responseBody`。

## 本地 HTTP 接口

便于调试或接入其他本地工具：

```text
GET    /health
GET    /captures?limit=50&urlIncludes=log
GET    /captures/{id}?include=requestBody,responseBody
DELETE /captures
```

所有接口均只绑定回环地址，不对局域网开放。
