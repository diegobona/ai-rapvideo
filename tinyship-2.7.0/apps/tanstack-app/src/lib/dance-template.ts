import type { VideoGenerationOptions } from '@libs/ai/types'
import { aiVideoConfig } from '../../../../config/aiVideo'
import { buildImageDancePrompt, buildFixedSceneDancePrompt } from './dance-prompt'
import { danceOutputSettings } from './dance-output-specs'
import { danceOrientationRatios, danceOrientationResolutions } from '../../../../config/danceOutput'
import { normalizeDanceOrientation } from '@libs/ai/dance-output'
import { DANCE_REFERENCE_KEYS, DANCE_SOURCE_VIDEO_KEY } from '../../../../config/danceReferences'
import { normalizeFixedSceneDanceCustomization } from '@libs/ai/dance-customization'
export { DANCE_REFERENCE_KEYS } from '../../../../config/danceReferences'

function imageUrl(value: unknown): string {
  if (typeof value !== 'string' || !value.trim()) throw new Error('A valid reference image URL is required')
  const parsed = new URL(value)
  if (parsed.protocol !== 'https:' || parsed.username || parsed.password || parsed.hash) {
    throw new Error('Reference images must use public HTTPS URLs')
  }
  return parsed.href
}

/** Server-owned output settings with validated optional visual customization. */
export function createDanceVideoOptions(body: Record<string, unknown>, publicStorageUrl: string): VideoGenerationOptions {
  if (body.danceTemplate !== 'rumpelstiltskin-v2') throw new Error('Unknown dance template')
  const base = imageUrl(publicStorageUrl).replace(/\/+$/, '')
  const dancer = imageUrl(body.dancerImageUrl)
  const provider: string = aiVideoConfig.defaultProvider
  const orientation = normalizeDanceOrientation(body.orientation)
  if (provider === 'compshare') {
    const princess = body.princessImageUrl === undefined ? undefined : imageUrl(body.princessImageUrl)
    const customization = normalizeFixedSceneDanceCustomization(body)
    const sourceVideo = imageUrl(process.env.COMPSHARE_REFERENCE_VIDEO_URL?.trim() || `${base}/${DANCE_SOURCE_VIDEO_KEY}`)
    return {
      provider: 'compshare', model: aiVideoConfig.defaultModels.compshare,
      prompt: buildFixedSceneDancePrompt({ ...customization, replacePrincess: princess !== undefined }),
      danceCustomization: customization,
      referenceImageUrls: [dancer, ...(princess ? [princess] : [])],
      referenceVideoUrls: [sourceVideo],
      duration: danceOutputSettings.duration,
      size: aiVideoConfig.compshare.defaultResolution,
      aspectRatio: danceOrientationRatios[orientation],
      watermark: false,
    }
  }
  const princess = body.princessImageUrl === undefined
    ? `${base}/${DANCE_REFERENCE_KEYS.princess}`
    : imageUrl(body.princessImageUrl)
  const customization = normalizeFixedSceneDanceCustomization(body)
  return {
    provider: 'autodl',
    model: aiVideoConfig.defaultModels.autodl,
    workflowId: aiVideoConfig.autodl.workflowId,
    prompt: buildImageDancePrompt(customization),
    danceCustomization: customization,
    referenceImageUrls: [dancer, princess, `${base}/${DANCE_REFERENCE_KEYS.scene}`],
    duration: danceOutputSettings.duration,
    size: danceOrientationResolutions[orientation],
    watermark: false,
  }
}
