/**
 * 一键启动：云端 API + Web 代理 + Expo Web 前端
 * 用法：npm run dev:all  或双击 start.bat
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');

const ROOT = path.join(__dirname, '..');
const PID_FILE = path.join(ROOT, '.run', 'pids.json');
const WEB_URL = 'http://localhost:19006';

const children = [];

function log(msg) {
  // eslint-disable-next-line no-console
  console.log(msg);
}

function loadEnv() {
  try {
    require('dotenv').config({ path: path.join(ROOT, '.env') });
  } catch {
    // dotenv 由 expo 依赖提供，通常可用
  }
}

function ensureEnv() {
  const envPath = path.join(ROOT, '.env');
  const examplePath = path.join(ROOT, '.env.example');
  if (!fs.existsSync(envPath) && fs.existsSync(examplePath)) {
    fs.copyFileSync(examplePath, envPath);
    log('已从 .env.example 创建 .env，请填写 EXPO_PUBLIC_SILICONFLOW_API_KEY 后重新启动');
  }
}

function runSync(cmd, args, options = {}) {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, {
      cwd: ROOT,
      shell: true,
      stdio: 'inherit',
      ...options,
    });
    proc.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} 退出码 ${code}`))));
    proc.on('error', reject);
  });
}

async function ensureDeps() {
  if (!fs.existsSync(path.join(ROOT, 'node_modules'))) {
    log('首次运行，正在安装依赖（约 1～2 分钟）...\n');
    await runSync('npm', ['install']);
    log('');
  }
}

function spawnService(name, command, args) {
  const proc = spawn(command, args, {
    cwd: ROOT,
    shell: true,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: process.env,
  });

  const prefix = `[${name}]`;
  proc.stdout.on('data', (chunk) => process.stdout.write(`${prefix} ${chunk}`));
  proc.stderr.on('data', (chunk) => process.stderr.write(`${prefix} ${chunk}`));
  proc.on('exit', (code) => {
    if (code !== 0 && code !== null) {
      log(`\n${prefix} 已退出 (code=${code})`);
    }
  });

  children.push({ name, proc });
  return proc;
}

function savePids() {
  fs.mkdirSync(path.dirname(PID_FILE), { recursive: true });
  fs.writeFileSync(
    PID_FILE,
    JSON.stringify(
      {
        startedAt: new Date().toISOString(),
        pids: children.map((c) => ({ name: c.name, pid: c.proc.pid })),
      },
      null,
      2
    )
  );
}

function waitForUrl(url, timeoutMs = 180000) {
  const deadline = Date.now() + timeoutMs;
  return new Promise((resolve) => {
    const tryOnce = () => {
      if (Date.now() > deadline) {
        resolve(false);
        return;
      }
      const req = http.get(url, (res) => {
        res.resume();
        resolve(res.statusCode >= 200 && res.statusCode < 500);
      });
      req.on('error', () => setTimeout(tryOnce, 1500));
      req.setTimeout(3000, () => {
        req.destroy();
        setTimeout(tryOnce, 1500);
      });
    };
    tryOnce();
  });
}

function openBrowser(url) {
  const platform = process.platform;
  let cmd;
  let args;
  if (platform === 'win32') {
    cmd = 'cmd';
    args = ['/c', 'start', '', url];
  } else if (platform === 'darwin') {
    cmd = 'open';
    args = [url];
  } else {
    cmd = 'xdg-open';
    args = [url];
  }
  spawn(cmd, args, { shell: platform === 'win32', detached: true, stdio: 'ignore' }).unref();
}

function cleanup() {
  log('\n正在停止所有服务...');
  for (const { name, proc } of children) {
    try {
      if (process.platform === 'win32') {
        spawn('taskkill', ['/PID', String(proc.pid), '/T', '/F'], {
          shell: true,
          stdio: 'ignore',
        });
      } else {
        proc.kill('SIGTERM');
      }
    } catch {
      log(`停止 ${name} 失败`);
    }
  }
  try {
    if (fs.existsSync(PID_FILE)) fs.unlinkSync(PID_FILE);
  } catch {
    // ignore
  }
  setTimeout(() => process.exit(0), 500);
}

async function main() {
  loadEnv();
  ensureEnv();

  if (!fs.existsSync(path.join(ROOT, '.env'))) {
    log('错误：未找到 .env 文件，请复制 .env.example 为 .env 并配置 API Key');
    process.exit(1);
  }

  await ensureDeps();

  log('========================================');
  log('  AI健康管家 - 一键启动');
  log('========================================');
  log('  云端 API  : http://localhost:4000');
  log('  Web 代理  : http://localhost:3001');
  log('  前端 Web  : http://localhost:19006');
  log('========================================\n');

  spawnService('cloud', 'node', ['cloud-server.js']);
  spawnService('proxy', 'node', ['proxy-server.js']);
  spawnService('web', 'npx', ['expo', 'start', '--web']);

  savePids();

  const [cloudOk, proxyOk, webOk] = await Promise.all([
    waitForUrl('http://localhost:4000/health', 30000),
    waitForUrl('http://localhost:3001/health', 30000),
    waitForUrl(WEB_URL, 180000),
  ]);

  if (cloudOk) log('[就绪] 云端 API');
  else log('[警告] 云端 API 启动超时，请检查 4000 端口');

  if (proxyOk) log('[就绪] Web 代理');
  else log('[警告] Web 代理启动超时，请检查 3001 端口');

  if (webOk) {
    log('[就绪] 前端 Web');
    log(`\n正在打开浏览器：${WEB_URL}`);
    openBrowser(WEB_URL);
  } else {
    log('[警告] 前端启动较慢，请稍后手动访问 ' + WEB_URL);
  }

  log('\n按 Ctrl+C 停止所有服务\n');
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

main().catch((err) => {
  log(`启动失败：${err.message}`);
  cleanup();
});
