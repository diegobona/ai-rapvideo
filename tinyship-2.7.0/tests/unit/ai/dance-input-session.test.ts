import { describe, expect, test } from 'vitest'
import { readDanceInputs, rememberDanceInputs } from '../../../apps/tanstack-app/src/lib/dance-input-session'

function storage() {
  const values = new Map<string, string>()
  return { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value) }, removeItem: (key: string) => { values.delete(key) } }
}
const inputs = { dancerImageUrl: 'https://photos.test/dancer.jpg', princessImageUrl: 'https://photos.test/princess.jpg', customDescription: 'A sly grin', quickTags: ['playful' as const], orientation: 'portrait' as const }

describe('direct generation input recovery', () => {
  test('restores uploaded URLs and bounded controls only for the same ownership key', () => {
    const state = storage()
    rememberDanceInputs(state, 'visitor-a', { ...inputs, sceneImageUrl: 'https://photos.test/scene.jpg', prompt: 'full private prompt', apiKey: 'secret' } as any, 100)
    expect(readDanceInputs(state, 'visitor-a', 101)).toEqual(inputs)
    expect(readDanceInputs(state, 'visitor-b', 101)).toBeNull()
    const saved = state.getItem('rumpelstiltskin:last-inputs:visitor-a')!
    expect(saved).not.toMatch(/sceneImageUrl|prompt|apiKey|secret/)
  })
  test('expired, unsafe or malformed drafts cannot restore image inputs', () => {
    const state = storage()
    rememberDanceInputs(state, 'visitor-a', inputs, 100)
    expect(readDanceInputs(state, 'visitor-a', 100 + 24 * 60 * 60 * 1000)).toBeNull()
    state.setItem('rumpelstiltskin:last-inputs:visitor-a', JSON.stringify({ ...inputs, dancerImageUrl: 'javascript:alert(1)', savedAt: 100 }))
    expect(readDanceInputs(state, 'visitor-a', 101)).toBeNull()
  })
  test('disabled storage does not interrupt generation', () => {
    const state = { getItem: () => { throw new Error('disabled') }, setItem: () => { throw new Error('disabled') }, removeItem: () => { throw new Error('disabled') } }
    expect(() => rememberDanceInputs(state, 'visitor-a', inputs)).not.toThrow()
    expect(readDanceInputs(state, 'visitor-a')).toBeNull()
  })
})
