import { PaidVideoError } from '@libs/ai/paid-video';

export const rapCreditHeaders = { 'Cache-Control': 'private, no-store' };
export function rapCreditErrorResponse(error: unknown) {
  return Response.json({ error: error instanceof PaidVideoError ? error.code : 'payment_service_unavailable' },
    { status: error instanceof PaidVideoError ? error.status : 503, headers: rapCreditHeaders });
}

export async function readSmallRapJson(request: Request, maximum = 4096): Promise<Record<string, unknown>> {
  if (Number(request.headers.get('content-length') || 0) > maximum || !request.body) throw new PaidVideoError('invalid_request', 400);
  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let text = ''; let bytes = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > maximum) { await reader.cancel(); throw new Error('Too large'); }
      text += decoder.decode(value, { stream: true });
    }
    const value = JSON.parse(text + decoder.decode());
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid JSON object');
    return value;
  } catch { throw new PaidVideoError('invalid_request', 400); }
  finally { reader.releaseLock(); }
}
