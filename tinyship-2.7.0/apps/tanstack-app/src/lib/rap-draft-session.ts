import { RAP_VIDEO_MAX_TOPIC_LENGTH, RAP_VIDEO_SCENES, type RapVideoSceneId } from '../../../../config/rapVideo'
import { RAP_VOICE_PROFILES, type RapVoiceType } from '../../../../config/rapVoices'
import { validateRapPhoto } from './rap-generation'

export interface RapCreatorDraft {
  photos: [File | null, File | null]
  scene: RapVideoSceneId
  topic: string
  voices: [RapVoiceType, RapVoiceType]
  photoMode: 'separate' | 'together'
  consent: boolean
}

interface StoredRapDraft {
  id: string
  draft: RapCreatorDraft
  photoExpiresAt: [number | null, number | null]
  expiresAt: number
}

const DATABASE_NAME = 'rap-creator-drafts'
const STORE_NAME = 'drafts'
const SESSION_KEY = 'rap-creator-draft-id'
const MAX_AGE_MS = 24 * 60 * 60 * 1_000
const photoExpiry = new WeakMap<File, number>()
let operations: Promise<unknown> = Promise.resolve()
let latestSave: Promise<void> = Promise.resolve()

// Reads and clears join the same queue so a pending write cannot resurrect a cleared draft.
function enqueue<T>(operation: () => Promise<T>): Promise<T> {
  const result = operations.then(operation, operation)
  operations = result.then(() => undefined, () => undefined)
  return result
}

function draftId(create = false): string | null {
  const existing = window.sessionStorage.getItem(SESSION_KEY)
  if (existing) return existing
  if (!create) return null
  const id = window.crypto.randomUUID()
  window.sessionStorage.setItem(SESSION_KEY, id)
  return id
}

/** Call after flushing, while a reserved payment popup is still same-origin. */
export function copyRapDraftSession(target: Window): void {
  if (typeof window === 'undefined') return
  const id = draftId()
  if (id) target.sessionStorage.setItem(SESSION_KEY, id)
  else target.sessionStorage.removeItem(SESSION_KEY)
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) { reject(new Error('Rap draft storage is unavailable')); return }
    const request = window.indexedDB.open(DATABASE_NAME, 1)
    let blocked = false
    request.onupgradeneeded = () => {
      const store = request.result.createObjectStore(STORE_NAME, { keyPath: 'id' })
      store.createIndex('expiresAt', 'expiresAt')
    }
    request.onsuccess = () => {
      if (blocked) request.result.close()
      else resolve(request.result)
    }
    request.onerror = () => reject(request.error ?? new Error('Could not open rap draft storage'))
    request.onblocked = () => {
      blocked = true
      reject(new Error('Rap draft storage is blocked by another tab'))
    }
  })
}

async function withStore<T>(action: (store: IDBObjectStore, finish: (value: T) => void, fail: (error: unknown) => void) => void): Promise<T> {
  const database = await openDatabase()
  try {
    return await new Promise<T>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, 'readwrite')
      const store = transaction.objectStore(STORE_NAME)
      let result: T
      let failure: unknown
      const fail = (error: unknown) => { failure = error; transaction.abort() }
      transaction.oncomplete = () => resolve(result)
      transaction.onerror = transaction.onabort = () => reject(failure ?? transaction.error ?? new Error('Rap draft storage failed'))
      // Expired records from closed tabs are removed whenever the creator is used again.
      const expired = store.index('expiresAt').openKeyCursor(IDBKeyRange.upperBound(Date.now()))
      expired.onsuccess = () => {
        const cursor = expired.result
        if (cursor) { store.delete(cursor.primaryKey); cursor.continue() }
      }
      try { action(store, value => { result = value }, fail) }
      catch (error) { fail(error) }
    })
  } finally {
    database.close()
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}

function validateDraft(value: unknown): asserts value is RapCreatorDraft {
  if (!isRecord(value) || !Array.isArray(value.photos) || value.photos.length !== 2
    || value.photos.some(photo => photo !== null && (!(photo instanceof File) || validateRapPhoto(photo)))
    || !RAP_VIDEO_SCENES.some(scene => scene.id === value.scene)
    || typeof value.topic !== 'string' || value.topic.length > RAP_VIDEO_MAX_TOPIC_LENGTH
    || !Array.isArray(value.voices) || value.voices.length !== 2
    || value.voices.some(voice => typeof voice !== 'string' || ![...RAP_VOICE_PROFILES, 'male', 'female'].includes(voice))
    || !['separate', 'together'].includes(String(value.photoMode)) || typeof value.consent !== 'boolean') {
    throw new Error('Invalid rap creator draft')
  }
}

