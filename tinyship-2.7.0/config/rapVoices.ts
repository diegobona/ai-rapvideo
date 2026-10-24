export type RapVoiceType = 'male' | 'female';

/** Old open tabs retain the default pair; an explicit selection must be valid. */
export function normalizeRapVoices(value: unknown): [RapVoiceType, RapVoiceType] {
  if (value === undefined) return ['male', 'female'];
  if (!Array.isArray(value) || value.length !== 2 || value.some(voice => voice !== 'male' && voice !== 'female')) {
    throw new Error('Select a voice for each performer');
  }
  return [value[0], value[1]];
}

/** Each position has a different dry rap performance, including same-gender pairs. */
export function rapVoiceReference(index: 0 | 1, type: RapVoiceType) {
  const descriptions = {
    male: ['adult masculine male voice, rounded and resonant', 'adult masculine male voice, crisp and lightly textured'],
    female: ['adult feminine female voice, clear and bright', 'adult feminine female voice, smooth and warm'],
  };
  return {
    url: `https://ai-rapvideo.co/audio/rap-voices/rap-v2/${type}-${index === 0 ? 'one' : 'two'}.mp3`,
    description: descriptions[type][index],
  };
}
