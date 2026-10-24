import { DANCE_ORIENTATIONS, DEFAULT_DANCE_ORIENTATION, type DanceOrientation } from '../../config/danceOutput'

export function normalizeDanceOrientation(value: unknown): DanceOrientation {
  if (value === undefined) return DEFAULT_DANCE_ORIENTATION
  if (typeof value !== 'string' || !DANCE_ORIENTATIONS.includes(value as DanceOrientation)) {
    throw new Error('Invalid video orientation')
  }
  return value as DanceOrientation
}
