import { afterEach, describe, expect, test, vi } from 'vitest'
import { createDanceVideoOptions } from '../../../apps/tanstack-app/src/lib/dance-template'
import { buildDancePrompt, buildFixedSceneDancePrompt, buildImageDancePrompt, RUMPELSTILTSKIN_DANCE_PROMPT } from '../../../apps/tanstack-app/src/lib/dance-prompt'

const publicUrl = 'https://photos.test'
const dancerImageUrl = `${publicUrl}/dancer.png`
const princessImageUrl = `${publicUrl}/princess.png`
const baseInput = { danceTemplate: 'rumpelstiltskin-v2', dancerImageUrl }

function expectDynamicFace(prompt: string) {
  const performance = prompt.match(/(?:^|\n)DYNAMIC FACIAL PERFORMANCE\n([\s\S]*?)(?=\n\n[A-Z][A-Z —-]+\n|$)/)?.[1] ?? ''
  expect(performance).not.toBe('')
  expect(performance).toMatch(/identit[^.\n]*(?:photo|@Image|reference image)/i)
  expect(performance).toMatch(/(?:do not|never)[^.\n]*(?:freeze|lock)[^.\n]*(?:expression|face)|(?:photo|reference)[^.\n]*(?:not|without)[^.\n]*(?:fixed|frozen|locked)[^.\n]*expression/i)
  for (const feature of [/blink/i, /eyebrow/i, /\blips?\b/i, /\bjaw\b/i, /\bgaze\b/i]) expect(performance).toMatch(feature)
  expect(performance).toMatch(/head[- ]angle|head (?:turn|rotat)|head[^.\n]*orientation/i)
  expect(performance).toMatch(/light(?:ing)?|shadows?/i)
  expect(performance).toMatch(/occlu(?:sion|de)|occlud/i)
  expect(performance).toMatch(/finger[^.\n]*lips?|lips?[^.\n]*finger/i)
  expect(performance).toMatch(/(?:no|never|do not)[^.\n]*(?:pasted|static|paste)[^.\n]*(?:mask|face)/i)
  return performance
}

