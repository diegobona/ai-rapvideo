import type { Detection, FaceDetector } from '@mediapipe/tasks-vision'
import { validateRapPhoto } from './rap-generation'

export type DuoPhotoErrorCode = 'fileType' | 'fileSize' | 'image' | 'noFaces' | 'oneFace' | 'manyFaces' | 'overlap' | 'unavailable' | 'failed'
export class DuoPhotoError extends Error {
  constructor(readonly code: DuoPhotoErrorCode) { super(code); this.name = 'DuoPhotoError' }
}

type Rect = { x: number; y: number; width: number; height: number }
type Face = Rect & { score: number }
type DecodedImage = { source: CanvasImageSource; width: number; height: number; dispose: () => void }
const ASSET_ROOT = '/models/face-detector'
let detector: Promise<FaceDetector> | undefined

function abortable<T>(promise: Promise<T>, signal?: AbortSignal): Promise<T> {
  if (!signal) return promise
  signal.throwIfAborted()
  return new Promise((resolve, reject) => {
    const abort = () => reject(signal.reason)
    signal.addEventListener('abort', abort, { once: true })
    promise.then(resolve, reject).finally(() => signal.removeEventListener('abort', abort))
  })
}

async function getDetector() {
  detector ??= (async () => {
    // Lazy-loaded, first-party assets: no photo is sent to a detection service.
    const { FaceDetector, FilesetResolver } = await import('@mediapipe/tasks-vision')
    const files = await FilesetResolver.forVisionTasks(ASSET_ROOT)
    return FaceDetector.createFromOptions(files, {
      baseOptions: { modelAssetPath: `${ASSET_ROOT}/model.tflite`, delegate: 'CPU' },
      runningMode: 'IMAGE', minDetectionConfidence: 0.6, minSuppressionThreshold: 0.3,
    })
  })().catch(() => { detector = undefined; throw new DuoPhotoError('unavailable') })
  return detector
}

async function decodePhoto(file: File): Promise<DecodedImage> {
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
      return { source: bitmap, width: bitmap.width, height: bitmap.height, dispose: () => bitmap.close() }
    } catch { /* Older browsers can decode the same image through an img element. */ }
  }
  const url = URL.createObjectURL(file)
  const image = new Image()
  try {
    await new Promise<void>((resolve, reject) => { image.onload = () => resolve(); image.onerror = () => reject(new DuoPhotoError('image')); image.src = url })
    return { source: image, width: image.naturalWidth, height: image.naturalHeight, dispose: () => URL.revokeObjectURL(url) }
  } catch (error) { URL.revokeObjectURL(url); throw error }
}

function canvas(width: number, height: number) {
  const result = document.createElement('canvas')
  result.width = Math.max(1, Math.round(width)); result.height = Math.max(1, Math.round(height))
  const context = result.getContext('2d')
  if (!context) throw new DuoPhotoError('unavailable')
  return { canvas: result, context }
}

function overlap(a: Rect, b: Rect) {
  return Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y))
}

function distinctFaces(faces: Face[]) {
  const kept: Face[] = []
  for (const face of faces.sort((a, b) => b.score - a.score)) {
    if (!kept.some(other => overlap(face, other) / Math.min(face.width * face.height, other.width * other.height) > 0.45)) kept.push(face)
  }
  return kept
}

function readFaces(detections: Detection[], region: Rect, imageWidth: number, imageHeight: number): Face[] {
  return detections.flatMap(detection => {
    const box = detection.boundingBox
    const score = Math.max(0, ...detection.categories.map(category => category.score))
    if (!box || score < 0.6 || ![box.originX, box.originY, box.width, box.height].every(Number.isFinite) || box.width < 8 || box.height < 8) return []
    const x = Math.max(0, region.x + box.originX), y = Math.max(0, region.y + box.originY)
    const width = Math.min(imageWidth, region.x + box.originX + box.width) - x
    const height = Math.min(imageHeight, region.y + box.originY + box.height) - y
    return width > 0 && height > 0 ? [{ x, y, width, height, score }] : []
  })
}

