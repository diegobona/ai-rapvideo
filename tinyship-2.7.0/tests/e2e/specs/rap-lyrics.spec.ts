import { expect, test, type Page } from '@playwright/test'
import path from 'node:path'
import { readFileSync } from 'node:fs'

const photoOne = path.resolve('apps/tanstack-app/public/images/rap/step-person-1.png')
const photoTwo = path.resolve('apps/tanstack-app/public/images/rap/step-person-2.png')
const clip = path.resolve('apps/tanstack-app/public/videos/examples/rap-orange-studio.mp4')
const english = { language: 'en', lines: ['We bring sunshine every day', 'Watch our worries fade away', 'Two bright stars across the night', 'Keep our friendship burning bright'] }
const chinese = { language: 'zh', lines: ['一起出发迎接阳光', '我们的梦想在远方', '每次相聚放声歌唱', '这份友情闪闪发亮'] }

async function installApi(page: Page) {
  const state = { lyricCalls: [] as Record<string, unknown>[], videoCalls: [] as Record<string, unknown>[], failLyrics: false, lyricsGate: null as Promise<void> | null, taskId: null as string | null, result: null as Record<string, unknown> | null }
  await page.route('**/api/auth/get-session**', route => route.fulfill({ json: { user: { id: 'visitor', isAnonymous: true } } }))
  await page.route('**/api/auth/sign-in/anonymous', route => route.fulfill({ json: { user: { id: 'visitor', isAnonymous: true } } }))
  let uploads = 0
  await page.route('**/api/upload', route => route.fulfill({ json: { success: true, data: { url: `https://media.local.test/uploads/visitor/${++uploads}.png` } } }))
  await page.route('**/api/video-generate/lyrics', async route => {
    const body = route.request().postDataJSON()
    state.lyricCalls.push(body)
    if (state.lyricsGate) await state.lyricsGate
    return state.failLyrics ? route.fulfill({ status: 502, json: { error: 'lyrics_generation_failed' } }) : route.fulfill({ json: { success: true, data: { lyrics: body.language === 'zh' ? chinese : english } } })
  })
  await page.route('**/api/video-generate/', route => {
    if (route.request().method() === 'GET') return route.fulfill({ json: { success: true, data: { purchase: null, storageKey: 'rap-lyrics-browser', ...(state.taskId ? { directTaskId: state.taskId } : {}) } } })
    const body = route.request().postDataJSON()
    state.videoCalls.push(body)
    state.taskId = `lyrics-task-${state.videoCalls.length}`
    state.result = { videoUrl: `https://media.local.test/generated-videos/${state.taskId}.mp4`, provider: 'autodl', model: 'minimax-h3', duration: 12, rapLyrics: body.lyrics }
    return route.fulfill({ json: { success: true, data: { taskId: state.taskId, status: 'processing' } } })
  })
  await page.route('**/api/video-generate/status?*', route => route.fulfill({ json: { success: true, data: { taskId: state.taskId, status: 'succeeded', result: state.result } } }))
  const videoBytes = readFileSync(clip)
  await page.route('https://media.local.test/generated-videos/**', route => {
    // Browsers need real byte-range responses to seek a metadata-only MP4.
    const range = /^bytes=(\d+)-(\d*)$/.exec(route.request().headers().range ?? '')
    if (!range) return route.fulfill({ contentType: 'video/mp4', headers: { 'Accept-Ranges': 'bytes' }, body: videoBytes })
    const start = Number(range[1])
    const end = range[2] ? Math.min(Number(range[2]), videoBytes.length - 1) : videoBytes.length - 1
    return route.fulfill({ status: 206, contentType: 'video/mp4', headers: { 'Accept-Ranges': 'bytes', 'Content-Range': `bytes ${start}-${end}/${videoBytes.length}` }, body: videoBytes.subarray(start, end + 1) })
  })
  return state
}