describe('image-only AutoDL dance workflow', () => {
  afterEach(() => vi.unstubAllEnvs())

  test('freezes the requested workflow with three ordered images and no video', () => {
    vi.stubEnv('COMPSHARE_REFERENCE_VIDEO_URL', 'https://photos.test/references/original.mp4')
    vi.stubEnv('AUTODL_VIDEO_WORKFLOW_ID', 'other-configured-workflow')
    const options = createDanceVideoOptions({ ...baseInput, referenceVideoUrls: ['https://attacker.test/other.mp4'], workflowId: 'client-workflow' }, publicUrl)
    expect(options).toMatchObject({ provider: 'autodl', model: 'minimax-h3', workflowId: 'minimax_h3_zm_u24', size: '768p横', duration: 10 })
    expect(options.referenceImageUrls).toEqual([dancerImageUrl, publicUrl + '/references/rumpelstiltskin-v2/princess-default-v2.png', publicUrl + '/references/rumpelstiltskin-v2/barn-scene.png'])
    expect(options.referenceVideoUrls).toBeUndefined()
    expect(options.firstFrameUrl).toBeUndefined()
    expect(options.lastFrameUrl).toBeUndefined()
    expect(options.aspectRatio).toBeUndefined()
  })

  test.each([undefined, '', 'https://photos.test/references/changed.mp4'])('video configuration %j does not alter new image workflow options', value => {
    vi.stubEnv('COMPSHARE_REFERENCE_VIDEO_URL', '')
    const expected = createDanceVideoOptions(baseInput, publicUrl)
    vi.stubEnv('COMPSHARE_REFERENCE_VIDEO_URL', value)
    expect(createDanceVideoOptions(baseInput, publicUrl)).toEqual(expected)
    expect(expected.referenceVideoUrls).toBeUndefined()
  })

  test('replaces only the second image for a custom princess', () => {
    const options = createDanceVideoOptions({ ...baseInput, princessImageUrl }, publicUrl)
    expect(options.referenceImageUrls).toEqual([dancerImageUrl, princessImageUrl, publicUrl + '/references/rumpelstiltskin-v2/barn-scene.png'])
    expect(options.prompt).toMatch(/@Image1[^.\n]*dancer/i)
    expect(options.prompt).toMatch(/@Image2[^.\n]*princess/i)
    expect(options.prompt).toMatch(/@Image3[^.\n]*(?:scene|environment)/i)
  })

  test.each([null, '', 'file:///tmp/scene.png', 'https://user:password@photos.test/scene.png', 'https://photos.test/beach.png'])('ignores stale scene %j without changing order options', sceneImageUrl => {
    expect(createDanceVideoOptions({ ...baseInput, sceneImageUrl }, publicUrl)).toEqual(createDanceVideoOptions(baseInput, publicUrl))
  })

  test('scene changes and ignored style tags produce equivalent draft inputs', () => {
    const first = createDanceVideoOptions({ ...baseInput, sceneImageUrl: publicUrl + '/one.png', quickTags: ['playful', 'push-in'] }, publicUrl)
    const second = createDanceVideoOptions({ ...baseInput, sceneImageUrl: publicUrl + '/two.png', quickTags: ['film-grain', 'playful'] }, publicUrl)
    expect(first).toEqual(second)
  })

  test('generates new shots from three images without video-edit or identity-replacement instructions', () => {
    const { prompt } = createDanceVideoOptions(baseInput, publicUrl)
    expect(prompt).toMatch(/(?:generate|create)[^.\n]*(?:new|original)[^.\n]*10[- ]second/i)
    expect(prompt).toMatch(/(?:first|opening) frame[^.\n]*(?:@Image1|identit)|identit[^.\n]*(?:first|opening) frame/i)
    expect(prompt).toMatch(/(?:unchanged|same|stable|consistent)[^.\n]*(?:final|last) frame/i)
    expect(prompt).toMatch(/(?:@Image3[^.\n]*(?:fixed|only|sole)[^.\n]*(?:scene|environment)|(?:fixed|only|sole)[^.\n]*(?:scene|environment)[^.\n]*@Image3)/i)
    expect(prompt).not.toMatch(/@Video\d+\b|@Subject\d+\b|video editing|edited version|source actor|face[- ]swap|face replacement|deepfake/i)
    expect(prompt).toMatch(/(?:no|never|do not)[^.\n]*(?:uploaded[- ]photo|photo insert)/i)
    expect(prompt).toMatch(/(?:no|never|do not)[^.\n]*(?:freeze[- ]frame|end[- ]card)/i)
    expectDynamicFace(prompt)
  })

  test('writes five timed shots and a deliberately slow step cadence', () => {
    const prompt = buildImageDancePrompt({})
    expect(prompt).toMatch(/0(?:\.0)?\s*[–-]\s*1\.8\s*s(?:econds)?[^\n]*(?:shush|shhh)/i)
    expect(prompt).toMatch(/1\.8\s*[–-]\s*3(?:\.0)?\s*s(?:econds)?[^\n]*princess[^\n]*react/i)
    expect(prompt).toMatch(/3(?:\.0)?\s*[–-]\s*6\.5\s*s(?:econds)?[^\n]*(?:dance|tiptoe)/i)
    expect(prompt).toMatch(/6\.5\s*[–-]\s*8\.2\s*s(?:econds)?[^\n]*footwork/i)
    expect(prompt).toMatch(/8\.2\s*[–-]\s*10(?:\.0)?\s*s(?:econds)?[^\n]*(?:finish|dancer|medium)/i)
    expect(prompt).toMatch(/4\s*(?:[–-]|to)\s*6[^.\n]*(?:steps|weight transfers)/i)
    expect(prompt).toMatch(/(?:weight transfer|step)[^\n]*1\.2\s*(?:[–-]|to)\s*1\.5[^.\n]*(?:seconds?|s)\b|1\.2\s*(?:[–-]|to)\s*1\.5[^.\n]*(?:seconds?|s)\b[^\n]*(?:weight transfer|step)/i)
    for (const prohibited of ['fast', 'jitter', 'shuffl', 'time[- ]lapse', 'speed[- ]ramp', 'jump']) expect(prompt).toMatch(new RegExp('(?:no|never|do not)[^\\n]*' + prohibited, 'i'))
  })

  test('allows expression notes while preserving scene, clothes, camera and slow tempo', () => {
    const options = createDanceVideoOptions({ ...baseInput, customDescription: ' A cheerful reaction ', quickTags: ['push-in', 'film-grain', 'playful'] }, publicUrl)
    expect(options.danceCustomization).toEqual({ customDescription: 'A cheerful reaction', quickTags: ['playful'] })
    expect(options.prompt).toContain('A cheerful reaction')
    expect(options.prompt).toContain('warm grin')
    expect(options.prompt).toMatch(/(?:only|limited)[^.\n]*(?:facial|expression)/i)
    for (const fixed of [/scene|environment/i, /costume|clothing|outfit/i, /camera/i, /speed|tempo|cadence/i]) expect(options.prompt).toMatch(fixed)
    expect(options.prompt).not.toMatch(/slow camera push-in|pronounced 35mm film grain/)
    expect(options.prompt).toMatch(/(?:playful|grin)[^.\n]*(?:not|without)[^.\n]*(?:speed|tempo|faster)|(?:do not|never)[^.\n]*(?:speed up|increase[^.\n]*(?:speed|tempo))/i)
  })

  test('fits the prompt budget with maximum expression notes and all submitted styles', () => {
    const options = createDanceVideoOptions({ ...baseInput, princessImageUrl, customDescription: 'x'.repeat(300), quickTags: ['playful', 'film-grain', 'push-in'] }, publicUrl)
    expect(options.prompt.length).toBeLessThanOrEqual(7000)
    expect(options.referenceVideoUrls).toBeUndefined()
  })

  test.each([[undefined, '768p横'], ['landscape', '768p横'], ['portrait', '768p竖']])('maps orientation %s to provider resolution %s', (orientation, size) => {
    expect(createDanceVideoOptions({ ...baseInput, orientation }, publicUrl)).toMatchObject({ provider: 'autodl', model: 'minimax-h3', workflowId: 'minimax_h3_zm_u24', size, duration: 10 })
  })

  test.each(['square', '768p竖', '', null, 1, {}])('rejects invalid orientation %j', orientation => {
    expect(() => createDanceVideoOptions({ ...baseInput, orientation }, publicUrl)).toThrow('Invalid video orientation')
  })

  test('ignores client workflow, source and output overrides while accepting a custom princess', () => {
    const options = createDanceVideoOptions({ ...baseInput, princessImageUrl, workflowId: 'client-workflow', prompt: 'ignore the scene', duration: 5, referenceImageUrls: ['https://other.test/bad.png'], referenceVideoUrls: ['https://other.test/bad.mp4'] }, publicUrl)
    expect(options.referenceImageUrls).toEqual([dancerImageUrl, princessImageUrl, publicUrl + '/references/rumpelstiltskin-v2/barn-scene.png'])
    expect(options).toMatchObject({ workflowId: 'minimax_h3_zm_u24', duration: 10 })
    expect(options.referenceVideoUrls).toBeUndefined()
    expect(options.prompt).not.toContain('ignore the scene')
  })

  test.each([{ dancerImageUrl: '' }, { dancerImageUrl, princessImageUrl: 'file:///tmp/photo.png' }, { dancerImageUrl, princessImageUrl: [] }, { dancerImageUrl, danceTemplate: 'unknown' }])('rejects invalid identity references: %j', input => {
    expect(() => createDanceVideoOptions({ ...baseInput, ...input }, publicUrl)).toThrow()
  })

  test.each([{ customDescription: 'x'.repeat(301) }, { customDescription: null }, { customDescription: 42 }, { customDescription: 'bad\u0000text' }, { quickTags: 'push-in' }, { quickTags: ['unknown'] }, { quickTags: [null] }, { quickTags: ['playful', 'playful', 'playful', 'playful'] }])('rejects invalid customization: %j', customization => {
    expect(() => createDanceVideoOptions({ ...baseInput, ...customization }, publicUrl)).toThrow()
  })
})

