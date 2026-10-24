import {
  DANCE_CUSTOM_DESCRIPTION_LIMIT,
  DANCE_QUICK_TAG_IDS,
  DANCE_FIXED_SCENE_QUICK_TAG_IDS,
  type DanceQuickTag,
  danceQuickTagInstructions,
} from '../../config/danceCustomization'

export interface DanceCustomization {
  customDescription?: string
  quickTags?: readonly DanceQuickTag[]
}

/** Recover only bounded creator fields from the known pre-metadata templates. */
export function readSavedDanceCustomization(options: { prompt: string; danceCustomization?: DanceCustomization }) {
  if (options.danceCustomization) return normalizeDanceCustomization(options.danceCustomization)
  const prompt = options.prompt
  const description = prompt.match(/(?:^|\n)(?:Creator description:|CREATOR DESCRIPTION)\n([\s\S]*?)\n\n(?:detailed_description:|Apply the requested visual changes)/)?.[1] ?? ''
  const defaults = [
    'Use the image-defined characters and environment with the source dance performance.',
    'Use the selected styles with the default scene and performance.',
    'Use the selected styles in the environment from @Image3 with the default dance performance.',
    'Use the original facial performance with the uploaded identities.',
  ]
  const styles = prompt.match(/(?:^|\n)(?:Selected styles:|SELECTED STYLES)\n([\s\S]*?)\n\n?(?:Creator description:|CREATOR DESCRIPTION)\n/)?.[1] ?? ''
  try {
    return normalizeDanceCustomization({
      customDescription: defaults.includes(description) ? '' : description,
      quickTags: DANCE_QUICK_TAG_IDS.filter(tag => styles.includes(danceQuickTagInstructions[tag])),
    })
  } catch {
    return normalizeDanceCustomization({})
  }
}

/** New drafts filter legacy visual styles; old saved orders keep all supported tags. */
export function normalizeFixedSceneDanceCustomization(input: { customDescription?: unknown; quickTags?: unknown }) {
  const customization = normalizeDanceCustomization(input)
  return {
    customDescription: customization.customDescription,
    quickTags: DANCE_FIXED_SCENE_QUICK_TAG_IDS.filter(tag => customization.quickTags.includes(tag)),
  }
}

/** Shared input contract, also enforced by the server before creating checkout. */
export function normalizeDanceCustomization(input: {
  customDescription?: unknown
  quickTags?: unknown
}): { customDescription: string; quickTags: DanceQuickTag[] } {
  const description = input.customDescription
  if (description !== undefined && (
    typeof description !== 'string'
    || description.length > DANCE_CUSTOM_DESCRIPTION_LIMIT
    || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(description)
  )) throw new Error('Invalid dance description')

  const tags = input.quickTags ?? []
  if (input.quickTags === null || !Array.isArray(tags) || tags.length > DANCE_QUICK_TAG_IDS.length
    || tags.some(tag => typeof tag !== 'string' || !DANCE_QUICK_TAG_IDS.includes(tag as DanceQuickTag))) {
    throw new Error('Invalid dance style tags')
  }

  return {
    customDescription: typeof description === 'string' ? description.trim() : '',
    // Stable ordering keeps identical choices on the same idempotent checkout draft.
    quickTags: DANCE_QUICK_TAG_IDS.filter(tag => tags.includes(tag)),
  }
}
