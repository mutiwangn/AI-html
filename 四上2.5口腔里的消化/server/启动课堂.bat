@echo off
chcp 65001 >nul
cd /d "%~dp0"
title 口腔里的消化 - 局域网课堂
py -3 --version >nul 2>&1
if not errorlevel 1 (
    py -3 server.py
    goto :done
)
python --version >nul 2>&1
if not errorlevel 1 (
    python server.py
    goto :done
)
echo 未找到 Python 3。请先安装 Python 3.8 或更新版本。
echo 官方下载：https://www.python.org/downloads/
echo 安装时勾选 Add Python to PATH，然后重新双击本文件。
:done
pause

