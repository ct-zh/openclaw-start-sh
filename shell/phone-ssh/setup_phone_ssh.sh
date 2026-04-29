#!/bin/bash
#
# 手机 SSH 配置脚本
# 从零配置手机 SSH 连接
#

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== 手机 SSH 配置脚本 ===${NC}"
echo ""

# 配置
PROXY_PORT=8080
PROXY_LOCAL_PORT=7897
SSH_LOCAL_PORT=2222
SSH_PHONE_PORT=8022

# 步骤 0: 检查 ADB 是否安装
echo -e "${YELLOW}[0/8]${NC} 检查 ADB 是否安装..."
if ! command -v adb &> /dev/null; then
    echo -e "  ${RED}✗${NC} 电脑上未找到 ADB"
    echo ""
    echo "请先安装 ADB："
    echo ""
    echo "  macOS:"
    echo "    brew install android-platform-tools"
    echo ""
    echo "  Ubuntu/Debian:"
    echo "    sudo apt install android-tools-adb"
    echo ""
    echo "  Windows:"
    echo "    下载: https://developer.android.com/studio/releases/platform-tools"
    echo ""
    exit 1
else
    ADB_VERSION=$(adb version | head -1)
    echo -e "  ${GREEN}✓${NC} ADB 已安装: $ADB_VERSION"
fi

# 步骤 1: 检查 ADB 连接
echo ""
echo -e "${YELLOW}[1/8]${NC} 检查手机连接..."
if adb devices | grep -q "device$"; then
    DEVICE_ID=$(adb devices | grep "device$" | awk '{print $1}')
    echo -e "  ${GREEN}✓${NC} 设备已连接: $DEVICE_ID"
else
    echo -e "  ${RED}✗${NC} 未找到设备。请检查："
    echo "    1. 手机已开启 USB 调试"
    echo "    2. 手机通过 USB 连接到电脑"
    echo "    3. 已在手机上确认 USB 调试授权"
    exit 1
fi

# 步骤 2: 检查 Termux 是否安装
echo ""
echo -e "${YELLOW}[2/8]${NC} 检查 Termux 是否安装..."
if adb shell pm list packages | grep -q "com.termux"; then
    echo -e "  ${GREEN}✓${NC} Termux 已安装"
else
    echo -e "  ${RED}✗${NC} 未找到 Termux。请先安装："
    echo "    下载: https://github.com/termux/termux-app/releases"
    echo "    安装: adb install termux-app_latest.apk"
    exit 1
fi

# 步骤 3: 设置网络代理（如果需要）
echo ""
echo -e "${YELLOW}[3/8]${NC} 设置网络代理..."
if adb reverse tcp:$PROXY_PORT tcp:$PROXY_LOCAL_PORT 2>/dev/null; then
    echo -e "  ${GREEN}✓${NC} 代理已转发: localhost:$PROXY_PORT → localhost:$PROXY_LOCAL_PORT"
else
    echo -e "  ${YELLOW}⚠${NC} 代理设置跳过（可能不需要）"
fi

# 步骤 4: 创建 Termux 设置脚本
echo ""
echo -e "${YELLOW}[4/8]${NC} 创建 Termux 配置脚本..."
adb shell "cat > /sdcard/Download/termux_ssh_setup.sh << 'EOFTERMUX'
#!/data/data/com.termux/files/usr/bin/bash

echo '=== Termux SSH 配置 ==='
echo ''

# 授权存储
echo '[1/5] 授权存储访问...'
termux-setup-storage
echo '请在弹窗中点击允许'
sleep 2

# 设置代理
echo ''
echo '[2/5] 设置网络代理...'
export http_proxy=http://127.0.0.1:$PROXY_PORT
export https_proxy=http://127.0.0.1:$PROXY_PORT

# 测试网络
echo ''
echo '[3/5] 测试网络连接...'
if curl -I --connect-timeout 5 https://www.google.com >/dev/null 2>&1; then
    echo '  网络正常'
else
    echo '  警告: 网络可能不可用'
fi

# 安装 OpenSSH
echo ''
echo '[4/5] 安装 OpenSSH...'
apt update -y
apt install -y openssh

# 设置密码
echo ''
echo '[5/5] 设置登录密码...'
passwd

# 启动 SSH 服务
echo ''
echo '启动 SSH 服务...'
sshd

sleep 2
if pgrep sshd >/dev/null; then
    echo '✓ SSH 服务已启动 (PID: '$(pgrep sshd)')'
else
    echo '✗ SSH 服务启动失败'
    exit 1
fi

echo ''
echo '=== 配置完成 ==='
echo '用户名:' \$(whoami)
echo '手机 SSH 端口: 8022'
EOFTERMUX
chmod 755 /sdcard/Download/termux_ssh_setup.sh"
echo -e "  ${GREEN}✓${NC} 配置脚本已创建: /sdcard/Download/termux_ssh_setup.sh"

# 步骤 5: 等待用户在 Termux 中执行脚本
echo ""
echo -e "${YELLOW}[5/8]${NC} 请在手机上执行以下操作："
echo "  1. 打开手机上的 Termux 应用"
echo "  2. 执行: sh ~/storage/downloads/termux_ssh_setup.sh"
echo "  3. 按提示设置登录密码"
echo ""
read -p "完成后按回车继续..."

# 步骤 6: 设置 SSH 端口转发
echo ""
echo -e "${YELLOW}[6/8]${NC} 设置 SSH 端口转发..."
adb forward tcp:$SSH_LOCAL_PORT tcp:$SSH_PHONE_PORT
echo -e "  ${GREEN}✓${NC} SSH 端口已转发: localhost:$SSH_LOCAL_PORT → phone:$SSH_PHONE_PORT"

# 步骤 7: 获取连接信息
echo ""
echo -e "${YELLOW}[7/8]${NC} 获取连接信息..."
PHONE_USER=$(adb shell "run-as com.termux whoami 2>/dev/null || echo 'u0_a19'")
echo -e "  用户名: ${GREEN}$PHONE_USER${NC}"
echo ""

# 步骤 8: 显示连接命令
echo -e "${GREEN}=== 配置完成 ===${NC}"
echo ""
echo "使用以下命令连接手机："
echo "  ${GREEN}ssh -p $SSH_LOCAL_PORT $PHONE_USER@127.0.0.1${NC}"
echo ""
echo "断开连接: exit"
echo ""
