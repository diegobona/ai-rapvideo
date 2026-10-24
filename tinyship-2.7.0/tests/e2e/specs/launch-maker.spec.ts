import { expect, test, type Page } from '@playwright/test'
import path from 'node:path'

const first = path.resolve('apps/tanstack-app/public/images/rap/step-person-1.png')
const second = path.resolve('apps/tanstack-app/public/images/rap/step-person-2.png')
const clip = path.resolve('apps/tanstack-app/public/videos/examples/rap-orange-studio.mp4')
const videoUrl = 'https://media.local.test/generated-videos/visitor/rap.mp4'
const lyrics = { language: 'en', lines: ['We bring sunshine every day', 'Watch our worries fade away', 'Two bright stars across the night', 'Keep our friendship burning bright'] }
const result = { videoUrl, provider: 'autodl', model: 'minimax-h3', duration: 12, rapLyrics: lyrics }

type FakeState = { generations: number; uploads: number; checkouts: number; downloads: number; polls: number; taskId: string | null; completed: boolean; failFirst: boolean; rejectNext: boolean; loseNext: boolean; downloadFails: boolean; bodies: Record<string, unknown>[] }
async function installApi(page: Page, options: Partial<FakeState> = {}) {
  const state: FakeState = { generations: 0, uploads: 0, checkouts: 0, downloads: 0, polls: 0, taskId: null, completed: true, failFirst: false, rejectNext: false, loseNext: false, downloadFails: false, bodies: [], ...options }
  await page.route('**/api/auth/get-session**', route => route.fulfill({ json: { user: { id: 'visitor', isAnonymous: true } } }))
  await page.route('**/api/auth/sign-in/anonymous', route => route.fulfill({ json: { user: { id: 'visitor', isAnonymous: true } } }))
  await page.route('**/api/upload', route => { state.uploads++; return route.fulfill({ json: { success: true, data: { url: `https://media.local.test/uploads/visitor/person-${state.uploads}.png` } } }) })
  await page.route('**/api/video-checkout/**', route => { state.checkouts++; return route.abort() })
  await page.route('**/api/video-generate/lyrics', route => route.fulfill({ json: { success: true, data: { lyrics } } }))
  await page.route('**/api/video-generate/', route => {
    if (route.request().method() === 'GET') return route.fulfill({ json: { success: true, data: { purchase: null, storageKey: 'rap-browser', ...(state.taskId ? { directTaskId: state.taskId } : {}) } } })
    state.generations++; state.bodies.push(route.request().postDataJSON())
    if (state.rejectNext) { state.rejectNext = false; return route.fulfill({ status: 400, json: { error: 'invalid_video_request' } }) }
    if (state.loseNext) { state.loseNext = false; return route.abort('failed') }
    state.taskId = `rap-task-${state.generations}`
    return route.fulfill({ json: { success: true, data: { taskId: state.taskId, status: 'processing' } } })
  })
  await page.route('**/api/video-generate/status?*', route => {
    state.polls++
    const failed = state.failFirst && state.generations === 1
    return route.fulfill({ json: { success: true, data: { taskId: state.taskId, status: failed ? 'failed' : state.completed ? 'succeeded' : 'processing', ...(state.completed && !failed ? { result } : {}) } } })
  })
  await page.route(videoUrl, route => route.fulfill({ contentType: 'video/mp4', path: clip }))
  await page.route('**/api/video-generate/download', route => {
    state.downloads++
    return state.downloadFails && state.downloads === 1 ? route.fulfill({ status: 502, json: { error: 'download_unavailable' } }) : route.fulfill({ contentType: 'video/mp4', path: clip })
  })
  return state
}
async function choosePhotos(page: Page) {
  await page.getByRole('button', { name: 'Generate lyrics', exact: true }).click()
  await expect(page.getByRole('textbox', { name: 'Your lyrics', exact: true })).toBeVisible()
  await expect(page.locator('.rap-duo-lyrics-inputs input')).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Generate rap video', exact: true })).toBeEnabled()
  const inputs = page.locator('#rap-maker input[type=file]')
  await inputs.nth(0).setInputFiles(first)
  await inputs.nth(1).setInputFiles(second)
  await page.getByRole('checkbox').check()
}

