# Fixed original-video scene — 2026-10-20

## Current behavior

The previous deployment only strengthened facial-expression instructions and left scene upload active. The user explicitly requested the original scene be fixed in the UI and new provider requests. This update replaces the three-image remake as the new Compshare default.

- Remove scene upload, preview, change/reset controls, scene state, blob URLs, upload calls and checkout fields from the shared maker used on all three public generator routes. Recovered historical scene URLs are neither displayed nor fetched nor resubmitted for new purchases.
- New paid requests use the server-selected original video and the dancer identity photo. An optional uploaded princess photo adds a second identity reference; otherwise the original source princess is retained, with no default princess image in the provider payload. There is no scene image in new requests.
- The existing server-only `COMPSHARE_REFERENCE_VIDEO_URL` supplies the original clip. Its fallback is the existing normalized silent 15-second R2 object identified by `DANCE_SOURCE_VIDEO_KEY`. Client video/scene overrides cannot select the source. The chosen source and full prompt are frozen in the draft before Stripe checkout.
- Obsolete `sceneImageUrl` from older clients is ignored before validation and never fetched. Changing that obsolete field does not create a different paid draft.
- The description is now presented as optional facial-expression notes. Only the playful expression tag remains available for new drafts. New compilation and checkout serialization filter old camera/film-grain tags, while legacy parsing retains all supported historical tags.

## Hidden prompt

`buildFixedSceneDancePrompt` requests an edited version of the source. It assigns uploaded photos to facial identity only and keeps the source setting, props, costumes, bodies, body proportions, choreography, source expression timing, light and shot sequence. Identity is assigned from the first through final frame. Source blinks, eyebrows, gaze, lips/jaw movement, head orientation, lighting/shadows and finger-to-lips occlusion remain dynamic; pasted static faces and identity morphs are excluded.

Scene/costume/body/camera requirements have priority over all creator text. Expression notes apply only within facial-expression scope, and only to the edited characters. A default source princess is not changed by a dancer's expression tag. The source's first ten seconds are requested at normal speed to fit the existing ten-second product. Portrait selection may require crop/framing adaptation; it must not request another location or new scenery. This is not a promise of pixel-identical background preservation or guaranteed natural face replacement: those remain model-output properties and are not enforced by a dedicated API mask/lock.

## Compatibility and verification

Provider, price, Stripe admission/refunds, input retention and output orientation remain intact. Historical paid purchases still submit their own saved prompts/references and recover/download their existing tasks; no database rewrite or migration is needed. The AutoDL adapter and historical prompt builders are retained.

Red regressions reproduced the exposed scene controls, scene in new checkout payloads, scene-dependent drafts and old three-image provider request. After implementation, all 311 AI/payment tests pass, including real serializers for both orientations with one/two identity images plus source video; stale scene bypass/draft equivalence; dynamic identity/expression instructions; old saved orders and failure/refund recovery. Typecheck, Cloudflare build and dry run pass. The fixed source's public HEAD returns 200, video/mp4, 1,955,214 bytes, matching the previously verified normalized clip.

Published Worker `d77eba43-f446-4df0-b43b-ecb00c0c4978` preserving remote secrets/vars/bindings. Four live browser regressions pass with external mutations mocked: fresh two-character checkout with no scene; historical scene absent and unfetched; checkout return/refresh retains character/expression data but drops stale scene/camera tags for a new checkout; expression controls clear and lock during recovery. Desktop1440/mobile390 screenshots confirm no scene upload/change/restore/preview, two character inputs and no overflow. Read-only HTTP checks pass on all three public maker routes. Evidence: `test-results/fixed-scene-{unit,typecheck,build,dryrun,deploy,browser}.log`, `fixed-scene-live.json`, `fixed-scene-live-ui.json`, `fixed-scene-maker-desktop.png`, `fixed-scene-maker-mobile.png`. No paid generation or Stripe charge was submitted for this UI/request update; facial realism/background fidelity have not been newly visually tested.
