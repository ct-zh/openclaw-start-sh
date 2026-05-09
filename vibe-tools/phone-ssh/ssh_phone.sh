#!/bin/bash
#
# 快速连接手机 SSH
#

SSH_LOCAL_PORT=2222
PHONE_USER="u0_a19"

# 检查 ADB 连接
if ! adb devices | grep -q "device$"; then
    echo "✗ 未找到设备"
    echo "请通过 USB 连接手机并开启 USB 调试"
    exit 1
fi

# 设置端口转发
adb forward tcp:$SSH_LOCAL_PORT tcp:8022 2>/dev/null

# 连接
echo "正在连接手机..."
ssh -p $SSH_LOCAL_PORT $PHONE_USER@127.0.0.1
