import { expect, test, type Page, type Route } from '@playwright/test'
import path from 'node:path'
import { readFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { homeCopy } from '../../../apps/tanstack-app/src/lib/home-copy'
import { DANCE_LONG_WAIT_DELAY_MS } from '../../../config/danceUi'
import { VIDEO_PAYMENT_REQUIRED } from '../../../config/videoPurchase'

const dancer = path.resolve('apps/tanstack-app/public/images/dance/example-barn.png')
const princessImage = path.resolve('apps/tanstack-app/public/images/references/princess-default-v2.png')
const clip = path.resolve('apps/tanstack-app/public/videos/rumpelstiltskin-ai-generator-demo.mp4')
const videoUrl = 'https://video.example.test/paid-dance.mp4'
const checkoutUrl = 'https://checkout.stripe.com/c/pay/cs_test_browser_fixture'
const result = { videoUrl, provider: 'compshare', model: 'MiniMax-H3', duration: 10 }
const paid = { id: 'purchase-browser', state: 'paid', taskId: null }
const processing = { ...paid, state: 'processing', taskId: 'task-browser' }
const succeeded = { ...processing, state: 'succeeded', result }
const respond = (route: Route, purchase: unknown) => route.fulfill({ json: { success: true, data: { purchase, storageKey: 'paid-visitor' } } })

async function mockSession(page: Page, purchase: unknown = null) {
  await page.route('**/api/video-generate/', route => route.request().method() === 'GET' ? respond(route, purchase) : route.abort())
  await page.route('**/api/auth/get-session**', route => route.fulfill({ json: {
    user: { id: 'paid-user', name: 'Visitor', email: 'visitor@example.com', isAnonymous: true, emailVerified: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    session: { id: 'paid-session', userId: 'paid-user', token: 'local-test-only', expiresAt: new Date(Date.now() + 86400000).toISOString() },
  } }))
  await page.route('**/api/upload**', route => route.fulfill({ json: { success: true, data: { url: 'https://media.example.test/uploads/paid-user/dancer.png' } } }))
  await page.route(videoUrl, route => route.fulfill({ contentType: 'video/mp4', path: clip }))
}

async function choosePhotos(page: Page) {
  await expect(page.getByRole('button', { name: 'Choose dancer photo', exact: true })).toBeEnabled()
  await page.locator('input[type=file]').first().setInputFiles(dancer)
  await page.getByRole('checkbox', { name: homeCopy.tool.consentLabel }).check()
  await expect(page.getByRole('button', { name: homeCopy.tool.generateButton, exact: true })).toBeEnabled()
}

async function submitAnotherFreeVideo(page: Page) {
  let body: Record<string, unknown> | undefined
  let checkouts = 0
  await page.route('**/api/video-checkout/', route => { checkouts++; return route.abort() })
  await page.route('**/api/video-generate/', route => {
    if (route.request().method() === 'GET') return respond(route, null)
    body = route.request().postDataJSON()
    expect(body).toMatchObject({ danceTemplate: 'rumpelstiltskin-v2' })
    expect(body).not.toHaveProperty('purchaseId')
    expect(body).not.toHaveProperty('sceneImageUrl')
    return route.fulfill({ json: { success: true, data: { taskId: 'direct-next', status: 'processing' } } })
  })
  await page.route('**/api/video-generate/status?taskId=direct-next', route => route.fulfill({ json: { success: true, data: { taskId: 'direct-next', status: 'succeeded', result: { ...result, provider: 'autodl', model: 'minimax-h3' } } } }))
  await page.getByRole('button', { name: homeCopy.tool.generateButton, exact: true }).click()
  await expect.poll(() => body).toBeTruthy()
  await expect(page.getByTestId('dance-checkout-dialog')).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Download video', exact: true })).toBeEnabled()
  expect(checkouts).toBe(0)
  return body!
}

test('temporary free generation bypasses checkout, restores inputs on refresh and allows another video', async ({ page }) => {
  test.skip(VIDEO_PAYMENT_REQUIRED, 'Temporary free access is disabled.')
  await page.clock.install({ time: 0 })
  await page.clock.pauseAt(0)
  await mockSession(page)
  const photoUrl = 'https://media.example.test/uploads/paid-user/dancer.png'
  await page.route(photoUrl, route => route.fulfill({ contentType: 'image/png', path: dancer }))
  let taskId: string | null = null
  let completed = false
  let generations = 0
  let uploads = 0
  let checkouts = 0
  const bodies: Record<string, unknown>[] = []
  await page.route('**/api/upload**', route => { uploads++; return route.fulfill({ json: { success: true, data: { url: photoUrl } } }) })
  await page.route('**/api/video-checkout/**', route => { checkouts++; return route.abort() })
  await page.route('**/api/video-generate/', route => {
    if (route.request().method() === 'GET') return route.fulfill({ json: { success: true, data: { purchase: null, storageKey: 'paid-visitor', ...(taskId ? { directTaskId: taskId } : {}) } } })
    generations++
    bodies.push(route.request().postDataJSON())
    taskId = `direct-${generations}`
    return route.fulfill({ json: { success: true, data: { taskId, status: 'processing' } } })
  })
  await page.route('**/api/video-generate/status?*', route => route.fulfill({ json: { success: true, data: { taskId, status: completed ? 'succeeded' : 'processing', ...(completed ? { result: { ...result, provider: 'autodl', model: 'minimax-h3' } } : {}) } } }))
  await page.goto('/')
  await choosePhotos(page)
  const description = page.getByRole('textbox', { name: homeCopy.tool.customization.label })
  await description.fill('A sly grin')
  await page.getByRole('radio', { name: 'Portrait', exact: true }).check()
  await page.getByRole('button', { name: 'More playful', exact: true }).click()
  await page.getByRole('button', { name: homeCopy.tool.generateButton, exact: true }).click()
  const panel = page.locator('[data-testid="dance-maker"] [aria-busy]')
  await expect.poll(() => generations).toBe(1)
  await expect(panel).toHaveAttribute('aria-busy', 'true')
  expect(await panel.evaluate(el => getComputedStyle(el).backgroundImage)).toBe('none')
  await expect(page.getByTestId('dance-checkout-dialog')).toHaveCount(0)
  await expect(page.getByTestId('dance-maker')).not.toContainText('$4.99')
  await expect(description).toHaveValue('A sly grin')
  await page.reload()
  await expect(description).toHaveValue('A sly grin')
  await expect(page.getByAltText(homeCopy.tool.photoPreviewAlt)).toHaveAttribute('src', photoUrl)
  await expect(page.getByRole('radio', { name: 'Portrait', exact: true })).toBeChecked()
  await expect(panel).toHaveAttribute('aria-busy', 'true')
  expect(generations).toBe(1)
  completed = true
  await page.clock.fastForward(3001)
  await expect(page.getByRole('button', { name: 'Download video', exact: true })).toBeEnabled()
  await page.getByRole('button', { name: homeCopy.tool.generateButton, exact: true }).click()
  await expect.poll(() => generations).toBe(2)
  await expect(page.getByRole('button', { name: 'Download video', exact: true })).toBeEnabled()
  expect(bodies).toEqual(Array(2).fill({ danceTemplate: 'rumpelstiltskin-v2', dancerImageUrl: photoUrl, customDescription: 'A sly grin', quickTags: ['playful'], orientation: 'portrait' }))
  expect({ uploads, checkouts }).toEqual({ uploads: 1, checkouts: 0 })
})

test('a failed free generation retains inputs and can generate again without payment or reupload', async ({ page }) => {
  test.skip(VIDEO_PAYMENT_REQUIRED, 'Temporary free access is disabled.')
  await mockSession(page)
  let generations = 0
  let uploads = 0
  await page.route('**/api/upload**', route => { uploads++; return route.fulfill({ json: { success: true, data: { url: 'https://media.example.test/uploads/paid-user/dancer.png' } } }) })
  await page.route('**/api/video-generate/', route => {
    if (route.request().method() === 'GET') return respond(route, null)
    generations++
    return route.fulfill({ json: { success: true, data: { taskId: `direct-${generations}`, status: 'processing' } } })
  })
  await page.route('**/api/video-generate/status?*', route => route.fulfill({ json: { success: true, data: generations === 1 ? { status: 'failed' } : { status: 'succeeded', result: { ...result, provider: 'autodl', model: 'minimax-h3' } } } }))
  await page.goto('/')
  await choosePhotos(page)
  const description = page.getByRole('textbox', { name: homeCopy.tool.customization.label })
  await description.fill('A warm smile')
  await page.getByRole('button', { name: homeCopy.tool.generateButton, exact: true }).click()
  await expect(page.getByRole('alert')).toContainText(homeCopy.tool.errors.generation)
  await expect(description).toHaveValue('A warm smile')
  await page.getByRole('button', { name: homeCopy.tool.generateButton, exact: true }).click()
  await expect(page.getByRole('button', { name: 'Download video', exact: true })).toBeEnabled()
  await expect(page.getByTestId('dance-checkout-dialog')).toHaveCount(0)
  expect({ generations, uploads }).toEqual({ generations: 2, uploads: 1 })
})

test('checkout return and refresh retain inputs, and processing reassurance appears only after two minutes', async ({ page }) => {
  await page.clock.install({ time: 0 })
  await page.clock.pauseAt(0)
  const inputs = {
    dancerImageUrl: 'https://media.example.test/uploads/paid-user/saved-dancer.png',
    princessImageUrl: 'https://media.example.test/uploads/paid-user/saved-princess.png',
    sceneImageUrl: 'https://media.example.test/uploads/paid-user/saved-scene.png',
    customDescription: 'A red coat and a cheerful smile', quickTags: ['playful', 'push-in'], orientation: 'portrait',
  }
  let current = { ...processing, ...inputs } as Record<string, unknown>
  await mockSession(page)
  await page.route(inputs.dancerImageUrl, route => route.fulfill({ contentType: 'image/png', path: dancer }))
  await page.route(inputs.princessImageUrl, route => route.fulfill({ contentType: 'image/png', path: princessImage }))
  let sceneReads = 0
  await page.route(inputs.sceneImageUrl, route => { sceneReads++; return route.abort() })
  await page.route('**/api/video-generate/', route => route.request().method() === 'GET' ? respond(route, current) : route.abort())
  await page.route('**/api/video-generate/status?*', route => respond(route, current))
  await page.route('**/api/video-checkout/verify', route => respond(route, current))
  await page.goto('/?checkout_session_id=cs_test_restore')
  const description = page.getByRole('textbox', { name: homeCopy.tool.customization.label })
  const panel = page.locator('[data-testid="dance-maker"] [aria-busy]')
  const hint = page.getByTestId('dance-long-wait')
  for (const [alt, src] of [[homeCopy.tool.photoPreviewAlt, inputs.dancerImageUrl], [homeCopy.tool.princessPreviewAlt, inputs.princessImageUrl]]) {
    await expect(page.getByAltText(alt)).toHaveAttribute('src', src)
  }
  await expect(description).toHaveValue(inputs.customDescription)
  await expect(description).toBeDisabled()
  await expect(page.getByRole('button', { name: 'More playful', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('radio', { name: 'Portrait', exact: true })).toBeChecked()
  await expect(panel).toHaveAttribute('aria-busy', 'true')
  expect(await panel.evaluate(el => getComputedStyle(el).backgroundImage)).toBe('none')
  await expect(hint).toHaveCount(0)
  await page.reload()
  await expect(description).toHaveValue(inputs.customDescription)
  await expect(page.getByAltText(homeCopy.tool.photoPreviewAlt)).toHaveAttribute('src', inputs.dancerImageUrl)
  await page.clock.fastForward(DANCE_LONG_WAIT_DELAY_MS - 1)
  await expect(hint).toHaveCount(0)
  await page.clock.fastForward(1)
  await expect(hint).toContainText(homeCopy.tool.longWaitHint)
  await page.clock.fastForward(11 * 60_000)
  await expect(panel).toHaveAttribute('aria-busy', 'true')
  await expect(hint).toContainText(homeCopy.tool.longWaitHint)
  await page.screenshot({ path: path.resolve('test-results/retain-maker-processing.png') })
  current = { ...succeeded, ...inputs }
  await page.clock.fastForward(3001)
  await expect(page.getByRole('button', { name: 'Download video', exact: true })).toBeEnabled()
  await expect(hint).toHaveCount(0)
  await expect(description).toHaveValue(inputs.customDescription)
  await expect(description).toBeEnabled()
  let uploads = 0
  await page.route('**/api/upload**', route => { uploads++; return route.abort() })
  let checkoutBody
  await page.route('**/api/video-checkout/', route => { checkoutBody = route.request().postDataJSON(); return route.fulfill({ json: { success: true, data: { purchaseId: 'purchase-repeat', checkoutUrl } } }) })
  await page.route(checkoutUrl, route => route.fulfill({ contentType: 'text/html', body: '<p>Mock checkout</p>' }))
  if (VIDEO_PAYMENT_REQUIRED) {
    await page.getByRole('button', { name: homeCopy.tool.generateButton, exact: true }).click()
    await expect(page.locator('textarea')).toHaveValue(inputs.customDescription)
    await page.getByTestId('dance-checkout-pay').click()
    await expect(page).toHaveURL(checkoutUrl)
    expect(checkoutBody).toEqual({ dancerImageUrl: inputs.dancerImageUrl, princessImageUrl: inputs.princessImageUrl, customDescription: inputs.customDescription, quickTags: ['playful'], orientation: inputs.orientation, returnPath: '/' })
  } else {
    expect(await submitAnotherFreeVideo(page)).toEqual({ danceTemplate: 'rumpelstiltskin-v2', dancerImageUrl: inputs.dancerImageUrl, princessImageUrl: inputs.princessImageUrl, customDescription: inputs.customDescription, quickTags: ['playful'], orientation: inputs.orientation })
  }
  expect(uploads).toBe(0)
  expect(sceneReads).toBe(0)
})

test('Generate opens the $4.99 dialog before any upload, checkout or generation', async ({ page }) => {
  test.skip(!VIDEO_PAYMENT_REQUIRED, 'Payment is temporarily disabled; historical paid recovery remains tested.')
  await mockSession(page)
  const mutations: string[] = []
  page.on('request', request => { if (request.method() === 'POST' && /\/api\/(upload|video-generate|video-checkout)/.test(request.url())) mutations.push(request.url()) })
  await page.goto('/')
  await choosePhotos(page)
  const generate = page.getByRole('button', { name: homeCopy.tool.generateButton, exact: true })
  await generate.click()
  const dialog = page.getByRole('dialog', { name: homeCopy.tool.checkout.title })
  await expect(dialog).toBeVisible()
  await expect(dialog).toContainText('$4.99')
  await expect(dialog).toContainText('USD')
  await expect(dialog).not.toContainText('50%')
  await expect(dialog.getByTestId('dance-checkout-pay')).toBeFocused()
  await page.screenshot({ path: path.resolve('test-results/stripe-checkout-dialog-desktop.png') })
  await page.setViewportSize({ width: 390, height: 844 })
  await expect(dialog.getByTestId('dance-checkout-pay')).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({ path: path.resolve('test-results/stripe-checkout-dialog-mobile.png') })
  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
  await expect(generate).toBeFocused()
  await expect(page.getByAltText(homeCopy.tool.photoPreviewAlt)).toBeVisible()
  expect(mutations).toEqual([])
})

test('Pay uploads once and opens Stripe without starting a generation', async ({ page }) => {
  test.skip(!VIDEO_PAYMENT_REQUIRED, 'Payment is temporarily disabled; checkout helpers retain unit coverage.')
  await mockSession(page)
  let uploads = 0
  let checkouts = 0
  let jobs = 0
  await page.route('**/api/upload**', route => { uploads++; return route.fulfill({ json: { success: true, data: { url: 'https://media.example.test/uploads/paid-user/dancer.png' } } }) })
  await page.route('**/api/video-generate/', route => { if (route.request().method() === 'GET') return respond(route, null); jobs++; return route.abort() })
  await page.route('**/api/video-checkout/', route => {
    checkouts++
    expect(route.request().postDataJSON()).toEqual({ dancerImageUrl: 'https://media.example.test/uploads/paid-user/dancer.png', returnPath: '/' })
    return route.fulfill({ json: { success: true, data: { purchaseId: paid.id, checkoutUrl } } })
  })
  await page.route(checkoutUrl, route => route.fulfill({ contentType: 'text/html', body: '<p>Mock Stripe checkout. No real payment.</p>' }))
  await page.goto('/')
  await choosePhotos(page)
  await page.getByRole('button', { name: homeCopy.tool.generateButton, exact: true }).click()
  await page.getByTestId('dance-checkout-pay').click()
  await expect(page).toHaveURL(checkoutUrl)
  expect({ uploads, checkouts, jobs }).toEqual({ uploads: 1, checkouts: 1, jobs: 0 })
})

test('fixed scene has no upload control and character photos, portrait and expression details reach generation', async ({ page }) => {
  await mockSession(page)
  const uploads: string[] = []
  const princessImageUrl = 'https://media.example.test/uploads/paid-user/princess.png'
  await page.route('**/api/upload**', route => {
    const data = route.request().postDataBuffer()
    const isPrincess = data?.includes(Buffer.from('filename="princess-default-v2.png"'))
    uploads.push(isPrincess ? 'princess' : 'dancer')
    return route.fulfill({ json: { success: true, data: { url: isPrincess ? princessImageUrl : 'https://media.example.test/uploads/paid-user/dancer.png' } } })
  })
  let body: Record<string, unknown> | null = null
  await page.route('**/api/video-checkout/', route => {
    body = route.request().postDataJSON()
    return route.fulfill({ json: { success: true, data: { purchaseId: paid.id, checkoutUrl } } })
  })
  await page.route(checkoutUrl, route => route.fulfill({ contentType: 'text/html', body: '<p>Mock checkout</p>' }))
  await page.goto('/')
  await expect(page.locator('input[type=file]')).toHaveCount(2)
  await expect(page.getByRole('button', { name: /Choose scene|Change scene|Use default scene/ })).toHaveCount(0)
  await expect(page.getByText('Scene image · optional', { exact: true })).toHaveCount(0)
  await expect(page.getByRole('button', { name: homeCopy.tool.choosePrincess, exact: true })).toBeEnabled()
  await page.getByLabel(homeCopy.tool.princessLabel, { exact: true }).setInputFiles(princessImage)
  await choosePhotos(page)
  const description = page.getByRole('textbox', { name: homeCopy.tool.customization.label })
  await expect(page.getByRole('radio', { name: 'Landscape', exact: true })).toBeChecked()
  await page.getByRole('radio', { name: 'Portrait', exact: true }).check()
  await expect(page.getByRole('radio', { name: 'Landscape', exact: true })).not.toBeChecked()
  await expect(description).toHaveAttribute('maxlength', '300')
  await description.fill('A mischievous grin and a cheerful smile')
  await page.getByRole('button', { name: 'More playful', exact: true }).click()
  await expect(page.getByRole('button', { name: /Camera push-in|Vintage film/ })).toHaveCount(0)
  await expect(page.getByText(homeCopy.tool.customization.hint, { exact: true })).toHaveCount(0)
  await expect(description).not.toHaveAttribute('aria-describedby', /custom-hint/)
  await page.setViewportSize({ width: 390, height: 844 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  expect(uploads).toEqual([])
  if (VIDEO_PAYMENT_REQUIRED) {
    await page.getByRole('button', { name: homeCopy.tool.generateButton, exact: true }).click()
    await page.getByTestId('dance-checkout-pay').click()
    await expect(page).toHaveURL(checkoutUrl)
    expect(body).toEqual({ dancerImageUrl: 'https://media.example.test/uploads/paid-user/dancer.png', princessImageUrl, returnPath: '/', customDescription: 'A mischievous grin and a cheerful smile', quickTags: ['playful'], orientation: 'portrait' })
  } else {
    expect(await submitAnotherFreeVideo(page)).toEqual({ danceTemplate: 'rumpelstiltskin-v2', dancerImageUrl: 'https://media.example.test/uploads/paid-user/dancer.png', princessImageUrl, customDescription: 'A mischievous grin and a cheerful smile', quickTags: ['playful'], orientation: 'portrait' })
  }
  expect(uploads).toEqual(['dancer', 'princess'])
})

test('a historical paid scene is not displayed or requested while its original order recovers', async ({ page }) => {
  const sceneImageUrl = 'https://media.example.test/uploads/paid-user/saved-scene.png'
  let sceneReads = 0
  await page.route(sceneImageUrl, route => { sceneReads++; return route.abort() })
  const sceneOrder = { ...processing, sceneImageUrl }
  await mockSession(page, sceneOrder)
  await page.route('**/api/video-generate/status?*', route => respond(route, sceneOrder))
  await page.goto('/')
  await expect(page.locator('[data-testid="dance-maker"] [aria-busy]')).toHaveAttribute('aria-busy', 'true')
  await expect(page.locator('input[type=file]')).toHaveCount(2)
  await expect(page.getByRole('button', { name: /Choose scene|Change scene|Use default scene/ })).toHaveCount(0)
  await expect(page.locator(`img[src="${sceneImageUrl}"]`)).toHaveCount(0)
  await expect(page.getByRole('button', { name: homeCopy.tool.choosePhoto, exact: true })).toBeDisabled()
  expect(sceneReads).toBe(0)
})

test('customization can be cleared and is locked while recovering a processing order', async ({ page }) => {
  await mockSession(page)
  await page.goto('/')
  const description = page.getByRole('textbox', { name: homeCopy.tool.customization.label })
  await expect(description).toBeEnabled()
  await description.fill('A new idea')
  await page.getByRole('button', { name: 'More playful', exact: true }).click()
  await page.getByRole('button', { name: 'Clear', exact: true }).click()
  await expect(description).toHaveValue('')
  await expect(page.getByRole('button', { name: 'More playful', exact: true })).toHaveAttribute('aria-pressed', 'false')
  const portraitOrder = { ...processing, orientation: 'portrait' }
  await mockSession(page, portraitOrder)
  await page.route('**/api/video-generate/status?*', route => respond(route, portraitOrder))
  await page.reload()
  await expect(description).toBeDisabled()
  await expect(page.getByRole('radio', { name: 'Portrait', exact: true })).toBeChecked()
  await expect(page.getByRole('radio', { name: 'Portrait', exact: true })).toBeDisabled()
  await expect(page.getByRole('radio', { name: 'Landscape', exact: true })).toBeDisabled()
  await expect(page.getByRole('button', { name: 'More playful', exact: true })).toBeDisabled()
  await expect(page.getByRole('button', { name: 'Camera push-in', exact: true })).toHaveCount(0)
})

test('a verified payment starts one purchased video, downloads it, and permits a new purchase', async ({ page }) => {
  await mockSession(page)
  let jobs = 0
  let downloads = 0
  await page.route('**/api/video-checkout/verify', route => {
    expect(route.request().postDataJSON()).toEqual({ sessionId: 'cs_test_paid' })
    return respond(route, paid)
  })
  await page.route('**/api/video-generate/', route => {
    if (route.request().method() === 'GET') return respond(route, null)
    expect(route.request().postDataJSON()).toEqual({ purchaseId: paid.id })
    jobs++
    return respond(route, processing)
  })
  await page.route('**/api/video-generate/status?*', route => {
    expect(new URL(route.request().url()).searchParams.get('purchaseId')).toBe(paid.id)
    return respond(route, succeeded)
  })
  await page.route('**/api/video-generate/download', route => {
    downloads++
    expect(route.request().postDataJSON()).toEqual({ url: videoUrl })
    return route.fulfill({ contentType: 'video/mp4', path: clip })
  })
  await page.goto('/?checkout_session_id=cs_test_paid#dance-maker')
  await expect(page.getByRole('status').filter({ hasText: 'Your video is ready.' })).toBeVisible()
  await expect(page).not.toHaveURL(/checkout_session_id/)
  const downloadEvent = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download video', exact: true }).click()
  const download = await downloadEvent
  expect(download.suggestedFilename()).toBe('rumpelstiltskin-ai-dance.mp4')
  const downloaded = await readFile((await download.path())!)
  expect(createHash('sha256').update(downloaded).digest('hex')).toBe(createHash('sha256').update(await readFile(clip)).digest('hex'))
  expect(downloads).toBe(1)
  await choosePhotos(page)
  if (VIDEO_PAYMENT_REQUIRED) {
    await page.getByRole('button', { name: homeCopy.tool.generateButton, exact: true }).click()
    await expect(page.getByTestId('dance-checkout-dialog')).toBeVisible()
  } else await submitAnotherFreeVideo(page)
  expect(jobs).toBe(1)
})

test('cancelled and unpaid returns never start a generation', async ({ page }) => {
  await mockSession(page)
  let jobs = 0
  let verifies = 0
  await page.route('**/api/video-generate/', route => { if (route.request().method() === 'GET') return respond(route, null); jobs++; return route.abort() })
  await page.route('**/api/video-checkout/verify', route => { verifies++; return respond(route, { ...paid, state: 'pending' }) })
  await page.goto('/?checkout=cancelled#dance-maker')
  await expect(page.getByRole('status').filter({ hasText: homeCopy.tool.checkout.cancelled })).toBeVisible()
  expect(verifies).toBe(0)
  await page.goto('/?checkout_session_id=cs_test_unpaid#dance-maker')
  await expect(page.getByRole('alert')).toContainText(homeCopy.tool.errors.paymentPending)
  expect({ jobs, verifies }).toEqual({ jobs: 0, verifies: 1 })
})

test('refresh recovers a processing purchase without another payment or submission', async ({ page }) => {
  await mockSession(page, processing)
  let jobs = 0
  let completed = false
  await page.route('**/api/video-generate/', route => { if (route.request().method() === 'GET') return respond(route, processing); jobs++; return route.abort() })
  await page.route('**/api/video-generate/status?*', route => respond(route, completed ? succeeded : processing))
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('status').filter({ hasText: 'Generating your dance video' })).toBeVisible()
  completed = true
  await page.reload({ waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('status').filter({ hasText: 'Your video is ready.' })).toBeVisible()
  expect(jobs).toBe(0)
})

test('a temporary purchase status error retries the same purchase', async ({ page }) => {
  await mockSession(page, processing)
  let recovered = false
  let jobs = 0
  await page.route('**/api/video-generate/', route => { if (route.request().method() === 'GET') return respond(route, processing); jobs++; return route.abort() })
  await page.route('**/api/video-generate/status?*', route => recovered ? respond(route, succeeded) : route.fulfill({ status: 503, json: { error: 'Temporary status failure' } }))
  await page.goto('/')
  const retry = page.getByRole('button', { name: 'Try again', exact: true })
  await expect(retry).toBeEnabled()
  recovered = true
  await retry.click()
  await expect(page.getByRole('status').filter({ hasText: 'Your video is ready.' })).toBeVisible()
  expect(jobs).toBe(0)
})

test('a refunded purchase unlocks photos and a new generation without restarting it', async ({ page }) => {
  await mockSession(page, { ...paid, state: 'refunded', refundStatus: 'succeeded' })
  await page.goto('/')
  await expect(page.getByRole('alert')).toContainText(homeCopy.tool.errors.refunded)
  await choosePhotos(page)
  if (VIDEO_PAYMENT_REQUIRED) {
    await page.getByRole('button', { name: homeCopy.tool.generateButton, exact: true }).click()
    await expect(page.getByTestId('dance-checkout-dialog')).toBeVisible()
  } else await submitAnotherFreeVideo(page)
})

for (const state of ['refund_pending', 'refunded'] as const) {
  test(`a rejected political-figure photo shows its reason and ${state} state after refresh`, async ({ page }) => {
    const purchase = { ...processing, state, failureReason: 'political_figure_not_allowed', refundStatus: state === 'refunded' ? 'succeeded' : 'requested' }
    let jobs = 0
    await mockSession(page, purchase)
    await page.route('**/api/video-generate/status?*', route => respond(route, purchase))
    await page.route('**/api/video-generate/', route => {
      if (route.request().method() === 'GET') return respond(route, purchase)
      jobs++
      return route.abort()
    })
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    const alert = page.getByRole('alert')
    await expect(page.locator('[data-testid="dance-maker"] [aria-busy]')).toContainText(homeCopy.tool.failureReasons.political_figure_not_allowed)
    await expect(alert).toContainText(homeCopy.tool.failureReasons.political_figure_not_allowed)
    await expect(alert).toBeInViewport()
    await expect(alert).toContainText(state === 'refunded' ? homeCopy.tool.errors.refunded : homeCopy.tool.errors.refundPending)
    await expect(page.locator('[data-testid="dance-maker"] [aria-busy]')).toHaveAttribute('aria-busy', 'false')
    await expect(page.getByTestId('dance-long-wait')).toHaveCount(0)
    await page.reload({ waitUntil: 'domcontentloaded' })
    await expect(alert).toContainText(homeCopy.tool.failureReasons.political_figure_not_allowed)
    expect(jobs).toBe(0)
    await page.screenshot({ path: path.resolve(`test-results/rejected-photo-${state}.png`) })
  })
}

test('failed initial ownership lookup retries recovery before another payment', async ({ page }) => {
  await mockSession(page)
  let restored = false
  let lookups = 0
  let jobs = 0
  await page.route('**/api/video-generate/', route => {
    if (route.request().method() !== 'GET') { jobs++; return route.abort() }
    lookups++
    return restored ? respond(route, processing) : route.fulfill({ status: 503, json: { error: 'Unavailable' } })
  })
  await page.route('**/api/video-generate/status?*', route => respond(route, succeeded))
  await page.goto('/')
  await expect(page.getByRole('button', { name: 'Try again', exact: true })).toBeEnabled()
  await expect(page.getByRole('button', { name: 'Choose dancer photo', exact: true })).toBeDisabled()
  restored = true
  await page.getByRole('button', { name: 'Try again', exact: true }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Your video is ready.' })).toBeVisible()
  expect({ lookups, jobs }).toEqual({ lookups: 2, jobs: 0 })
})

test('a terminal rejected return releases its invalid session and allows new photos', async ({ page }) => {
  await mockSession(page)
  let verifies = 0
  await page.route('**/api/video-checkout/verify', route => { verifies++; return route.fulfill({ status: 404, json: { error: 'not_found' } }) })
  await page.goto('/?checkout_session_id=cs_test_missing#dance-maker')
  await expect(page.getByRole('alert')).toBeVisible()
  await expect(page).not.toHaveURL(/checkout_session_id/)
  await choosePhotos(page)
  if (VIDEO_PAYMENT_REQUIRED) {
    await page.getByRole('button', { name: homeCopy.tool.generateButton, exact: true }).click()
    await expect(page.getByTestId('dance-checkout-dialog')).toBeVisible()
  } else await submitAnotherFreeVideo(page)
  expect(verifies).toBe(1)
})

test('a missing purchase releases stale processing references', async ({ page }) => {
  await mockSession(page, processing)
  await page.route('**/api/video-generate/status?*', route => route.fulfill({ status: 404, json: { error: 'not_found' } }))
  await page.goto('/')
  await expect(page.getByRole('alert')).toBeVisible()
  await choosePhotos(page)
  if (VIDEO_PAYMENT_REQUIRED) {
    await page.getByRole('button', { name: homeCopy.tool.generateButton, exact: true }).click()
    await expect(page.getByTestId('dance-checkout-dialog')).toBeVisible()
  } else await submitAnotherFreeVideo(page)
})

test('rejected return preserves an already completed owned video', async ({ page }) => {
  await mockSession(page, succeeded)
  await page.route('**/api/video-checkout/verify', route => route.fulfill({ status: 404, json: { error: 'not_found' } }))
  await page.goto('/?checkout_session_id=cs_test_missing#dance-maker')
  await expect(page.getByRole('status').filter({ hasText: 'Your video is ready.' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Download video', exact: true })).toBeEnabled()
  await expect(page.getByTestId('dance-maker').locator('video')).toHaveAttribute('src', videoUrl)
  await expect(page).not.toHaveURL(/checkout_session_id/)
})
