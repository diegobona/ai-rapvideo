import { aiVideoConfig } from '../../../../config/aiVideo'

/** The server request and public specifications read the same output settings. */
export const danceOutputSettings = {
  duration: aiVideoConfig.defaults.duration,
  resolution: aiVideoConfig.autodl.defaultResolution.replace(/[横竖]/g, ''),
} as const

export const danceOutputSpecs = [
  { label: 'Aspect ratio', value: 'Choose landscape or portrait' },
  { label: 'Duration', value: `${danceOutputSettings.duration} seconds requested; the finished file can run slightly longer` },
  { label: 'File format', value: 'MP4' },
  { label: 'Audio', value: 'May include generated sound. The Tip Toe song is not included.' },
  { label: 'Resolution', value: danceOutputSettings.resolution },
] as const
