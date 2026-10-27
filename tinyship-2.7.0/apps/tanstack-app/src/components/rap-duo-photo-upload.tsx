import { useRef } from 'react'
import { ImagePlus, LoaderCircle } from 'lucide-react'
import type { rapCopy } from '@/lib/rap-copy'
import './rap-duo-photo-upload.css'

export type RapDuoPhotoCopy = typeof rapCopy.en.duoPhoto | (typeof rapCopy)['zh-CN']['duoPhoto']

export interface RapDuoPhotoUploadProps {
  id: string
  disabled: boolean
  busy: boolean
  message?: string | null
  error?: string | null
  copy: RapDuoPhotoCopy
  onSelect: (file: File) => void
}

export function RapDuoPhotoUpload({ id, disabled, busy, message, error, copy, onSelect }: RapDuoPhotoUploadProps) {
  const input = useRef<HTMLInputElement>(null)
  const blocked = disabled || busy

  return <div className="rap-duo-photo-upload" aria-busy={busy}>
    <button className="rap-duo-photo-upload-button" type="button" disabled={blocked}
      aria-describedby={id + '-hint'} onClick={() => input.current?.click()}>
      {busy ? <LoaderCircle className="rap-duo-spin" size={16} aria-hidden="true" /> : <ImagePlus size={16} aria-hidden="true" />}
      {busy ? copy.busy : copy.label}
    </button>
    <input ref={input} id={id} className="rap-duo-photo-upload-hidden" type="file"
      accept=".jpg,.jpeg,.png,.webp" aria-label={copy.label} tabIndex={-1} disabled={blocked}
      onChange={event => {
        const file = event.currentTarget.files?.[0]
        event.currentTarget.value = ''
        if (file && !blocked) onSelect(file)
      }} />
    <p className="rap-duo-photo-upload-hint" id={id + '-hint'}>{copy.hint}</p>
    <span className="rap-duo-photo-upload-hidden" role="status" aria-live="polite">{busy ? copy.busy : ''}</span>
    {!busy && message && !error && <p className="rap-duo-photo-upload-message" role="status" aria-live="polite">{message}</p>}
    {error && <p className="rap-duo-photo-upload-error" role="alert">{error}</p>}
  </div>
}
