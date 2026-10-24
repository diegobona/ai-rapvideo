# Compshare H3 video integration

> **Current fixed-scene default — October 20, 2026:** Published version `d77eba43-f446-4df0-b43b-ecb00c0c4978` supersedes the image-only default below. New Compshare orders edit the server-owned original video, using one dancer identity image plus a second image only when the princess is explicitly replaced. Scene upload is removed; cached/client scene fields are ignored and cannot select a location. Original scene/costumes/body/actions/lighting/camera requirements take precedence over expression notes. Only the playful expression tag is available for new drafts. Historical orders retain their saved media/prompts; the older adapters/scaffolds remain intact. See [Fixed original-video scene](./fixed-original-scene.md) for verification and model limitations. No paid visual retest was performed for this switch.

> **Current source status — October 20, 2026:** This note supersedes the motion-video defaults and historical deployment/test results below. With the creator's approval, newly compiled Compshare dance orders now use only three `reference_image` inputs, ordered dancer, princess, scene. The `imageReferenceGeneration` scaffold prioritizes those identities and the selected environment from opening to ending, using written shush/reaction/tiptoe choreography; approximate dance is accepted. Legacy environment configuration and client video overrides do not add a motion reference to new orders. The provider remains Compshare / `MiniMax-H3`; the generic adapter still supports video references, and previously paid orders retain their saved prompts and media.
>
> The revised prompt **with** video failed the real identity check. The image-priority real test instead retains the uploaded adult dancer through the clip and uses the selected lobby in its main shots, with no portrait-office ending. Opening straw elements and duplicate people remain model artifacts. The final wording removes named-film/default-scene cues from custom-scene generation and requests one instance of each person; this last tightening has no separate paid visual retest. Deployment status and limitations are recorded in [Dance identity and scene continuity](./dance-reference-continuity.md).

New dance orders select `compshare` / `MiniMax-H3`. The old AutoDL default is commented beside the new selection in `config/aiVideo.ts`; its adapter, configuration and task routing remain available. Existing orders use their saved provider and settings. To roll back new orders, select the retained AutoDL default and rebuild/deploy; do not rewrite saved orders.

## API and order behavior