function editor(page: Page) { return page.getByRole('textbox', { name: 'Your lyrics', exact: true }) }
function playback(page: Page) { return page.getByTestId('rap-playback-lyrics') }
async function expectLyrics(page: Page, lines: string[]) {
  await expect(editor(page)).toHaveCount(1)
  await expect.poll(async () => (await editor(page).inputValue()).replace(/\s+/g, ' ').trim()).toBe(lines.join(' '))
}
async function generateLyrics(page: Page) {
  await page.getByRole('button', { name: 'Generate lyrics', exact: true }).click()
  await expectLyrics(page, english.lines)
}
async function submitVideo(page: Page) {
  await page.locator('#rap-maker input[type=file]').nth(0).setInputFiles(photoOne)
  await page.locator('#rap-maker input[type=file]').nth(1).setInputFiles(photoTwo)
  await page.getByRole('checkbox').check()
  await page.locator('#rap-maker button[type=submit]').click()
  await expect(page.getByRole('button', { name: 'Download video', exact: true })).toBeVisible()
}
async function seek(page: Page, time: number) {
  const video = page.locator('#rap-maker video')
  await expect.poll(() => video.evaluate(element => (element as HTMLVideoElement).readyState)).toBeGreaterThan(0)
  await expect.poll(() => video.evaluate(element => { const media = element as HTMLVideoElement; return media.seekable.length ? media.seekable.end(media.seekable.length - 1) : 0 })).toBeGreaterThan(time)
  await video.evaluate((element, value) => { const media = element as HTMLVideoElement; media.pause(); media.currentTime = value }, time)
  await expect.poll(() => video.evaluate((element, value) => { const media = element as HTMLVideoElement; return !media.seeking && Math.abs(media.currentTime - value) < 0.1 }, time)).toBe(true)
}

test('writes editable English lyrics first and submits only the reviewed script on a separate action', async ({ page }) => {
  const state = await installApi(page)
  await page.goto('/')
  await expect(page.getByLabel('Lyrics language')).toHaveValue('en')
  await expect(page.getByRole('combobox', { name: 'Person 1 Voice', exact: true })).toHaveValue('male')
  await expect(page.getByRole('combobox', { name: 'Person 2 Voice', exact: true })).toHaveValue('female')
  await expect(editor(page)).toHaveCount(0)
  await expect(page.locator('#rap-maker button[type=submit]')).toBeDisabled()
  await page.getByRole('textbox', { name: 'Your rap topic' }).fill('我们的生日')
  let releaseLyrics: () => void = () => {}
  state.lyricsGate = new Promise<void>(resolve => { releaseLyrics = resolve })
  await page.getByRole('button', { name: 'Generate lyrics', exact: true }).click()
  const writing = page.getByRole('button', { name: 'Writing your lyrics…', exact: true })
  await expect(writing).toBeDisabled()
  await expect(writing.locator('.rap-duo-spin')).toBeVisible()
  await expect(editor(page)).toHaveCount(0)
  releaseLyrics()
  await expectLyrics(page, english.lines)
  expect(state.lyricCalls).toEqual([{ topic: '我们的生日', language: 'en' }])
  expect(state.videoCalls).toHaveLength(0)
  const editedText = ['Birthday sunshine lights our way', ...english.lines.slice(1)].join(' ')
  await editor(page).fill(editedText)
  await page.getByRole('combobox', { name: 'Person 1 Voice', exact: true }).selectOption('female')
  await page.getByRole('combobox', { name: 'Person 2 Voice', exact: true }).selectOption('male')
  await submitVideo(page)
  expect(state.videoCalls).toHaveLength(1)
  expect(state.videoCalls[0].voices).toEqual(['female', 'male'])
  const submitted = state.videoCalls[0].lyrics as { language: string; lines: string[] }
  expect(submitted.language).toBe('en')
  expect(submitted.lines.join(' ')).toBe(editedText)
  await expect(playback(page)).toContainText('Birthday sunshine lights our way')
  await editor(page).fill(['These words belong to next time', ...english.lines.slice(1)].join(' '))
  await expect(playback(page)).toContainText('Birthday sunshine lights our way')
  await expect(playback(page)).not.toContainText('These words belong to next time')
  await expect(playback(page)).toContainText('planned timing')
})

