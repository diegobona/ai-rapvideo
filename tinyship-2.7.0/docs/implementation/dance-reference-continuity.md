# Dance identity and scene continuity — 2026-10-20

**Latest deployed approach:** The user subsequently required the original scene to be fixed. Worker `d77eba43-f446-4df0-b43b-ecb00c0c4978` removes scene upload and switches new orders to editing the server-owned source video with one/two identity images. The image-only and expression-only updates below are historical stages. See [Fixed original-video scene](./fixed-original-scene.md) for current behavior and verification; no paid quality test accompanied this switch.

## Observed production failure

The latest completed portrait dance used all three saved references in the correct order: dancer, princess, uploaded scene. The provider request used explicit `reference_image` and `reference_video` roles, with no `first_frame` or `last_frame`. Uploading, checkout persistence and serialization did not drop the scene.

Visual inspection of the ten-second result confirmed the reported defect: the source dancer and barn remained at the beginning, the uploaded face appeared midway, the uploaded location was ignored, and the ending reproduced the dancer portrait's office background. Some creator adjustments, including the princess's pink dress and flower, did appear. Provider success was therefore not evidence of correct identity or scene adherence.

Private input/output files and contact sheets are kept under ignored `artifacts/private/` and `test-results/`. They must not be checked in or published as public examples.

## First attempt: corrected prompt with video reference

The first attempt revised the motion-reference branch of `apps/tanstack-app/src/lib/dance-prompt.ts`. The legacy image-only preset remains unchanged.

- Request a new video under `[reference generation]`, replacing the ambiguous instruction to produce an edited version of the source video. This is prompt wording, not a new API parameter or guaranteed motion-isolation mode.
- Establish image one's dancer and image two's princess before the opening action; retain each identity and natural body proportions through the final frame and all cuts.
- Make image three the sole environment reference for every shot. Explicitly ignore the identity portraits' backgrounds, poses and framing.
- Limit the source video's requested contribution to choreography, gestures, footwork, timing and shot rhythm. Exclude its cast, body proportions, costumes and location.
- End on the same dancer moving in the same environment. Exclude gradual replacement, face morphs, portrait inserts, freeze-frames and photo end-cards.
- Preserve creator description/tag injection, description-over-tag priority, scene selection and legacy customization extraction. The submitted references, provider, price and paid-order state machine are unchanged.

