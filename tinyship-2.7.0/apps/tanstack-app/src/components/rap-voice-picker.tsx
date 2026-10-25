import { useEffect, useRef, useState } from 'react'
import { Check, ChevronDown, LoaderCircle, Square, Volume2 } from 'lucide-react'
import { RAP_VOICE_PROFILES, isRapVoiceAvailable, rapVoiceProfile, rapVoiceReference, type RapVoiceType } from '../../../../config/rapVoices'
import type { rapCopy } from '../lib/rap-copy'

type Copy = typeof rapCopy.en | typeof rapCopy['zh-CN']

function VoicePreview({ index, voice, copy }: { index: 0 | 1; voice: RapVoiceType; copy: Copy }) {
  const audio = useRef<HTMLAudioElement>(null)
  const playRequest = useRef(0)
  const [state, setState] = useState<'idle' | 'loading' | 'playing' | 'error'>('idle')
  const profile = rapVoiceProfile(voice)
  useEffect(() => {
    const element = audio.current
    return () => { element?.pause() }
  }, [])

  async function toggle() {
    const element = audio.current
    if (!element) return
    if (state === 'playing' || state === 'loading') { playRequest.current++; element.pause(); setState('idle'); return }
    element.closest('.rap-duo-maker')?.querySelectorAll('audio').forEach(other => { if (other !== element) other.pause() })
    setState('loading')
    const request = ++playRequest.current
    try { element.currentTime = 0; await element.play() }
    catch { if (element.isConnected && request === playRequest.current) setState('error') }
  }

  const active = state === 'loading' || state === 'playing'
  const label = (active ? copy.voice.stop : copy.voice.preview) + ' — ' + copy.voice.profiles[profile]
  return <div className="rap-duo-voice-sample">
    <button type="button" className="rap-duo-voice-listen" onClick={() => { void toggle() }} aria-label={label} title={label} aria-pressed={active}>
      {state === 'loading' ? <LoaderCircle size={15} className="rap-duo-spin" aria-hidden="true" /> : active ? <Square size={13} aria-hidden="true" /> : <Volume2 size={16} aria-hidden="true" />}
    </button>
    <audio ref={audio} hidden preload="none" src={rapVoiceReference(index, voice).url}
      onPlaying={() => setState('playing')} onPause={() => { playRequest.current++; setState('idle') }} onEnded={() => setState('idle')} onError={() => setState('error')} />
    {state === 'error' && <span className="rap-duo-voice-sample-error" role="status">{copy.voice.previewError}</span>}
  </div>
}

export function RapVoicePicker({ id, index, voice, otherVoice, disabled, copy, onChange }: {
  id: string; index: 0 | 1; voice: RapVoiceType; otherVoice: RapVoiceType; disabled: boolean; copy: Copy; onChange: (voice: RapVoiceType) => void
}) {
  const root = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const [open, setOpen] = useState(false)
  const selected = rapVoiceProfile(voice)
  const other = rapVoiceProfile(otherVoice)
  useEffect(() => { setOpen(false) }, [disabled, voice, otherVoice])
  useEffect(() => {
    if (!open) return
    function dismiss(event: Event) {
      if (!root.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', dismiss)
    // A label click can temporarily blur the trigger before activating its radio.
    // Close only when focus actually arrives outside, not during that transition.
    document.addEventListener('focusin', dismiss)
    return () => {
      document.removeEventListener('pointerdown', dismiss)
      document.removeEventListener('focusin', dismiss)
    }
  }, [open])

  return <div className="rap-duo-voice" ref={root} onKeyDown={event => {
    if (event.key === 'Escape' && open) { event.preventDefault(); event.stopPropagation(); setOpen(false); trigger.current?.focus() }
  }}>
    <label id={id + '-label'} htmlFor={id}>{copy.voice.label}</label>
    <button ref={trigger} id={id} className="rap-duo-voice-trigger" type="button" disabled={disabled}
      aria-label={copy.people[index] + ' ' + copy.voice.label + ' — ' + copy.voice.profiles[selected]}
      aria-expanded={open} aria-controls={id + '-choices'} onClick={() => setOpen(current => !current)}>
      <span>{copy.voice.profiles[selected]}</span><ChevronDown size={14} aria-hidden="true" />
    </button>
    {open && !disabled && <div id={id + '-choices'} className="rap-duo-voice-choices" role="group" aria-labelledby={id + '-label'}>
      {RAP_VOICE_PROFILES.map(profile => {
        const unavailable = !isRapVoiceAvailable(index, profile)
        const inUse = profile === other
        return <div key={profile} className={'rap-duo-voice-option' + (selected === profile ? ' is-selected' : '')}>
          <label className="rap-duo-voice-choice">
            <input type="radio" name={id + '-choice'} value={profile} checked={selected === profile} disabled={inUse || unavailable}
              onChange={() => { onChange(profile); setOpen(false); trigger.current?.focus() }} />
            <span className="rap-duo-voice-choice-text">{copy.voice.profiles[profile]}{inUse && <small>{copy.voice.inUse}</small>}</span>
            {selected === profile && <Check size={13} aria-hidden="true" />}
          </label>
          {!unavailable && <VoicePreview index={index} voice={profile} copy={copy} />}
        </div>
      })}
    </div>}
  </div>
}
