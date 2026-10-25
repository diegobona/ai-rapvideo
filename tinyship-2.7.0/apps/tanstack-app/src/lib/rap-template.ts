import type { VideoGenerationOptions } from '@libs/ai/types';
import { RAP_VIDEO_DURATION, RAP_VIDEO_MAX_TOPIC_LENGTH, RAP_VIDEO_RESOLUTION, RAP_VIDEO_SCENES, RAP_VIDEO_TEMPLATE, RAP_VIDEO_WORKFLOW_ID } from '../../../../config/rapVideo';
import { buildRapPrompt } from './rap-prompt';
import { normalizeRapLyricsDraft } from '@libs/ai/rap-lyrics-draft';
import { normalizeRapVoices, rapAudioReferencePlan } from '../../../../config/rapVoices';
import { normalizeRapEndingAction } from '../../../../config/rapEndings';

function imageUrl(value: unknown): string {
  if (typeof value !== 'string' || !value.trim()) throw new Error('Both performer photos are required');
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) throw new Error('Invalid performer photo');
  return url.href;
}

/** Whitelist the complete public contract before constructing server-owned options. */
export function createRapVideoOptions(input: Record<string, unknown>): VideoGenerationOptions {
  const allowed = ['rapTemplate', 'personOneImageUrl', 'personTwoImageUrl', 'scene', 'topic', 'lyrics', 'voices'];
  if (Object.keys(input).some(key => !allowed.includes(key)) || input.rapTemplate !== RAP_VIDEO_TEMPLATE) throw new Error('Invalid rap template');
  const scene = RAP_VIDEO_SCENES.find(item => item.id === input.scene);
  if (!scene) throw new Error('Invalid rap scene');
  if (input.topic !== undefined && (typeof input.topic !== 'string' || input.topic.length > RAP_VIDEO_MAX_TOPIC_LENGTH || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f<>]/.test(input.topic))) throw new Error('Invalid rap topic');
  const topic = typeof input.topic === 'string' ? input.topic.trim() : '';
  const rapLyrics = normalizeRapLyricsDraft(input.lyrics);
  // New submissions always use the shared ending; older saved tasks retain their original cues.
  rapLyrics.endingAction = normalizeRapEndingAction(rapLyrics.endingAction);
  const voices = normalizeRapVoices(input.voices);
  const rapReferencePlan = rapAudioReferencePlan(voices);
  const first = imageUrl(input.personOneImageUrl);
  const second = imageUrl(input.personTwoImageUrl);
  if (first === second) throw new Error('Upload a different photo for each person');
  return {
    provider: 'autodl', model: 'minimax-h3', workflowId: RAP_VIDEO_WORKFLOW_ID,
    prompt: buildRapPrompt(scene.id, topic, rapLyrics, voices),
    referenceImageUrls: [first, second, new URL(scene.referenceImage, 'https://ai-rapvideo.co').href],
    rapLyrics,
    referenceAudioUrls: rapReferencePlan.audios.map(audio => audio.url),
    rapReferencePlan,
    duration: RAP_VIDEO_DURATION, size: RAP_VIDEO_RESOLUTION,
  };
}
