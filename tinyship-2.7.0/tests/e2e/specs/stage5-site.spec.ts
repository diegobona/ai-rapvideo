import { expect, test } from '@playwright/test'
import { execFile } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { promisify } from 'node:util'

// Read-only: no login, upload, paid generation, checkout or logout is triggered.
// Evidence lives outside the runner's cleanup directory, preserving private videos.
test.describe.configure({ mode: 'serial' })
let report: any
test.beforeAll(async () => {
  test.setTimeout(180000)
  const repository = path.resolve(__dirname, '../../..')
  const started = Date.now()
  try {
    await promisify(execFile)(process.execPath, ['scripts/manual/stage5-audit.mjs'], { cwd: repository, env: process.env, maxBuffer: 4 * 1024 * 1024 })
  } catch (error) {
    // An audit with failed assertions writes its evidence and exits 1. Let each
    // acceptance test show the corresponding failure instead of hiding it here.
    if ((error as { code?: unknown }).code !== 1) throw error
  }
  report = JSON.parse(await readFile(path.join(repository, 'test-results/stage5-audit/report.json'), 'utf8'))
  expect(Date.parse(report.generatedAt), 'The audit must produce fresh evidence').toBeGreaterThanOrEqual(started)
})

for (const [id, description] of [
  ['titles', 'unique titles match the page registry'],
  ['headings', 'one H1 and semantic heading levels'],
  ['descriptions', 'one non-empty description per page'],
  ['canonicals', 'one self-referencing canonical without query parameters'],
  ['discovery', 'AI Rap Video homepage-only sitemap and unrestricted robots'],
  ['keywords', 'no keywords meta tags anywhere'],
  ['images', 'all published images have alt and are at least 300×300'],
  ['ssr', 'curl and a JavaScript-disabled browser see H1 and body'],
  ['noindex', 'authentication, payment and legal pages are noindex'],
  ['links', 'all internal destinations return a non-error response'],
]) {
  test(`Stage 5 acceptance: ${description}`, () => {
    const check = report.checks.find((item: { id: string }) => item.id === id)
    expect(check, `Missing audit check ${id}`).toBeDefined()
    expect(check?.failures, JSON.stringify(check?.failures, null, 2)).toEqual([])
    expect(check?.passed).toBe(true)
  })
}

for (const id of ['home-sections', 'anchor-policy']) {
  test(`Stage 5 linking: ${id}`, () => {
    const check = report.linkChecks.find((item: { id: string }) => item.id === id)
    expect(check?.failures, JSON.stringify(check?.failures, null, 2)).toEqual([])
    expect(check?.passed).toBe(true)
  })
}

test('Stage 5 launch foundation: shared legal footer, English pages and server 404', () => {
  expect(report.extras.footer).toMatchObject({ passed: true, failures: [] })
  expect(report.extras.englishOnly).toMatchObject({ passed: true, languages: ['en'] })
  expect(report.extras.notFound).toEqual({ status: 404, ssrH1: true, hasHomeLink: true, noindex: true })
})
