#!/bin/bash
# 在 Termux 中安装完整的 Linux 发行版

echo "=== 安装 proot-distro ==="
pkg install proot-distro -y

echo ""
echo "=== 可用的发行版 ==="
proot-distro list

echo ""
echo "=== 安装 Ubuntu（推荐） ==="
proot-distro install ubuntu

echo ""
echo "=== 启动 Ubuntu ==="
proot-distro login ubuntu

# 在 Ubuntu 中就可以安装 Docker 了！