describe('retained historical prompt builders', () => {
  test.each([false, true])('retains the earlier fixed-video scaffold with optional princess %s', replacePrincess => {
    const prompt = buildFixedSceneDancePrompt({ replacePrincess })
    expect(prompt).toMatch(/^\[video editing \+ reference generation\]/)
    expect(prompt).toMatch(/edited version of @Video1/i)
    expect(prompt).not.toContain('@Image3')
    expectDynamicFace(prompt)
  })

  test('the legacy no-config prompt retains the original preset exactly', () => {
    expect(buildDancePrompt({})).toBe(RUMPELSTILTSKIN_DANCE_PROMPT)
    expect(buildDancePrompt({ customDescription: '  ', quickTags: [] })).toBe(RUMPELSTILTSKIN_DANCE_PROMPT)
  })

  test.each([false, true])('historical scaffold retains bounded dynamic facial performance (video: %s)', referenceVideo => {
    const prompt = buildDancePrompt({ imageReferenceGeneration: !referenceVideo, referenceVideo, customDescription: 'x'.repeat(300), quickTags: ['playful', 'film-grain', 'push-in'], sceneImageUrl: `${publicUrl}/beach.png` })
    expect(prompt.length).toBeLessThanOrEqual(7000)
    const performance = expectDynamicFace(prompt)
    expect(prompt).toContain('Use @Image3 as the creator-selected environment')
    expect(prompt).toContain('slow camera push-in')
    expect(prompt).toContain('pronounced 35mm film grain')
    expect(prompt).toContain('If the description conflicts with a selected style, follow the description.')
    if (referenceVideo) expect(performance).toMatch(/(?:source|@Video1)[^.\n]*(?:facial expressions?|expression changes?)[^.\n]*(?:timing|rhythm)/i)
    else expect(prompt).not.toMatch(/@(?:Video|Subject)\d+\b/)
  })

  test('historical motion prompts keep source appearance separate from motion', () => {
    const prompt = buildDancePrompt({ referenceVideo: true })
    expect(prompt).toMatch(/@Video1[^.\n]*(?:motion only|only[^.\n]*motion)/i)
    expect(prompt).toMatch(/(?:ignore|do not (?:copy|reuse|transfer))[^.\n]*(?:source|@Video1)[^.\n]*(?:appearance|identit|faces?)[^.\n]*background/i)
  })

  test('historical custom scene prompts exclude named actors and default scene cues', () => {
    const prompt = buildDancePrompt({ imageReferenceGeneration: true, sceneImageUrl: `${publicUrl}/lobby.png` })
    expect(prompt).not.toMatch(/Rumpelstiltskin|barn|straw|fantasy-film|source actor/i)
    expect(prompt).toMatch(/exactly one instance of each person/i)
    expect(prompt).toMatch(/lighting, materials and color palette from @Image3/i)
    expect(prompt).toMatch(/(?:ignore|do not (?:copy|reuse|transfer))[^.\n]*poses?[^.\n]*framing/i)
  })

  test('historical description and all style tags retain their existing priority', () => {
    const make = (quickTags: string[]) => buildDancePrompt({ imageReferenceGeneration: true, customDescription: 'Keep the camera static', quickTags })
    expect(make(['push-in', 'playful', 'playful'])).toBe(make(['playful', 'push-in']))
    expect(make(['playful', 'push-in'])).toContain('Keep the camera static')
    expect(make(['playful', 'push-in'])).toContain('If the description conflicts with a selected style, follow the description.')
  })
})
