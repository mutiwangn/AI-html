#!/bin/bash
cd -- "$(dirname -- "$0")" || exit 1
if command -v python3 >/dev/null 2>&1; then
  python3 server.py
else
  echo "未找到 Python 3。请先安装 Python 3.8 或更新版本。"
  echo "官方下载：https://www.python.org/downloads/"
fi
printf '\n按回车键关闭窗口。'
read -r _lung_exit
