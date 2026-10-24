export const DANCE_CUSTOM_DESCRIPTION_LIMIT = 300

export const DANCE_QUICK_TAG_IDS = ['playful', 'film-grain', 'push-in'] as const
export type DanceQuickTag = (typeof DANCE_QUICK_TAG_IDS)[number]

/** New fixed-source edits only expose facial-expression adjustments. */
export const DANCE_FIXED_SCENE_QUICK_TAG_IDS = ['playful'] as const
export const danceFixedSceneQuickTagInstructions = {
  playful: 'Make the dancer visibly cheerful and mischievous, with a warm grin. Preserve the source facial-motion timing, body motion, scene and camera.',
} as const

/** Expressions for fresh image-based shots; emotion never changes the step cadence. */
export const danceImageQuickTagInstructions = {
  playful: 'Give the dancer a warm grin and mischievous eyes, and the princess a playful, amused reaction. Do not speed up the dance or increase its tempo; keep the measured steps and shot timing unchanged.',
} as const

/** Concrete model instructions; UI labels never become generation instructions. */
export const danceQuickTagInstructions: Record<DanceQuickTag, string> = {
  playful: 'Make the dancer visibly cheerful and mischievous, with a warm grin and buoyant but readable tiptoe steps. Give the princess playful, amused surprise rather than fear.',
  'film-grain': 'Use pronounced 35mm film grain, soft halation around highlights, gently faded colors, warm amber light and deep teal shadows for a visibly stronger vintage-film texture.',
  'push-in': 'Use a slow camera push-in during the main dance shot: start medium-wide and gradually move closer to the dancer, ending in a closer framing. Keep the movement smooth and both identities stable.',
}
