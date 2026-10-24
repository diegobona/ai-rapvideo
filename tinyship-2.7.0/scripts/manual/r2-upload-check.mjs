// Run against local preview only. Upload an existing public illustration, read
// it back, then remove this check's exact R2 object and local guest records.
import assert from 'node:assert/strict'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { createRequire } from 'node:module'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
const require = createRequire(import.meta.url)
const root = fileURLToPath(new URL('../../', import.meta.url))
const app = path.join(root, 'apps/tanstack-app')
const wrangler = path.join(path.dirname(require.resolve('wrangler/package.json')), 'bin/wrangler.js')
const base = 'http://127.0.0.1:7002'
const cookies = new Map()
const report = { paidJobs: 0, passed: false }
let userId, visitorId, objectKey
async function localRequest(pathname, options = {}) {
  const response = await fetch(base + pathname, { ...options, headers: { Cookie: [...cookies].map(([key,value]) => `${key}=${value}`).join('; '), Origin: base, ...options.headers }, signal: AbortSignal.timeout(45000) })
  for (const cookie of response.headers.getSetCookie()) {
    const first = cookie.split(';')[0]; const at = first.indexOf('=')
    cookies.set(first.slice(0, at), first.slice(at + 1))
  }
  return response
}
try {
  const trial = await (await localRequest('/api/video-generate/')).json()
  visitorId = trial.data.storageKey
  const guest = await localRequest('/api/auth/sign-in/anonymous', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
  assert.equal(guest.status, 200)
  userId = (await guest.json()).user.id
  const bytes = await readFile(path.join(app, 'public/images/rap/step-person-1.png'))
  const form = new FormData()
  form.set('file', new File([bytes], 'r2-upload-regression.png', { type: 'image/png' }))
  form.set('provider', 'r2')
  const upload = await localRequest('/api/upload', { method: 'POST', body: form })
  report.uploadStatus = upload.status
  assert.equal(upload.status, 200, 'R2 upload endpoint must succeed')
  const uploaded = (await upload.json()).data
  objectKey = uploaded.key
  assert(objectKey.startsWith(`uploads/${userId}/`))
  const image = await fetch(uploaded.url, { signal: AbortSignal.timeout(30000) })
  report.publicImageStatus = image.status
  assert.equal(image.status, 200)
  const hash = value => createHash('sha256').update(value).digest('hex')
  assert.equal(hash(Buffer.from(await image.arrayBuffer())), hash(bytes))
  report.bytesIdentical = true
  report.balance = (await (await localRequest('/api/credits/balance')).json()).balance
  assert.equal(report.balance, 40)
  report.trialState = (await (await localRequest('/api/video-generate/')).json()).data.state
  assert.equal(report.trialState, 'available')
  report.passed = true
} catch (error) {
  report.failure = String(error)
  process.exitCode = 1
} finally {
  try {
    if (objectKey && userId && objectKey.startsWith(`uploads/${userId}/`)) {
      execFileSync(process.execPath, [wrangler, 'r2', 'object', 'delete', `rumpelstiltskin-ai-uploads/${objectKey}`, '--remote', '--config', 'wrangler.jsonc'], { cwd: app, windowsHide: true, stdio: 'pipe' })
      report.testImageRemoved = true
    }
    if (userId && /^[\w-]+$/.test(userId) && /^[\da-f-]{36}$/.test(visitorId)) {
      execFileSync(process.execPath, [wrangler, 'd1', 'execute', 'DB', '--local', '--config', 'wrangler.jsonc', '--command', `DELETE FROM video_trial WHERE key IN ('user:${userId}','browser:${visitorId}'); DELETE FROM user WHERE id='${userId}';`, '--json'], { cwd: app, windowsHide: true, stdio: 'pipe' })
      report.testGuestRemoved = true
    }
  } catch (error) { report.cleanupError = String(error); process.exitCode = 1 }
  await mkdir(path.join(root, 'test-results'), { recursive: true })
  await writeFile(path.join(root, 'test-results/r2-upload-fix.json'), JSON.stringify(report, null, 2))
  console.log(JSON.stringify(report))
}