test('lyrics failure preserves edits and retries only lyrics without a video POST', async ({ page }) => {
  const state = await installApi(page)
  await page.goto('/')
  await generateLyrics(page)
  const editedText = ['Keep my own original words', ...english.lines.slice(1)].join(' ')
  await editor(page).fill(editedText)
  state.failLyrics = true
  await page.getByRole('button', { name: 'Regenerate lyrics', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('saved')
  await expect(editor(page)).toHaveValue(editedText)
  expect(state.lyricCalls).toHaveLength(2)
  expect(state.videoCalls).toHaveLength(0)
  state.failLyrics = false
  await page.getByRole('button', { name: 'Regenerate lyrics', exact: true }).click()
  await expectLyrics(page, english.lines)
  expect(state.lyricCalls).toHaveLength(3)
  expect(state.videoCalls).toHaveLength(0)
  await editor(page).fill('')
  await expect(page.locator('#rap-maker button[type=submit]')).toBeDisabled()
})

test('Chinese is selected explicitly instead of inferred from the topic', async ({ page }) => {
  const state = await installApi(page)
  await page.goto('/')
  await page.getByLabel('Lyrics language').selectOption('zh')
  await page.getByRole('button', { name: 'Generate lyrics', exact: true }).click()
  await expectLyrics(page, chinese.lines)
  expect(state.lyricCalls).toEqual([{ topic: '', language: 'zh' }])
  expect(state.videoCalls).toHaveLength(0)
})

test('player highlights planned lines on seek, holds while paused, and restores the frozen lyrics after refresh', async ({ page }) => {
  const state = await installApi(page)
  await page.goto('/')
  await generateLyrics(page)
  await submitVideo(page)
  const active = playback(page).locator('[aria-current=true]')
  await seek(page, 1)
  await expect(active).toHaveText(new RegExp(english.lines[0]))
  const video = page.locator('#rap-maker video')
  await video.evaluate(async element => { const media = element as HTMLVideoElement; media.muted = true; await media.play() })
  await expect.poll(() => video.evaluate(element => (element as HTMLVideoElement).currentTime)).toBeGreaterThan(1.1)
  await video.evaluate(element => (element as HTMLVideoElement).pause())
  await page.waitForTimeout(250)
  await expect(active).toHaveText(new RegExp(english.lines[0]))
  await seek(page, 7)
  await expect(active).toHaveText(new RegExp(english.lines[2]))
  await seek(page, 5.7)
  await expect(active).toHaveCount(0)
  await seek(page, 3.2)
  await expect(active).toHaveText(new RegExp(english.lines[1]))
  await seek(page, 0.1)
  await expect(active).toHaveCount(0)
  await page.reload()
  await expect(playback(page)).toContainText(english.lines[0])
  expect(state.videoCalls).toHaveLength(1)
  expect(state.lyricCalls).toHaveLength(1)
  await expect(playback(page).locator('[aria-current=true]')).toHaveCount(0)
})

test('replacing the result resets lyric timing and does not retain the earlier script', async ({ page }) => {
  const state = await installApi(page)
  await page.goto('/')
  await generateLyrics(page)
  await submitVideo(page)
  await seek(page, 7)
  await expect(playback(page).locator('[aria-current=true]')).toHaveCount(1)
  await editor(page).fill(['A new adventure starts today', ...english.lines.slice(1)].join(' '))
  await page.getByRole('button', { name: 'Make another rap video', exact: true }).click()
  await expect(page.locator('#rap-maker video')).toHaveAttribute('src', /lyrics-task-2/)
  await expect(playback(page)).toContainText('A new adventure starts today')
  await expect(playback(page)).not.toContainText(english.lines[0])
  await expect(playback(page).locator('[aria-current=true]')).toHaveCount(0)
  expect(state.videoCalls).toHaveLength(2)
  expect(state.lyricCalls).toHaveLength(1)
})

