import { createFileRoute } from '@tanstack/react-router';
import { withCfDb } from '@/lib/with-request-db';
import { limitTrialIp, sameOriginMutation, trialErrorResponse } from '@/lib/video-visitor';
import { generateRapLyricsDraft, normalizeRapLyricsRequest, RapLyricsDraftError } from '@libs/ai/deepseek-rap-lyrics';
import { VideoTrialError, takeTrialRateSlot } from '@libs/ai/video-trial';

const MAX_REQUEST_BYTES = 2_048;
const headers = { 'Cache-Control': 'private, no-store' };

async function readRequest(request: Request): Promise<unknown> {
  const declared = request.headers.get('content-length');
  if (declared && (!/^\d+$/.test(declared) || Number(declared) > MAX_REQUEST_BYTES)) throw new RapLyricsDraftError('invalid_lyrics_request', 400);
  if (!request.body) throw new RapLyricsDraftError('invalid_lyrics_request', 400);
  const reader = request.body.getReader(); const decoder = new TextDecoder(); let bytes = 0; let text = '';
  try {
    while (true) {
      const { done, value } = await reader.read(); if (done) break;
      bytes += value.byteLength;
      if (bytes > MAX_REQUEST_BYTES) { await reader.cancel(); throw new RapLyricsDraftError('invalid_lyrics_request', 400); }
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
    return JSON.parse(text);
  } catch { throw new RapLyricsDraftError('invalid_lyrics_request', 400); }
  finally { reader.releaseLock(); }
}

export const Route = createFileRoute('/api/video-generate/lyrics')({
  server: {
    handlers: {
      POST: withCfDb(async ({ request }) => {
        try {
          if (!sameOriginMutation(request)) return Response.json({ error: 'invalid_origin' }, { status: 403, headers });
          const { auth } = await import('@libs/auth');
          const session = await auth.api.getSession({ headers: request.headers });
          if (!session?.user.id) return Response.json({ error: 'unauthorized' }, { status: 401, headers });
          const input = normalizeRapLyricsRequest(await readRequest(request));
          // Durable per-owner limits cover local/preview requests too; edge IP
          // limits additionally constrain repeated anonymous session creation.
          const minute = Math.floor(Date.now() / 60_000);
          await takeTrialRateSlot(`rap-lyrics:${session.user.id}:${minute}`, 10, new Date((minute + 1) * 60_000));
          await limitTrialIp(request, 'upload');
          const lyrics = await generateRapLyricsDraft(input);
          return Response.json({ success: true, data: { lyrics } }, { headers });
        } catch (error) {
          if (error instanceof VideoTrialError) return trialErrorResponse(error);
          const failure = error instanceof RapLyricsDraftError ? error : new RapLyricsDraftError('lyrics_service_unavailable', 503);
          return Response.json({ error: failure.code }, { status: failure.status, headers });
        }
      }),
    },
  },
});
