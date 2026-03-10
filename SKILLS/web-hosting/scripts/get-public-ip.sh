#!/bin/bash
# 获取公网 IP

curl -s --connect-timeout 5 ifconfig.me 2>/dev/null || \
curl -s --connect-timeout 5 ip.sb 2>/dev/null || \
curl -s --connect-timeout 5 ipinfo.io/ip 2>/dev/null || \
curl -s --connect-timeout 5 icanhazip.com 2>/dev/null || \
curl -s --connect-timeout 5 api.ipify.org 2>/dev/null || \
echo "127.0.0.1"