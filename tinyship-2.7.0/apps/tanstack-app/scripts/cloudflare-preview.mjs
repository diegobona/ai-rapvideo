// Development launcher only: application code stays local, configured R2 is remote.
import { spawn, execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const require = createRequire(import.meta.url)
const appDir = fileURLToPath(new URL('../', import.meta.url))
const previewEnv = { ...process.env }
const previewPort = previewEnv.CLOUDFLARE_PREVIEW_PORT || '7002'
const previewState = previewEnv.CLOUDFLARE_PREVIEW_STATE || '.wrangler/state'
if (!/^\d+$/.test(previewPort) || Number(previewPort) < 1024 || Number(previewPort) > 65535) throw new Error('Invalid local preview port')

// Windows browsers use this system proxy, while Node CLI tools require env vars.
// Read the address without changing registry settings or printing credentials.
if (process.platform === 'win32' && !previewEnv.HTTPS_PROXY && !previewEnv.https_proxy) {
  try {
    const server = execFileSync('powershell.exe', ['-NoProfile', '-Command',
      "$previewProxy = Get-ItemProperty -LiteralPath 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings'; if ($previewProxy.ProxyEnable -eq 1) { $previewProxy.ProxyServer }",
    ], { encoding: 'utf8', windowsHide: true }).trim()
    const httpsServer = server.split(';').find((value) => value.startsWith('https='))?.slice(6)
    const proxy = httpsServer || (!server.includes('=') ? server : '')
    if (proxy) {
      const url = new URL(proxy.includes('://') ? proxy : `http://${proxy}`)
      if (url.protocol === 'http:' || url.protocol === 'https:') {
        previewEnv.HTTPS_PROXY = url.href
        previewEnv.HTTP_PROXY ||= url.href
      }
    }
  } catch { /* With no system proxy, use ordinary direct connections. */ }
}

const nodeArgs = []
if (previewEnv.HTTPS_PROXY || previewEnv.https_proxy || previewEnv.HTTP_PROXY || previewEnv.http_proxy) {
  previewEnv.NO_PROXY = [previewEnv.NO_PROXY || previewEnv.no_proxy, 'localhost', '127.0.0.1', '::1'].filter(Boolean).join(',')
  if (process.allowedNodeEnvironmentFlags.has('--use-env-proxy')) nodeArgs.push('--use-env-proxy')
  nodeArgs.push('--require', join(appDir, 'scripts/cloudflare-proxy.cjs'))
}

const wrangler = join(dirname(require.resolve('wrangler/package.json')), 'bin/wrangler.js')
const child = spawn(process.execPath, [...nodeArgs, wrangler, 'dev',
  '--config', 'dist/server/wrangler.json', '--port', previewPort,
  '--local-upstream', 'localhost', '--persist-to', previewState,
  '--var', 'APP_BASE_URL:http://localhost', '--var', `BETTER_AUTH_URL:http://127.0.0.1:${previewPort}`,
  ...process.argv.slice(2),
], { cwd: appDir, env: previewEnv, stdio: 'inherit', windowsHide: true })
child.on('error', (error) => { console.error(error.message); process.exitCode = 1 })
child.on('exit', (code) => { process.exitCode = code ?? 1 })
