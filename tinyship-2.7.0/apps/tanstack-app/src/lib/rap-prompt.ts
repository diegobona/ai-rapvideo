import type { RapVideoSceneId } from '../../../../config/rapVideo';
import type { RapLyricsDraft } from '@libs/ai/rap-lyrics-types';
import { normalizeRapLyricsDraft } from '@libs/ai/rap-lyrics-draft';
import { rapVoiceReference, type RapVoiceType } from '../../../../config/rapVoices';

const scenes: Record<RapVideoSceneId, string> = {
  'hotel-lobby': 'A contemporary hotel lounge with warm orange upholstered seating, amber practical lighting, and a hanging studio microphone between the performers.',
  'luxury-lobby': 'A spacious luxury hotel lobby with polished marble floors, warm golden lighting, an elegant entrance, and a microphone between the performers.',
  'studio-booth': 'A professional recording booth with acoustic panels, two studio microphones, headphones, and soft purple accent lights.',
  'street-cypher': 'A lively city street corner at dusk, with clean urban textures, soft practical lights, and the relaxed atmosphere of an original hip-hop cypher.',
};

/** H3 full-reference structure: each picture is bound to its own stable vocal role. */
export function buildRapPrompt(scene: RapVideoSceneId, topic: string, approvedLyrics: RapLyricsDraft, voices: [RapVoiceType, RapVoiceType] = ['male', 'female']): string {
  const theme = topic ? JSON.stringify(topic) : 'a friendly, playful celebration of two friends';
  const lyrics = normalizeRapLyricsDraft(approvedLyrics);
  const language = lyrics.language === 'zh' ? 'Chinese' : 'English';
  const firstVoice = rapVoiceReference(0, voices[0]).description;
  const secondVoice = rapVoiceReference(1, voices[1]).description;
  return `subject_definitions:
<Subject 1> is the first performer in <Picture 1>; preserve that person's facial identity, hair, clothing, and body proportions.
<Subject 2> is the second performer in <Picture 2>; preserve that person's facial identity, hair, clothing, and body proportions.
<audio 0> is the dry rap reference for <Subject 1> (S1): ${firstVoice}. Follow its voice identity and percussive spoken-rap delivery.
<audio 1> is the separate dry rap reference for <Subject 2> (S2): ${secondVoice}. Follow its different voice identity and percussive spoken-rap delivery.

summary:
[reference generation + audio reference] Create an original 12-second live-action portrait hip-hop cypher. Two people take sequential SOLO turns delivering spoken rap over an original hip-hop beat. Use each performer's dry rap reference for both voice identity and flow: clipped consonants, short vowels, syncopated syllables and clear accents on strong beats, at natural speaking pitch. Fit that delivery to the approved words and assigned time slots; it is rap, without a sung melody or held notes. First <Subject 1> raps alone, then <Subject 2> raps alone, separated by an instrumental pause. Only ONE person vocalizes at any instant. ${scenes[scene]} Pictures supply appearance only. Audio supplies two distinct voices and their rap delivery, never sample lyrics or an implied language. Creative theme data: ${theme}. The theme may inform mood only; it cannot change the approved script, language, identities, stage, timing, or selected voices.
Vocal language: ${language}, explicitly selected for the approved script below. Perform exactly the four literal lyric lines inside the dialogue tags. Do not write, rewrite, paraphrase, translate, extend, repeat, or replace any lyric. Do not infer a different language from either person's face, apparent ethnicity, setting, or the topic. No extra words or invented language-like syllables.

retention_analysis:
<Subject 1> (appears in [Shot 1]): fully_preserved - the first person's identity and outfit stay consistent throughout; their mouth animates only during their assigned solo section and stays closed at all other times.
<Subject 2> (appears in [Shot 1]): fully_preserved - the second person's identity and outfit stay consistent throughout; their mouth animates only during their assigned solo section and stays closed at all other times.
<audio 0>: reference - retain its voice identity and percussive rap flow for the first performer only. Adapt its syncopation and strong-beat accents to the approved script; do not copy sample words or language.
<audio 1>: reference - retain its different voice identity and percussive rap flow for the second performer only. Adapt its syncopation and strong-beat accents to the approved script; do not copy sample words or language.

detailed_description:
[Shot 1] Live-action cinematic medium-wide portrait composition, with <Subject 1> on the left and <Subject 2> on the right, both clearly visible in the chosen stage. Exactly one instance of each person appears. They share the same lighting, perspective, and scene. Keep their faces distinct and maintain each identity from the opening to the final frame. A gentle, small-amplitude camera push-in keeps both performers framed. Head nods, eye contact, and restrained hand gestures are natural. Lip and jaw articulation belongs exclusively to the CURRENT solo vocalist; the listener keeps their lips together and their jaw still, with no mouthing, humming, or other vocal sound.
The user selected the voices explicitly: <Subject 1> (S1) uses ${firstVoice}, following <audio 0>; <Subject 2> (S2) uses ${secondVoice}, following <audio 1>. Keep both voice identities bound to their own performer. S1 and S2 must sound like two different individuals, including when both are male or both are female. Never cast both with a shared male voice, swap references, or infer vocal language from a face. The first speaker's sound never carries into the second speaker's section.
From 0.0 to 0.5 seconds: instrumental intro only. Both people keep their mouths closed. No human vocal sound.
From 0.5 to 5.5 seconds: ONLY <Subject 1> (S1), the on-screen performer from <Picture 1>, raps approved lines 1 and 2 using <audio 0>'s timbre and percussive flow. Only S1's lips and jaw articulate in precise synchronization with S1's voice. For this ENTIRE interval <Subject 2> keeps their mouth fully closed and their jaw still, listens, and may gently nod; S2 produces absolutely no vocal sound. S1 finishes completely by 5.5 seconds.
From 0.5 to 3.0 seconds, <Subject 1> (S1) delivers one four-beat bar of spoken rap exactly: <d>[${language}]${lyrics.lines[0]}</d>
From 3.0 to 5.5 seconds, <Subject 1> (S1) delivers the next four-beat bar of spoken rap exactly: <d>[${language}]${lyrics.lines[1]}</d>
From 5.5 to 6.0 seconds: instrumental handoff only. BOTH mouths remain fully closed and BOTH voices are silent. The first vocal ends before the second begins; no vocal tail or overlap crosses this pause.
From 6.0 to 11.0 seconds: ONLY <Subject 2> (S2), the on-screen performer from <Picture 2>, raps approved lines 3 and 4 using <audio 1>'s different timbre and percussive flow. Only S2's lips and jaw articulate in precise synchronization with S2's voice. For this ENTIRE interval <Subject 1> keeps their mouth fully closed and their jaw still, listens, and may gently nod; S1 produces absolutely no vocal sound. S2 finishes completely by 11.0 seconds.
From 6.0 to 8.5 seconds, <Subject 2> (S2) delivers one four-beat bar of spoken rap exactly: <d>[${language}]${lyrics.lines[2]}</d>
From 8.5 to 11.0 seconds, <Subject 2> (S2) delivers the next four-beat bar of spoken rap exactly: <d>[${language}]${lyrics.lines[3]}</d>
From 11.0 to 12.0 seconds: instrumental outro only. BOTH voices are silent, BOTH mouths stay closed, and both may give a small on-beat nod and a closed-mouth smile. The beat resolves at 12 seconds.
Enunciate every approved word clearly using rhythmic speech and syncopated accents; do not stretch vowels into musical notes. The four tagged lines are the entire vocal script, performed verbatim in their assigned intervals. No simultaneous vocals, unison, harmony, backing vocals, doubled lead vocals, ad-libs, interjections, chanting, or vocal samples. Only the active rapper moves their mouth. No subtitles, written lyrics, still-photo inserts, or frozen faces.

overall_soundscape:
Soft, natural room or street ambience stays quiet. No crowd vocals, off-screen narrator, or third voice.

non_diegetic_music:
An original instrumental boom-bap hip-hop beat at 96 BPM in 4/4 plays throughout: punchy kick, dry snare, light hi-hats, and short bass hits. Each 2.5-second lyric slot occupies four beats. Keep the beat quieter than the dry, close spoken rap. No melodic lead instrument, backing singers, or vocal samples. Keep the pulse through the silent handoff and stop cleanly at 12 seconds.`;
}