Contract source: [official MiniMax H3 video API](https://www.compshare.cn/docs/minimax-h3/api/minimax-h3-video-api), checked October 20, 2026. Native HTTP adapter: `libs/ai/compshare-video.ts`.

- Bearer authentication against `https://cp.compshare.cn/minimax/v2`; create via `POST /video_generation`, poll via `GET /query/video_generation/{id}`.
- New orders request 10 seconds, native `768P`, with `16:9` or `9:16` selected by the existing orientation control. The price remains 499 USD cents and verified payment is required before submission.
- Three images retain their order: dancer, princess, scene. Explicit `reference_image` roles prevent the API's implicit first-frame mode. The fixed motion video uses `reference_video`.
- The server prompt translates `@ImageN` / `@VideoN` to the documented `<Picture N>` / `<Video N>` notation. The video defines movement and editing; images define the identities and scene. Custom descriptions and selected tags override default visual details without replacing the image identities.
- Freeze the reference video and all generation settings before checkout. The browser cannot override provider, model, full prompt, duration, price or motion-reference URL. A paid order submits with `Idempotency-Key: dance-{purchaseId}`.
- Existing atomic admission, persisted task ownership, background reconciliation and confirmed-failure refund behavior remain in place. No automatic provider fallback after an ambiguous submission.
- Queue/running states are processing; the live API also emits undocumented `moderating`, now treated as processing. Unknown states/transport failures remain retryable. Terminal `failed` / `cancelled` follow the existing full refund path.
- `use_context_ir=false`, `mute_audio=false`, `aigc_watermark=false`. Reference audio is removed before upload; generated sound may remain. No source song is supplied.
- Compshare's actual output host `compshare-files.cn-wlcb.ufileos.com` does not return `Access-Control-Allow-Origin`. The maker therefore uses the existing authenticated download proxy for both providers. The proxy permits only their exact output hosts/directories, preserves queries, refuses redirects and streams video bytes without buffering the full file.

## Local and production configuration

The user supplied `COMPSHARE_API_KEY` in ignored `apps/tanstack-app/.env.compshare.local`. It also contains the non-secret `COMPSHARE_REFERENCE_VIDEO_URL`. Neither credential values nor authenticated headers are recorded here. The server-only env file is uploaded with the built Worker and `--keep-vars` so existing AutoDL/Stripe/session configuration is retained. No D1 migration, Stripe price, binding or storage-retention change is needed.

For isolated browser tests, pass a dummy Compshare key alongside the existing Stripe fixtures. A still-running older preview without the new key reports generation unavailable; restart the isolated preview after switching providers.

## Fixed motion reference

User-selected source: [X post 2105601473878859850](https://x.com/itsjusttimbro/status/2105601473878859850). The original MP4 is approximately 21.525 seconds, 854×486. Use the first 15 seconds at the original playback speed, H.264 / 24 FPS, with no audio track. The configured object is:

`https://media.rumpelstiltskin-ai.co/references/rumpelstiltskin-v2/motion-x-2105601473878859850-silent-15s-v2.mp4`

Verified input: 15.000 seconds, 854×486, 1,955,214 bytes, SHA-256 `2ff125b0553d3d90b57bbd45beea8021eee251d4a16262eb9ab96c4ea9098f06`. The complete 21.5-second reference was rejected with `RetCode=220`, `ReferenceVideoDuration should be in [0, 15.08]`. That duration restriction is absent from the public API page; the normalized reference was accepted. The earlier full-length object is not selected by new orders.

## Verification

301 AI/payment tests pass. The 22 existing browser checks include the explicit Compshare proxy request and byte-identical download. Typecheck, Cloudflare build and deploy dry run pass. Tests exercise actual serialized provider payloads, landscape/portrait, three images plus video, frozen references, custom scene/text/tags, purchase idempotency, concurrent admission, confirmed failure/refund and historical AutoDL orders. Regressions reproduced the undocumented `moderating` state and missing Compshare download support before their respective fixes.

The bounded real integration test uses a public fictional costume reference, the included princess and scene, and the supplied motion clip. It creates no Stripe charge. Exactly one accepted job, `01a15886-2779-7a36-8a1c-ed0c90ed0930`, succeeded; retries resume its stored task ID instead of submitting a second job. Long-reference rejection evidence is retained separately.

The output is 1344×768, H.264 / 24 FPS, 10.125 seconds, with AAC audio, 4,341,091 bytes. The API reports 10 billable seconds; the balance endpoint reserved 100 points. Generation took approximately nine minutes in this run. The downloaded file is `artifacts/private/compshare-h3-live-test.mp4`; metadata/contact sheet are `test-results/compshare-live-video-metadata.json` and `compshare-live-contact.png`.

Visual limitation: the generated clip strongly retains the motion video's stylized childlike dancer appearance, despite the prompt assigning identity to the supplied adult costume still. That still has a heavily pixelated face. This verifies reference-media submission and successful generation, not reliable personal likeness or perfect separation of motion from identity. Do not represent this sample as proof of an exact user-face replacement. A stronger input portrait and further reference/prompt tuning are needed to assess likeness. This limitation was reported to the user.

## Explicit performer mapping correction — October 20

The earlier suggestion that a separate Recast API was required was premature. The same Compshare API supports prompt-defined identity/motion relationships. Its [reference-media instructions](https://www.compshare.cn/docs/minimax-h3/api/minimax-h3-video-api) explicitly describe assigning appearance to pictures and motion to a video. The linked [upstream full-reference prompt guide](https://github.com/MiniMax-AI/MiniMax-H3/blob/d21241f0a4b3acbb34c97dae47fa417b7065e438/skills/h3-prompt-writing/references/ref-en.txt) distinguishes reusable subjects from source assets and describes video-editing/reference relationships. None of these are new API fields.

The hidden motion-reference template now explicitly replaces the active male performer with image one and the seated watching woman with image two in every shot, including close-ups, reaction views and feet. Source face, age, hair, body proportions and costume are excluded from the transferred performance. Separate subject definitions, replacement mapping, retention rules and visible face establishment make the intended result concrete. The adapter translates internal `@SubjectN` notation to documented `<Subject N>` labels alongside pictures/videos. Scene/description/tags retain their existing priority; facial identities stay assigned to their pictures. Image-only and historical saved-order prompts remain unchanged.

`use_context_ir=false` remains valid and unchanged. The public API's `true` example enables optional prompt rewriting, not a required reference/identity switch. There is no documented face-strength parameter to invent.

A second bounded real experiment used the same API, resolution, 15-second motion asset, three-image roles and Context-IR setting, with a clear fictional adult reference (`/images/dance/example-barn.png`) and an explicit replacement prompt. Job `01a158a9-c722-760b-a52a-18c3ffaa63bf` produced a 5-second result. Visual inspection confirms that the source's childlike black-suited performer becomes the curly-haired adult in the reference's green coat and brown outfit, including the close-up and footwork shots. This is a successful identity/appearance replacement example, not a guarantee for arbitrary photos or every scene. Both prompt and input quality changed, so their individual contributions have not been isolated by an A/B test.

The experimental prompt is a shorter five-second prototype of the same mapping approach, not the exact production ten-second template. No Stripe charge or user portrait was used. Evidence: `test-results/compshare-identity-generation.json`, `compshare-identity-prompt.txt`, `compshare-identity-contact.png`, `compshare-identity-metadata.json`; result `artifacts/private/compshare-h3-identity-test.mp4`.

The prototype output is 1344×768, H.264 / 24 FPS with AAC audio, 5.175 seconds, 3,368,975 bytes. Balance decreased from 905 to 855 points, with no reservation remaining. Production version `c576c9e2-1a1a-471b-99ae-30a2a662d54f` uses the generic ten-second template for new orders. All 304 AI/payment unit tests, 22 related browser checks, typecheck/build and deploy dry run pass. The tests verify explicit mappings in actual serialized paid requests, correct subject-label conversion and prompt-limit compatibility with maximum customization.

Live checks after this deployment pass: real result playback and authenticated browser download (3,368,975 bytes, byte-identical to the provider file), no page errors, and scene/portrait checkout with external mutations mocked at desktop/768/390/320px. The result order is a browser fixture; no additional model job or Stripe charge is created by these checks. The new hidden prompt string is absent from client build files. Evidence: `test-results/compshare-identity-result-browser.json`, `compshare-identity-production-smoke.json`.

Published Worker: `93426cc6-7a33-4399-bd78-c9006b38c3de`. Live browser checks on the published site confirmed actual decoded playback and a 4,341,091-byte download identical by SHA-256 to the provider file through the authenticated proxy. The result order was a browser fixture, while authentication, media playback and download requests were real. No additional provider job or payment was created. Desktop/mobile scene checkout checks mocked upload and Stripe mutations; all layouts fit with no page errors. Evidence: `test-results/compshare-live-result-browser.json`, `compshare-production-smoke.json` and `compshare-deploy.log`. Final balance fell from 1,005 to 905 points with no reservation remaining, confirming 100 points consumed.