function readStored(value: unknown): StoredRapDraft | null {
  if (value === undefined) return null
  if (!isRecord(value) || typeof value.id !== 'string'
    || typeof value.expiresAt !== 'number' || !Number.isFinite(value.expiresAt)
    || !Array.isArray(value.photoExpiresAt) || value.photoExpiresAt.length !== 2
    || value.photoExpiresAt.some(expiry => expiry !== null && (typeof expiry !== 'number' || !Number.isFinite(expiry)))) {
    throw new Error('Invalid stored rap creator draft')
  }
  validateDraft(value.draft)
  const expiries = value.photoExpiresAt
  if (value.draft.photos.some((photo, index) => Boolean(photo) !== (expiries[index] !== null))) {
    throw new Error('Invalid stored rap photo expiry')
  }
  return value as unknown as StoredRapDraft
}

function samePhoto(first: File, second: File): boolean {
  return first.name === second.name && first.type === second.type && first.size === second.size && first.lastModified === second.lastModified
}

export function readRapDraft(): Promise<RapCreatorDraft | null> {
  if (typeof window === 'undefined') return Promise.resolve(null)
  return enqueue(() => {
    const id = draftId()
    return withStore<RapCreatorDraft | null>((store, finish, fail) => {
      if (!id) { finish(null); return }
      const request = store.get(id)
      request.onsuccess = () => {
        try {
          const saved = readStored(request.result)
          if (!saved || saved.expiresAt <= Date.now()) {
            if (saved) store.delete(id)
            finish(null)
            return
          }
          saved.draft.photos.forEach((photo, index) => {
            if (photo) photoExpiry.set(photo, saved.photoExpiresAt[index]!)
          })
          finish(saved.draft)
        } catch (error) { fail(error) }
      }
    })
  })
}

export function saveRapDraft(draft: RapCreatorDraft): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve()
  // Capture arrays now, before earlier writes finish; Files themselves are immutable.
  const snapshot: RapCreatorDraft = { ...draft, photos: [...draft.photos], voices: [...draft.voices] }
  latestSave = enqueue(async () => {
    validateDraft(snapshot)
    const id = draftId(true)!
    await withStore<void>((store, finish, fail) => {
      const request = store.get(id)
      request.onsuccess = () => {
        try {
          const now = Date.now()
          const saved = readStored(request.result)
          const previous = saved && saved.expiresAt > now ? saved : null
          const expiries = snapshot.photos.map(photo => {
            if (!photo) return null
            // Metadata matching also preserves age after a reload or a performer swap.
            const oldIndex = previous?.draft.photos.findIndex(old => old !== null && samePhoto(old, photo)) ?? -1
            const expiry = photoExpiry.get(photo) ?? (oldIndex >= 0 ? previous!.photoExpiresAt[oldIndex]! : now + MAX_AGE_MS)
            if (expiry <= now) throw new Error('Rap draft photo has expired')
            return expiry
          }) as StoredRapDraft['photoExpiresAt']
          const retainedExpiries = expiries.filter((expiry): expiry is number => expiry !== null)
          const expiresAt = retainedExpiries.length ? Math.min(...retainedExpiries) : previous?.expiresAt ?? now + MAX_AGE_MS
          const record: StoredRapDraft = { id, draft: snapshot, photoExpiresAt: expiries, expiresAt }
          store.put(record)
          snapshot.photos.forEach((photo, index) => { if (photo) photoExpiry.set(photo, expiries[index]!) })
          finish(undefined)
        } catch (error) { fail(error) }
      }
    })
  })
  return latestSave
}

export function clearRapDraft(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve()
  latestSave = enqueue(async () => {
    const id = draftId()
    await withStore<void>((store, finish) => { if (id) store.delete(id); finish(undefined) })
    window.sessionStorage.removeItem(SESSION_KEY)
  })
  return latestSave
}

/** The mounted creator adds its current-state save promise synchronously to detail.promises. */
export async function flushRapDraft(): Promise<void> {
  if (typeof window === 'undefined') return
  const promises: Promise<void>[] = []
  window.dispatchEvent(new CustomEvent('rap-save-draft', { detail: { promises } }))
  await Promise.all(promises)
  await latestSave
}
