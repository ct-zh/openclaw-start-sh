#!/usr/bin/env python3
"""
嘀嗒清单数据导出工具
只读操作，不会修改原始数据库
"""

import sqlite3
import json
from datetime import datetime
from pathlib import Path


def export_ticktick_data(db_path, output_dir):
    """
    导出嘀嗒清单数据
    
    Args:
        db_path: 数据库文件路径
        output_dir: 输出目录
    """
    output_path = Path(output_dir)
    output_path.mkdir(exist_ok=True)
    
    print(f"正在连接数据库: {db_path}")
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    # 导出项目
    print("\n导出项目...")
    cursor.execute("""
        SELECT Z_PK, ZNAME, ZKIND, ZCOLOR, ZENTITYID, ZVIEWMODE
        FROM ZTTPROJECT
        WHERE ZCLOSED = 0 OR ZCLOSED IS NULL
    """)
    projects = [dict(row) for row in cursor.fetchall()]
    
    with open(output_path / "projects.json", 'w', encoding='utf-8') as f:
        json.dump(projects, f, ensure_ascii=False, indent=2)
    print(f"  导出 {len(projects)} 个项目")
    
    # 导出任务（仅未删除的）
    print("\n导出任务...")
    cursor.execute("""
        SELECT 
            Z_PK, ZTITLE, ZCONTENT, ZDEZCRIPTION, ZENTITYID, 
            ZPROJECTID, ZSTATUS, ZPRIORITY, ZCREATIONDATE, 
            ZENDDATE, ZCOMPLETIONDATE, ZKIND, ZSTRINGOFTAGS
        FROM ZTTTASK
        WHERE ZDELETIONSTATUS = 0 OR ZDELETIONSTATUS IS NULL
    """)
    tasks = [dict(row) for row in cursor.fetchall()]
    
    with open(output_path / "tasks.json", 'w', encoding='utf-8') as f:
        json.dump(tasks, f, ensure_ascii=False, indent=2)
    print(f"  导出 {len(tasks)} 个任务")
    
    # 导出标签
    print("\n导出标签...")
    cursor.execute("""
        SELECT Z_PK, ZNAME, ZLABEL, ZCOLOR, ZENTITYID
        FROM ZTTTAG
    """)
    tags = [dict(row) for row in cursor.fetchall()]
    
    with open(output_path / "tags.json", 'w', encoding='utf-8') as f:
        json.dump(tags, f, ensure_ascii=False, indent=2)
    print(f"  导出 {len(tags)} 个标签")
    
    # 导出为Markdown文件（更易读）
    print("\n导出Markdown文件...")
    with open(output_path / "tasks.md", 'w', encoding='utf-8') as f:
        f.write("# 嘀嗒清单任务导出\n\n")
        f.write(f"导出时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n")
        f.write(f"任务总数: {len(tasks)}\n\n")
        f.write("---\n\n")
        
        for task in tasks:
            f.write(f"## {task.get('ZTITLE', '无标题')}\n\n")
            
            if task.get('ZCONTENT'):
                f.write(f"**内容:**\n{task['ZCONTENT']}\n\n")
            
            if task.get('ZDEZCRIPTION'):
                f.write(f"**描述:**\n{task['ZDEZCRIPTION']}\n\n")
            
            status_map = {0: '未完成', 1: '已完成', 2: '已删除'}
            f.write(f"- **状态:** {status_map.get(task.get('ZSTATUS', 0), '未知')}\n")
            
            if task.get('ZPROJECTID'):
                project = next((p for p in projects if p['ZENTITYID'] == task['ZPROJECTID']), None)
                if project:
                    f.write(f"- **项目:** {project.get('ZNAME', '未知')}\n")
            
            if task.get('ZSTRINGOFTAGS'):
                f.write(f"- **标签:** {task['ZSTRINGOFTAGS']}\n")
            
            if task.get('ZENDDATE'):
                f.write(f"- **截止日期:** {task['ZENDDATE']}\n")
            
            if task.get('ZCREATIONDATE'):
                f.write(f"- **创建时间:** {task['ZCREATIONDATE']}\n")
            
            f.write("\n---\n\n")
    
    print(f"  导出 Markdown 文件完成")
    
    # 导出清单项
    print("\n导出检查清单...")
    cursor.execute("""
        SELECT 
            c.ZTITLE, c.ZSTATUS, c.ZSORTORDER,
            t.ZTITLE as task_title
        FROM ZTTCHECKLISTITEM c
        LEFT JOIN ZTTTASK t ON c.ZTASK = t.Z_PK
    """)
    checklist_items = [dict(row) for row in cursor.fetchall()]
    
    with open(output_path / "checklist_items.json", 'w', encoding='utf-8') as f:
        json.dump(checklist_items, f, ensure_ascii=False, indent=2)
    print(f"  导出 {len(checklist_items)} 个检查清单项")
    
    # 导出评论
    print("\n导出评论...")
    cursor.execute("""
        SELECT ZTITLE, ZCREATIONDATE, ZTASKID
        FROM ZTTCOMMENT
    """)
    comments = [dict(row) for row in cursor.fetchall()]
    
    with open(output_path / "comments.json", 'w', encoding='utf-8') as f:
        json.dump(comments, f, ensure_ascii=False, indent=2)
    print(f"  导出 {len(comments)} 条评论")
    
    conn.close()
    
    print(f"\n✅ 导出完成！文件保存在: {output_path}")
    print("\n导出的文件:")
    print("  - tasks.json      (任务数据JSON格式)")
    print("  - tasks.md        (任务数据Markdown格式)")
    print("  - projects.json   (项目数据)")
    print("  - tags.json       (标签数据)")
    print("  - checklist_items.json (检查清单项)")
    print("  - comments.json   (评论数据)")


if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1:
        db_path = sys.argv[1]
    else:
        db_path = "~/Desktop/ticktick_backup/OSXCoreDataObjC.storedata"
    
    if len(sys.argv) > 2:
        output_dir = sys.argv[2]
    else:
        output_dir = "~/Desktop/ticktick_export"
    
    # 展开路径
    db_path = Path(db_path).expanduser()
    output_dir = Path(output_dir).expanduser()
    
    if not db_path.exists():
        print(f"错误: 数据库文件不存在: {db_path}")
        sys.exit(1)
    
    export_ticktick_data(db_path, output_dir)
