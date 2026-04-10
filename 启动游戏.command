#!/bin/bash
cd "$(dirname "$0")"
echo "正在启动仙途..."
echo "浏览器打开后即可游玩，关闭此窗口即停止服务器"
echo ""
npx vite --open