The [official Compshare API documentation](https://www.compshare.cn/docs/minimax-h3/api/minimax-h3-video-api) supports image/video references and their prompt-defined relationships, but reference video includes its visual content. The [upstream prompt guide](https://github.com/MiniMax-AI/MiniMax-H3/blob/d21241f0a4b3acbb34c97dae47fa417b7065e438/skills/h3-prompt-writing/references/ref-en.txt) distinguishes direct source editing from reference generation. It also supports subject notation; removing the previous subject wrappers simplifies this template and does not correct an unsupported API syntax.

## First-attempt verification

Before implementation, focused tests reproduced six failures against the old prompt. After implementation, all 306 AI/payment tests passed, including saved paid-order serialization for both orientations, three images plus the frozen video, scene/text/tag retention, identity/scene continuity instructions, legacy extraction, idempotency and refund behavior. Typecheck, Cloudflare build and deploy dry run passed. The new hidden prompt is absent from client JavaScript. Two live browser checks with mocked mutations passed: scene/portrait/description/tags reach checkout together, and checkout return/refresh retain creator inputs through prolonged processing.

One bounded real-provider retest used the same three images, source clip, portrait ratio, creator description and tags as the affected output, changing only the hidden prompt. Its persisted task ID and payload fingerprint prevent repeat submissions. It created no Stripe charge and did not mutate or re-submit the customer's completed purchase.

The test task `01a15982-2c0a-795a-a29b-83b07988c871` succeeded after approximately eight minutes. The file is 4,477,166 bytes, 768×1344, H.264/AAC, 10.125 seconds. Sampled frames are in ignored `test-results/prompt-consistency-v3-contact.png`, with separate opening and ending frames. The result fails the identity acceptance criterion: the source dancer remains throughout. The selected location appears in most sampled frames, but one source-like close-up still retains the barn. The portrait-photo ending is absent. Creator pink dress/flower adjustments remain visible.

This is partial scene/ending improvement, not a reliable face replacement. This video-reference approach was not deployed. Unit assertions establish request intent and regression coverage, not likeness or scene fidelity. No additional video-reference prompt variants were submitted.

## Approved approach: prioritize image identities and scene

The user explicitly selected image identity/scene priority with approximate dance movement, retaining the same Compshare API. `createDanceVideoOptions` now constructs new orders with only the three reference images, even when `COMPSHARE_REFERENCE_VIDEO_URL` is configured or the browser supplies video overrides. This is server-owned behavior. The old adapter, source media and historical saved orders remain intact.

New Compshare orders use an internal `imageReferenceGeneration` scaffold even without optional customization. It retains the identity/scene and moving-ending constraints above, replacing the video reference with written choreography: shush, princess reaction, measured bent-knee tiptoe side steps and shoulder bounce, readable footwork, same dancer still moving at the finish. Visible identifying accessories and proportional full-body reconstruction are included. There is no video/subject label in the submitted prompt and no video in the submitted content array. Creator description, styles, orientation, price, refunds and input retention remain intact.

Focused tests first reproduced nine failures before implementation. The image-priority real test used the original three images and creator settings, changing only the approved generation approach. Task `01a15991-290d-7b94-b358-2b19975720f2` succeeded after approximately eleven minutes. It created no Stripe charge or purchase mutation. The downloaded `artifacts/private/image-priority.mp4` is 6,741,569 bytes, 768×1344, H.264/AAC, 10.125 seconds. Contact sheet and separate opening/ending frames are in ignored `test-results/image-priority-*.png`.

Visual inspection confirms the uploaded adult dancer, glasses and navy clothing from opening through ending, the uploaded lobby in the main shots, the requested princess outfit/flower, moving footage at the end, and no portrait-office end frame. Remaining artifacts are real: opening shots add a straw structure in front of the lobby, and some shots include a duplicate/partial extra dancer at the side. This is a substantial identity/scene improvement over the video-reference result, not perfect visual adherence.

The final template consequently removes the named film character from the new image-only prompt, removes default barn/straw wording and fantasy-film styling from custom-scene requests, uses the scene image's lighting/materials/color palette, and explicitly requests one instance of each person. Four regression failures reproduced the unwanted defaults before this tightening. All 310 AI/payment tests now pass, including the actual three-image-only new-order serializer, custom-scene default exclusions and a historical paid order retaining its frozen video/prompt after configuration changes. Typecheck and build pass. This last wording refinement was not followed by another paid generation; it must not be described as visually proven to eliminate the remaining artifacts. Generic video-reference support and the legacy preset remain available.

Published final image-priority template as Worker version `547c832c-6858-492c-a91e-5eed94ef582d`, preserving remote variables/secrets and bindings with `--keep-vars`. The final dry run and deployment succeeded. Live homepage returns 200 with the expected title, one H1, generator and $4.99 price; hidden choreography is absent from its HTML. No database or storage migration was needed, and the customer's original completed purchase remains intact. Evidence: `test-results/image-priority-{unit,typecheck,build,dryrun,deploy}.log` and `test-results/image-priority-live.json`.

## Dynamic facial performance requirements — 2026-10-20

The user requested explicit prompt instructions to avoid a rigid pasted face after discussing the proposed fixed-source-scene approach. This change strengthens facial animation in the existing active image-generation scaffold and retained video-reference scaffold. It does not activate a new source-video editing workflow or remove scene controls; the fixed-original-scene route has only been evaluated so far.

The new `DYNAMIC FACIAL PERFORMANCE` block separates stable photographic identity from changing expression. It requests natural blinks, gaze, eyebrows, cheeks, lips and jaw; a sly shush expression, an animated princess reaction and a changing dance grin; head rotation/perspective, scene lighting/shadows and finger-to-lips occlusion; and aligned glasses. Static pasted faces, frozen photo expressions, rigid masks and sliding face textures are excluded. In the retained video branch only, facial expression changes and their timing come from the supplied video while image-defined identity stays stable. The active three-image branch derives expression beats from the written performance. The video branch's exclusion now names facial identity rather than broadly excluding faces, avoiding a conflict with expression transfer.

Focused tests reproduced four failures before implementation. All 313 AI/payment tests now pass. Both orientations' actual paid serializer contains the animation block; both prompt branches fit the provider limit with maximum customization; current media roles, text/tag priority and historical frozen-order behavior pass. Typecheck, build, dry run and deployment pass. Published Worker version `9179d418-a76a-47e8-b4c8-054ec05f7e26`, preserving remote configuration with `--keep-vars`. The new block is absent from client JavaScript; the live homepage returns 200 with the generator, $4.99 price and hidden prompt absent from HTML. No paid generation or new visual-quality claim was made for this prompt update. Evidence: `test-results/facial-performance-{unit,typecheck,build,dryrun,deploy}.log` and `test-results/facial-performance-live.json`.
