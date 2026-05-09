# Phone SSH Setup

手机 SSH 配置脚本

## 文件说明

- `setup_phone_ssh.sh` - 一键配置脚本（首次使用）
- `ssh_phone.sh` - 快速连接脚本（日常使用）

## 首次配置

### 前提条件

1. 电脑已安装 ADB
2. 手机开启开发者模式和 USB 调试
3. 手机通过 USB 连接到电脑
4. 已安装 Termux App

### 配置步骤

```bash
# 运行配置脚本
./setup_phone_ssh.sh
```

按提示操作：
1. 打开手机上的 Termux
2. 执行：`sh ~/storage/downloads/termux_ssh_setup.sh`
3. 设置登录密码
4. 等待脚本完成

## 日常连接

配置完成后，以后每次连接：

```bash
./ssh_phone.sh
```

或手动连接：

```bash
# 1. 确保设备连接
adb devices

# 2. 端口转发
adb forward tcp:2222 tcp:8022

# 3. SSH 连接
ssh -p 2222 u0_a19@127.0.0.1
```

## 网络代理

如果手机无网络，脚本会自动设置代理：

```
localhost:8080 → 电脑:7897
```

确保电脑代理（如 Clash）监听在 7897 端口。

## 故障排查

| 问题 | 解决方案 |
|------|----------|
| 未找到设备 | 检查 USB 连接，开启 USB 调试 |
| Termux 无法访问 Download | 在 Termux 中运行 `termux-setup-storage` |
| apt update 失败 | 检查手机网络或代理设置 |
| SSH 连接被拒绝 | 确认已设置密码 `passwd` |
| sshd 无法启动 | 检查 OpenSSH 是否安装 `apt list --installed openssh` |
