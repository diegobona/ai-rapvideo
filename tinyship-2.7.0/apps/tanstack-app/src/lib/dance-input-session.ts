import { normalizeFixedSceneDanceCustomization } from '@libs/ai/dance-customization'
import { normalizeDanceOrientation } from '@libs/ai/dance-output'
import type { DanceQuickTag } from '../../../../config/danceCustomization'
import type { DanceOrientation } from '../../../../config/danceOutput'

type InputStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>
export interface SavedDanceInputs {
  dancerImageUrl: string
  princessImageUrl?: string
  customDescription: string
  quickTags: DanceQuickTag[]
  orientation: DanceOrientation
}
const prefix = 'rumpelstiltskin:last-inputs:'
const maxAge = 24 * 60 * 60 * 1000

function photoUrl(value: unknown): value is string {
  if (typeof value !== 'string') return false
  try { const url = new URL(value); return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password && !url.hash } catch { return false }
}

/** Only uploaded URLs and bounded creator controls; never raw photos or a full prompt. */
export function rememberDanceInputs(storage: InputStorage, storageKey: string, inputs: SavedDanceInputs, now = Date.now()) {
  try {
    if (!photoUrl(inputs.dancerImageUrl) || (inputs.princessImageUrl !== undefined && !photoUrl(inputs.princessImageUrl))) return
    const customization = normalizeFixedSceneDanceCustomization(inputs)
    storage.setItem(prefix + storageKey, JSON.stringify({ savedAt: now, dancerImageUrl: inputs.dancerImageUrl,
      ...(inputs.princessImageUrl ? { princessImageUrl: inputs.princessImageUrl } : {}), ...customization, orientation: normalizeDanceOrientation(inputs.orientation) }))
  } catch { /* Disabled storage does not stop the current generation. */ }
}

export function readDanceInputs(storage: InputStorage, storageKey: string, now = Date.now()): SavedDanceInputs | null {
  try {
    const raw = storage.getItem(prefix + storageKey)
    if (!raw) return null
    const value = JSON.parse(raw)
    if (!value || typeof value !== 'object' || Array.isArray(value) || typeof value.savedAt !== 'number' || value.savedAt > now || now - value.savedAt >= maxAge
      || !photoUrl(value.dancerImageUrl) || (value.princessImageUrl !== undefined && !photoUrl(value.princessImageUrl))) throw new Error('Invalid saved inputs')
    return { dancerImageUrl: value.dancerImageUrl, ...(value.princessImageUrl ? { princessImageUrl: value.princessImageUrl } : {}), ...normalizeFixedSceneDanceCustomization(value), orientation: normalizeDanceOrientation(value.orientation) }
  } catch {
    try { storage.removeItem(prefix + storageKey) } catch { /* Storage can be disabled. */ }
    return null
  }
}

export function forgetDanceInputs(storage: InputStorage, storageKey: string) {
  try { storage.removeItem(prefix + storageKey) } catch { /* Storage can be disabled. */ }
}
