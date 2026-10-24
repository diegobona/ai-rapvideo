export const DANCE_ORIENTATIONS = ['landscape', 'portrait'] as const
export type DanceOrientation = (typeof DANCE_ORIENTATIONS)[number]

export const DEFAULT_DANCE_ORIENTATION: DanceOrientation = 'landscape'

/** H3's resolution enum controls the actual output canvas. */
export const danceOrientationResolutions: Record<DanceOrientation, string> = {
  landscape: '768p横',
  portrait: '768p竖',
}

export const danceOrientationRatios: Record<DanceOrientation, string> = {
  landscape: '16:9',
  portrait: '9:16',
}
