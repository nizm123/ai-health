@echo off
chcp 65001 >nul
title AI健康管家
cd /d "%~dp0"

where node >nul 2>&1
if errorlevel 1 (
    echo [错误] 未检测到 Node.js，请先安装：https://nodejs.org/
    pause
    exit /b 1
)

node scripts/start-all.js
pause
