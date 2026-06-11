/**
 * 停止一键启动的所有服务
 * 用法：npm run stop:all  或双击 stop.bat
 */

const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const PID_FILE = path.join(ROOT, '.run', 'pids.json');
const PORTS = [4000, 3001, 19006, 8081];

function log(msg) {
  // eslint-disable-next-line no-console
  console.log(msg);
}

function stopByPidFile() {
  if (!fs.existsSync(PID_FILE)) return false;
  try {
    const data = JSON.parse(fs.readFileSync(PID_FILE, 'utf8'));
    for (const item of data.pids || []) {
      try {
        if (process.platform === 'win32') {
          execSync(`taskkill /PID ${item.pid} /T /F`, { stdio: 'ignore' });
        } else {
          process.kill(item.pid, 'SIGTERM');
        }
        log(`已停止 ${item.name} (PID ${item.pid})`);
      } catch {
        // 进程可能已退出
      }
    }
    fs.unlinkSync(PID_FILE);
    return true;
  } catch {
    return false;
  }
}

function stopByPortsWindows() {
  for (const port of PORTS) {
    try {
      const out = execSync(
        `powershell -NoProfile -Command "(Get-NetTCPConnection -LocalPort ${port} -State Listen -ErrorAction SilentlyContinue).OwningProcess"`,
        { encoding: 'utf8' }
      ).trim();
      const pids = [...new Set(out.split(/\s+/).filter(Boolean))];
      for (const pid of pids) {
        try {
          execSync(`taskkill /PID ${pid} /T /F`, { stdio: 'ignore' });
          log(`已释放端口 ${port} (PID ${pid})`);
        } catch {
          // ignore
        }
      }
    } catch {
      // 端口无监听
    }
  }
}

function stopByPortsUnix() {
  for (const port of PORTS) {
    try {
      const out = execSync(`lsof -ti :${port}`, { encoding: 'utf8' }).trim();
      const pids = out.split('\n').filter(Boolean);
      for (const pid of pids) {
        try {
          process.kill(Number(pid), 'SIGTERM');
          log(`已释放端口 ${port} (PID ${pid})`);
        } catch {
          // ignore
        }
      }
    } catch {
      // 端口无监听
    }
  }
}

log('正在停止 AI健康管家 相关服务...\n');
const stopped = stopByPidFile();
if (!stopped) {
  log('未找到 PID 记录，按端口清理...');
  if (process.platform === 'win32') stopByPortsWindows();
  else stopByPortsUnix();
}
log('\n完成。');