async function locateFaces(source: HTMLCanvasElement, model: FaceDetector, signal?: AbortSignal) {
  const width = source.width, height = source.height
  let found = readFaces(model.detect(source).detections, { x: 0, y: 0, width, height }, width, height)
  if (found.length < 2) {
    // Overlapping tiles preserve faces near the middle and help with smaller
    // faces in full-body photos; they are not a blind left/right image split.
    const tile = canvas(width * 0.68, height * 0.68)
    for (const [x, y] of [[0, 0], [width - tile.canvas.width, 0], [0, height - tile.canvas.height], [width - tile.canvas.width, height - tile.canvas.height]]) {
      signal?.throwIfAborted()
      await new Promise<void>(resolve => setTimeout(resolve, 0))
      tile.context.drawImage(source, x, y, tile.canvas.width, tile.canvas.height, 0, 0, tile.canvas.width, tile.canvas.height)
      found.push(...readFaces(model.detect(tile.canvas).detections, { x, y, width: tile.canvas.width, height: tile.canvas.height }, width, height))
    }
    tile.canvas.width = tile.canvas.height = 1
    found = distinctFaces(found)
  }
  if (found.length !== 2) throw new DuoPhotoError(found.length === 0 ? 'noFaces' : found.length === 1 ? 'oneFace' : 'manyFaces')
  return found.sort((a, b) => (a.x + a.width / 2) - (b.x + b.width / 2) || a.y - b.y) as [Face, Face]
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

function portraitCrop(face: Face, region: Rect): Rect {
  // Keep the full face, hair, and upper body, while the dividing boundary
  // excludes the other face from this person's reference image.
  const width = Math.min(region.width, face.width * 2.8)
  const height = Math.min(region.height, Math.max(face.height * 3.4, width * 4 / 3))
  if (width < face.width || height < face.height) throw new DuoPhotoError('overlap')
  return {
    x: clamp(face.x + face.width / 2 - width / 2, region.x, region.x + region.width - width),
    y: clamp(face.y - face.height * 0.6, region.y, region.y + region.height - height), width, height,
  }
}

function cropRegions(faces: [Face, Face], width: number, height: number): [Rect, Rect] {
  const [left, right] = faces
  if (left.x + left.width <= right.x) {
    const boundary = (left.x + left.width + right.x) / 2
    return [portraitCrop(left, { x: 0, y: 0, width: boundary, height }), portraitCrop(right, { x: boundary, y: 0, width: width - boundary, height })]
  }
  // People at different heights can still be separated without cutting a face.
  const top = left.y < right.y ? left : right, bottom = top === left ? right : left
  if (top.y + top.height > bottom.y) throw new DuoPhotoError('overlap')
  const boundary = (top.y + top.height + bottom.y) / 2
  return faces.map(face => portraitCrop(face, face === top ? { x: 0, y: 0, width, height: boundary } : { x: 0, y: boundary, width, height: height - boundary })) as [Rect, Rect]
}

async function encodePortrait(image: DecodedImage, crop: Rect, name: string): Promise<File> {
  const scale = Math.min(1, 1024 / Math.max(crop.width, crop.height))
  const target = canvas(crop.width * scale, crop.height * scale)
  target.context.fillStyle = '#ffffff'
  target.context.fillRect(0, 0, target.canvas.width, target.canvas.height)
  target.context.drawImage(image.source, crop.x, crop.y, crop.width, crop.height, 0, 0, target.canvas.width, target.canvas.height)
  const blob = await new Promise<Blob>((resolve, reject) => target.canvas.toBlob(blob => blob ? resolve(blob) : reject(new DuoPhotoError('failed')), 'image/jpeg', 0.92))
  target.canvas.width = target.canvas.height = 1
  return new File([blob], name, { type: 'image/jpeg', lastModified: Date.now() })
}

/** Detect and crop locally. The original joint photo is never uploaded here. */
export async function splitDuoPhoto(file: File, signal?: AbortSignal): Promise<[File, File]> {
  const invalid = validateRapPhoto(file)
  if (invalid) throw new DuoPhotoError(invalid)
  signal?.throwIfAborted()
  let image: DecodedImage | undefined
  let analysis: HTMLCanvasElement | undefined
  try {
    image = await decodePhoto(file)
    signal?.throwIfAborted()
    if (image.width < 64 || image.height < 64 || image.width * image.height > 48_000_000) throw new DuoPhotoError('image')
    const scale = Math.min(1, 1600 / Math.max(image.width, image.height))
    const prepared = canvas(image.width * scale, image.height * scale)
    analysis = prepared.canvas
    prepared.context.drawImage(image.source, 0, 0, analysis.width, analysis.height)
    const model = await abortable(getDetector(), signal)
    signal?.throwIfAborted()
    await new Promise<void>(resolve => setTimeout(resolve, 0))
    const faces = await locateFaces(analysis, model, signal)
    const mapped = faces.map(face => ({ ...face, x: face.x * image!.width / analysis!.width, y: face.y * image!.height / analysis!.height, width: face.width * image!.width / analysis!.width, height: face.height * image!.height / analysis!.height })) as [Face, Face]
    const crops = cropRegions(mapped, image.width, image.height)
    const stem = file.name.replace(/\.[^.]+$/, '').slice(0, 80) || 'duo'
    const portraits = await Promise.all(crops.map((crop, index) => encodePortrait(image!, crop, `${stem}-person-${index + 1}.jpg`)))
    signal?.throwIfAborted()
    return portraits as [File, File]
  } catch (error) {
    if (signal?.aborted) throw signal.reason
    throw error instanceof DuoPhotoError ? error : new DuoPhotoError('failed')
  } finally { image?.dispose(); if (analysis) analysis.width = analysis.height = 1 }
}
