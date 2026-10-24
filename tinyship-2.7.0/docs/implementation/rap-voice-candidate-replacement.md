# Fixed-speaker reference candidates

## Status

The owner reports that the original preview samples in the H3 v3 library sound too similar within each gender. All twelve local MP3 hashes differ, and catalog entries map to separate files; different files/seeds do not establish perceptually different speakers. H3 text-only synthesis supplied descriptions, not fixed speaker identities. No claim of independent listening verification is made.

The deployed library is unchanged. No new paid requests, final-video generations or automated tests were run for this preparation. The next step requires a separate MiniMax Speech API key; an AutoDL token must never be sent to MiniMax.

## Candidate generation

- `config/rapVoiceCandidates.json`: four distinct official system speaker IDs, two male and two female. Their names are candidate labels, not verified age or quality claims.
- `scripts/manual/generate-fixed-voice-candidates.py`: standalone asset creator, not part of the application runtime. Outputs stay in ignored `.tmp/fixed-voice-candidates`, outside the public directory.
- Set `MINIMAX_SPEECH_API_KEY` in `apps/tanstack-app/.dev.vars`. Select the official regional endpoint with `MINIMAX_SPEECH_BASE_URL`: `https://api.minimaxi.com` (China default) or `https://api.minimax.io` (international).
- Run `python scripts/manual/generate-fixed-voice-candidates.py --apply` from the repository root after configuring the key.
- Same English text, normal speed, unmodified pitch and no mixing/effects make voice comparison easier. These are spoken identity references, not proof of rap quality.
- Each request is recorded before submission. Completed identical requests are reused; unresolved requests stop rather than silently charging again. Do not remove an unresolved record without checking its outcome.
- Open the generated local `index.html` for owner listening. Only promote accepted candidates to production after checking differentiation and suitability. Extend to age groups after this first selection, not by asserting unverified ages for existing voices.

## Sources

- [Official fixed system voice list](https://platform.minimax.io/docs/faq/system-voice-id)
- [Official synchronous speech API](https://platform.minimax.io/docs/api-reference/speech-t2a-http)

Fixed speaker IDs make source selection explicit; they do not guarantee that H3 will preserve those identities in a final two-person video. That remains a separate owner acceptance step.