test('requires both photos and consent before submitting', async ({ page }) => {
  const state = await installApi(page)
  await page.goto('/')
  await expect(page.getByRole('button', { name: 'Generate rap video', exact: true })).toBeDisabled()
  await page.getByRole('button', { name: 'Generate lyrics', exact: true }).click()
  await page.getByRole('button', { name: 'Generate rap video', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('separate photo for each person')
  const inputs = page.locator('#rap-maker input[type=file]')
  await inputs.nth(0).setInputFiles(first)
  await inputs.nth(1).setInputFiles(second)
  await page.getByRole('checkbox').check()
  await page.getByRole('checkbox').uncheck()
  await page.getByRole('button', { name: 'Generate rap video', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('permission')
  await page.getByRole('button', { name: 'Remove photo — Person 2', exact: true }).click()
  await page.getByRole('checkbox').check()
  await page.getByRole('button', { name: 'Generate rap video', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('separate photo')
  expect(state.generations).toBe(0)
  expect(state.uploads).toBe(0)
})

test('submits the selected scene and topic once, then retries download without a new generation', async ({ page }) => {
  const state = await installApi(page, { downloadFails: true })
  await page.goto('/')
  await choosePhotos(page)
  await page.getByRole('radio', { name: /Street Cypher/ }).check()
  await page.getByRole('textbox', { name: 'Your rap topic' }).fill('A birthday roast for my best friend')
  await page.getByRole('button', { name: 'Generate rap video', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Download video', exact: true })).toBeVisible()
  expect(state.generations).toBe(1)
  expect(state.uploads).toBe(2)
  expect(state.bodies[0]).toEqual({ rapTemplate: 'rap-duo-v1', personOneImageUrl: 'https://media.local.test/uploads/visitor/person-1.png', personTwoImageUrl: 'https://media.local.test/uploads/visitor/person-2.png', scene: 'street-cypher', topic: 'A birthday roast for my best friend', lyrics })
  for (const field of ['model', 'provider', 'duration', 'resolution', 'purchaseId']) expect(state.bodies[0]).not.toHaveProperty(field)
  await expect(page.locator('#rap-maker video')).toHaveAttribute('src', videoUrl)
  await page.getByRole('button', { name: 'Download video', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('download did not finish')
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Retry download', exact: true }).click()
  expect((await download).suggestedFilename()).toBe('ai-rap-video.mp4')
  expect(state.downloads).toBe(2)
  expect(state.generations).toBe(1)
  expect(state.checkouts).toBe(0)
})

test('refresh and repeated clicks recover the processing video without submitting again', async ({ page }) => {
  const state = await installApi(page, { completed: false })
  await page.goto('/')
  await choosePhotos(page)
  await page.getByRole('button', { name: 'Generate rap video', exact: true }).click()
  await expect.poll(() => state.generations).toBe(1)
  await expect(page.locator('#rap-maker button[type=submit]')).toBeDisabled()
  await page.reload()
  await expect(page.locator('#rap-maker .rap-duo-screen')).toHaveAttribute('aria-busy', 'true')
  state.completed = true
  await expect(page.getByRole('button', { name: 'Download video', exact: true })).toBeVisible({ timeout: 12000 })
  expect(state.generations).toBe(1)
  expect(state.uploads).toBe(2)
  expect(state.checkouts).toBe(0)
})

test('a failed generation keeps inputs and retries without payment or reupload', async ({ page }) => {
  const state = await installApi(page, { failFirst: true })
  await page.goto('/')
  await choosePhotos(page)
  await page.getByRole('textbox', { name: 'Your rap topic' }).fill('Our weekend adventure')
  await page.getByRole('button', { name: 'Generate rap video', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('could not be completed')
  await expect(page.getByRole('textbox', { name: 'Your rap topic' })).toHaveValue('Our weekend adventure')
  await page.getByRole('button', { name: 'Try again', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Download video', exact: true })).toBeVisible()
  expect(state.generations).toBe(2)
  expect(state.uploads).toBe(2)
  expect(state.checkouts).toBe(0)
})

test('an uncertain second submission never restores the previous successful video as the new result', async ({ page }) => {
  const state = await installApi(page)
  await page.goto('/')
  await choosePhotos(page)
  await page.getByRole('button', { name: 'Generate rap video', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Download video', exact: true })).toBeVisible()
  state.loseNext = true
  await page.getByRole('button', { name: 'Make another rap video', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Check video status', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Check video status', exact: true }).click()
  await expect(page.locator('#rap-maker video')).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Generate rap video', exact: true })).toBeVisible()
  expect(state.generations).toBe(2)
})

test('an explicit input rejection allows a fresh retry without reviving a prior task', async ({ page }) => {
  const state = await installApi(page, { rejectNext: true })
  await page.goto('/')
  await choosePhotos(page)
  await page.getByRole('button', { name: 'Generate rap video', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Try again', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Check video status', exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: 'Try again', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Download video', exact: true })).toBeVisible()
  expect(state.generations).toBe(2)
  expect(state.uploads).toBe(2)
  expect(state.checkouts).toBe(0)
})
