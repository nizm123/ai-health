@echo off
chcp 65001 >nul
title 停止 AI健康管家
cd /d "%~dp0"
node scripts/stop-all.js
pause
