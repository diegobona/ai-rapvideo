import catalog from './rapVoiceSources.json';

export type RapVoiceProfile = keyof typeof catalog;
/** Legacy gender-only values remain accepted for already-open browser tabs. */
export type RapVoiceType = RapVoiceProfile | 'male' | 'female';
export const RAP_VOICE_PROFILES = Object.keys(catalog) as RapVoiceProfile[];

export function rapVoiceProfile(value: RapVoiceType): RapVoiceProfile {
  return value === 'male' ? 'male-young' : value === 'female' ? 'female-young' : value;
}

export function isRapVoiceAvailable(_index: 0 | 1, type: RapVoiceType): boolean {
  return Object.hasOwn(catalog, rapVoiceProfile(type));
}

/** Separated from the supplied friends example; kept apart from the vocal references. */
export const RAP_BGM_REFERENCE_URL = 'https://ai-rapvideo.co/audio/rap-voices/friends-reference-v1/bgm.mp3';

/** Old open tabs retain the default pair; an explicit selection must be valid. */
export function normalizeRapVoices(value: unknown): [RapVoiceType, RapVoiceType] {
  if (value === undefined) return ['male-young', 'female-young'];
  if (!Array.isArray(value) || value.length !== 2 || value.some(voice =>
    typeof voice !== 'string' || (voice !== 'male' && voice !== 'female' && !Object.hasOwn(catalog, voice)))) {
    throw new Error('Select a voice for each performer');
  }
  const normalized: [RapVoiceProfile, RapVoiceProfile] = [rapVoiceProfile(value[0]), rapVoiceProfile(value[1])];
  if (!isRapVoiceAvailable(0, normalized[0]) || !isRapVoiceAvailable(1, normalized[1])) {
    throw new Error('This voice is still being prepared; select an available voice');
  }
  if (normalized[0] === normalized[1]) {
    throw new Error('Choose two different voices for the performers');
  }
  return normalized;
}

/** Preview and generation share the exact owner-supplied recording, regardless of position. */
export function rapVoiceReference(_index: 0 | 1, type: RapVoiceType) {
  const reference = catalog[rapVoiceProfile(type)];
  return {
    id: reference.id,
    url: `https://ai-rapvideo.co/audio/rap-voices/owner-v1/${reference.id}.mp3`,
    description: reference.description,
  };
}
