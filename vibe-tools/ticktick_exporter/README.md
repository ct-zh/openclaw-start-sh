# 嘀嗒清单数据导出工具

用于安全地从嘀嗒清单（TickTick）的本地数据库中提取笔记数据。

## 功能特性

- **只读操作**：不会修改原始数据库，确保数据安全
- **多种格式**：支持 JSON 和 Markdown 两种导出格式
- **完整数据**：导出任务、项目、标签、检查清单、评论等全部数据
- **易于阅读**：Markdown 格式可以直接用文本编辑器或浏览器查看

## 使用方法

### 基本用法

```bash
# 使用默认路径
python3 export_ticktick.py

# 指定数据库文件路径
python3 export_ticktick.py /path/to/database.storedata

# 指定数据库和输出目录
python3 export_ticktick.py /path/to/database.storedata /path/to/output
```

### 默认路径

- **数据库**：`~/Desktop/ticktick_backup/OSXCoreDataObjC.storedata`
- **输出目录**：`~/Desktop/ticktick_export`

## 导出内容

### 数据统计
- 任务（包含已删除的过滤）：478 个
- 项目：7 个
- 标签：6 个
- 检查清单项：按实际情况
- 评论：按实际情况

### 导出文件

| 文件名 | 格式 | 大小 | 说明 |
|--------|------|------|------|
| tasks.json | JSON | ~960KB | 任务数据，包含标题、内容、描述、状态、项目等 |
| tasks.md | Markdown | ~820KB | 任务数据，便于直接阅读 |
| projects.json | JSON | ~1.1KB | 项目列表 |
| tags.json | JSON | ~890B | 标签列表 |
| checklist_items.json | JSON | 按实际 | 检查清单项 |
| comments.json | JSON | 按实际 | 评论数据 |

## 数据安全

1. **原始数据库备份**：建议先备份原始数据库文件
2. **只读操作**：脚本仅读取数据，不进行任何写操作
3. **可重复执行**：可以随时重新导出，不会影响原数据

## 嘀嗒清单数据库位置

### macOS
- **数据库**：`~/Library/Group Containers/75TY9UT8AY.com.TickTick.task.mac/OSXCoreDataObjC.storedata`
- **WAL日志**：同目录下的 `OSXCoreDataObjC.storedata-wal`
- **共享内存**：同目录下的 `OSXCoreDataObjC.storedata-shm`

### 备份建议

```bash
# 备份整个数据库目录
cp -r ~/Library/Group\ Containers/75TY9UT8AY.com.TickTick.task.mac/ ~/Desktop/ticktick_backup/
```

## 数据结构

### 任务（ZTTTASK）
- ZTITLE: 任务标题
- ZCONTENT: 任务内容（富文本）
- ZDEZCRIPTION: 任务描述
- ZPROJECTID: 所属项目ID
- ZSTATUS: 任务状态（0=未完成，1=已完成）
- ZPRIORITY: 优先级
- ZSTRINGOFTAGS: 标签字符串
- ZCREATIONDATE: 创建时间
- ZENDDATE: 截止日期
- ZCOMPLETIONDATE: 完成时间

### 项目（ZTTPROJECT）
- ZNAME: 项目名称
- ZKIND: 项目类型
- ZCOLOR: 项目颜色
- ZVIEWMODE: 视图模式

### 标签（ZTTTAG）
- ZNAME: 标签名称
- ZLABEL: 标签标签
- ZCOLOR: 标签颜色

## 注意事项

1. 嘀嗒清单使用 SQLite 数据库，建议在应用关闭时进行备份
2. WAL 日志文件是写前日志，建议一起备份以确保数据完整性
3. 导出的数据可能包含隐私信息，请妥善保管
4. Markdown 文件支持中文，使用 UTF-8 编码

## 依赖

- Python 3.x
- sqlite3（Python 标准库）

## 常见问题

### Q: 如何查看导出的 Markdown 文件？
A: 可以使用任何文本编辑器，或者用浏览器打开查看格式化的内容。

### Q: 可以导出到其他格式吗？
A: 目前只支持 JSON 和 Markdown，如需其他格式可以修改脚本。

### Q: 导出的数据包含已删除的任务吗？
A: 不包含，脚本会过滤掉 `ZDELETIONSTATUS != 0` 的任务。

### Q: 可以只导出特定项目的任务吗？
A: 目前不支持，可以修改 SQL 查询语句添加过滤条件。

## 许可

本工具仅用于个人数据备份，请勿用于商业用途。

## 更新日志

### v1.0.0 (2026-02-21)
- 初始版本
- 支持任务、项目、标签、检查清单、评论的导出
- 支持 JSON 和 Markdown 两种格式
