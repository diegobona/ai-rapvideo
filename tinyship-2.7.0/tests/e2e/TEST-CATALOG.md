# E2E 测试流程目录

## Editable lyrics before rap video (2026-10-24)

Acceptance: the first action generates exactly four short lyrics through the server-only DeepSeek API, with English selected by default and Chinese only explicitly selected. Visitors can edit both lines for each person before a separate video-generation action; generating/regenerating lyrics never uploads photos or creates a video. The submitted script is embedded verbatim in H3 lyric tags, frozen with its task, and restored after refresh. Beneath the finished video, show that submitted script with approximate highlighting from the planned line intervals; pause, seeking and replay update the highlight, and editing the next draft never rewrites the existing video's script. Verify failed lyric requests, safe retry, missing-key behavior, input limits, anonymous sessions, task ownership and preservation of existing video/download recovery. No new pages, sitemap changes, payment or login requirements.

Verified: 171 related unit tests, 15 browser tests, type checking, build and deployment passed. Live production lyric drafting returned four English lines, with no video submission or photo upload. Highlighting uses approximate planned intervals; H3 singing fidelity is not certified by these checks.

## Restore $4.99 checkout, concise maker and 24-hour media retention (2026-10-20)

Acceptance: new videos require a verified $4.99 USD Stripe payment again; block direct free submissions. Clear current free-access copy from all public makers, pricing FAQ and guides. Remove the screenshot-marked expression hint, idle result status and fidelity filler, while preserving progress/errors and the full-refund guarantee. Show concise Cloudflare storage and 24-hour automatic deletion text near the form and a download-before-expiry reminder. Store newly completed AutoDL/Compshare video outputs in the site's R2 bucket and configure scoped 24-hour lifecycle rules for uploads/ and generated-videos/, never references/ or site assets. Preserve provider/model/result ownership, retry transient storage failures without generating another video, and keep historical jobs/refunds recoverable. Reject expired managed media at application access paths. Verify paid dialog/checkout without charge, no free bypass, actual lifecycle configuration, R2 copy idempotency and live responsive UI; no real video generation or customer payment is needed.

Verified October21: 377 AI/payment tests, typecheck, production build, dry run and deployment pass. Published Worker `51474d3d-722c-4eeb-9939-2106432d3c64`. Five live browser fixtures pass: responsive price/privacy/refund/gallery, paid modal, checkout without generation, fixed scene/customization payload and paid completion/download/repeat. All three maker routes and guide return200 with no current free claims; the three marked helper texts and redundant example links are absent. Actual R2 rule readback confirms both one-day prefix rules and preservation of the existing multipart rule. R2 physical deletion is asynchronous after expiry; public copy accurately says it is scheduled after24h. Evidence: `docs/implementation/paid-media-retention.md`, `test-results/paid-retention-*.log`, `media-retention-lifecycle-live.log` and `media-privacy-{desktop,mobile}.png`. No real payment or video generation was submitted.

## Prominent generation-failure refund promise and simpler examples (2026-10-20)

Acceptance: show a clearly visible, high-contrast refund guarantee directly below Generate video on all three public makers: full refund if video generation fails. Keep the temporary payment switch and existing generation/refund behavior unchanged. Remove the redundant Open video links from the three example captions while retaining native video playback, titles and unavailable-video feedback. Verify the live guarantee, caption links, three native players and mobile layout; no real generation or payment is required.

Verified: TanStack typecheck, production build, deployment dry run, two maker SSR checks and two live gallery/browser checks pass. All three public makers return200 with the guarantee and zero redundant example-caption links. Worker `f229c0c4-21a7-4711-8e9a-6d130a8a7287` is published. Desktop/mobile screenshots: `test-results/refund-guarantee-{desktop,mobile}.png`; logs: `test-results/refund-ui-{typecheck,build,dry-run,deploy,browser}.log`. Payment remains temporarily disabled; no generation or payment was submitted.

## Temporary direct generation without payment (2026-10-20)

Acceptance: `VIDEO_PAYMENT_REQUIRED=false` temporarily permits direct template generation with no Stripe dialog, checkout, purchase row or credit deduction. Preserve payment code for restoration and historical paid recovery/refunds/downloads. Block stale clients from creating a new checkout while the switch is off. Permit repeat generation after success or terminal failure, with one atomic active run per user/browser. Keep uploaded photo URLs, expression notes, tags and orientation through direct submission and same-tab refresh. Reject unauthorized images and client provider/workflow/prompt/output overrides. Hide unpaid pending and terminal paid orders from the current temporary admission lookup while recovering actual paid work and pending refunds. Public maker/tool/tutorial instructions describe current direct generation; hide the tutorial payment screenshot while free.

Coverage: six temporary admission tests, fifteen direct HTTP tests, direct client/session/SSR tests, retained paid contracts with the payment flag explicitly true, and live browser fixtures for repeat success, terminal failure retry, refresh/input retention, fixed scene and historical paid recovery. Browser tests mock model/payment mutations; no charge or real video submission.

Verified: 344 AI/payment unit tests, typecheck, Cloudflare build, dry run and deployment pass. Published Worker `16f6e8c6-ef0d-4631-86b1-5bc5ec1cacdd`. Live browser suite: 21 pass, two payment-creation scenarios intentionally skipped while disabled. Live public maker/tutorial GETs and generation lookup return200. See `docs/implementation/autodl-image-temporary-free.md` and `test-results/autodl-free-*.log`. Actual output fidelity and step cadence require checking a newly generated video; request/flow tests do not prove visual quality.

## AutoDL image-only workflow with fixed scene and deliberate dance timing (2026-10-20)

Acceptance: new generations use AutoDL `minimax_h3_zm_u24`, frozen with the full hidden prompt. Supply only three ordered images: dancer, custom or included princess, and the server-fixed scene. Ignore client scene, workflow and video overrides, and keep scene upload absent. Generate fresh footage without video-edit or source-actor replacement instructions. Preserve stable identities and animated facial performance with no photo inserts or ending still. Five-shot timing: shush 0–1.8 seconds, reaction 1.8–3, measured tiptoe 3–6.5, footwork 6.5–8.2 and finish 8.2–10. Request four to six total deliberate steps over the final seven seconds, one settled weight transfer every 1.2–1.5 seconds; exclude fast/jittery shuffling, time-lapse, speed ramps and jumps. Notes/playful styling affect expression only, without changing fixed scene, clothes, camera or tempo. Preserve ten seconds and landscape/portrait resolutions. The original $4.99 paid mode remains recoverable behind the temporary switch above. Later environment changes cannot redirect frozen options. Historical saved AutoDL/Compshare jobs retain their provider, prompt and references.

Status: backend regression tests use simulated Stripe/provider traffic and the existing documented AutoDL image fields; no real submission or charge. Actual workflow-schema verification is tracked separately. Browser acceptance preserves the fixed-scene maker controls. Generated-output acceptance must assess deliberate pace, stable identities and animated facial performance after rollout.

## Fixed original-video scene and identity-only photos (2026-10-20)

Acceptance: new Compshare orders edit the server-owned original video. Use its configured URL or the known original media key beneath the public storage URL when configuration is absent. Include the uploaded dancer as image one and a custom princess as image two only when supplied; otherwise retain the original princess. The source video fixes bodies, costumes, original scene, choreography, shot timing, camera and lighting. Photos supply facial identity only, with natural source expression timing, blinks, eyebrow/lip/jaw/gaze movement and correct head-angle/light/finger occlusion; exclude pasted static faces. Stale client scenes and arbitrary client source overrides must not change generation options or draft identity. Remove scene upload from the maker. Restrict new customization to facial expression; accept playful and discard camera/film-grain tags after validating known legacy IDs. Preserve ten seconds, 768P, both ratios, $4.99, payment admission, idempotency, refunds and creator-input recovery. Freeze the complete prompt/source in the purchase and preserve historical saved orders and general prompt builders.

Verified: 311 AI/payment tests, typecheck, build and dry run pass. Published Worker `d77eba43-f446-4df0-b43b-ecb00c0c4978`. Four live browser checks pass: fresh fixed-scene checkout with exactly two character uploads; stale historical scene neither displayed nor requested; checkout return/refresh never reuses old scene/camera tags; expression controls clear and lock correctly. Desktop1440/mobile390 screenshots show no scene controls or horizontal overflow. All three public maker routes return200 with two photo inputs and fixed-scene hint. Backend regressions capture both paid-payload orientations with optional princess/source freezing, stale-scene draft equivalence, expression constraints and historical saved jobs. Stripe/provider mutations are mocked; no generation or charge. Actual natural identity replacement remains a model-output acceptance check, not established by these tests. Evidence: `test-results/fixed-scene-{unit,typecheck,build,dryrun,deploy,browser}.log`, `fixed-scene-live.json`, `fixed-scene-live-ui.json`, `fixed-scene-maker-{desktop,mobile}.png` and `docs/implementation/fixed-original-scene.md`.

## Dynamic facial performance with stable uploaded identities (2026-10-20)

Acceptance: strengthen only the hidden prompt for the active three-image scaffold and retained video-reference scaffold. Explicitly separate photo identity from the still photo's expression: faces must blink and move eyebrows, lips, jaw and gaze naturally. Describe lively facial beats for the sly shush, princess reaction and delighted dance, while preserving creator expression/style priority. Facial geometry and shading follow head angle and scene light; finger/lip occlusion remains correct during the shush. Exclude a pasted static face or frozen expression. In the retained video scaffold, transfer the source facial-expression timing while keeping the photo identities stable. Both scaffolds must remain within the 7,000-character provider limit with maximum customization. The actual new-order paid serializer must retain these instructions while still sending only three reference images, with no route switch or added video. Historical saved orders retain their frozen prompts and video references.

Verified: 313 AI/payment tests pass, including both actual paid-payload orientations, both prompt branches within the provider limit, photo-identity versus animated-expression separation and historical frozen orders. Typecheck, build, dry run and deployment pass. Published Worker `9179d418-a76a-47e8-b4c8-054ec05f7e26`; live homepage returns 200 and keeps the hidden prompt out of HTML/client JavaScript. The live-browser scene/portrait/text/tag checkout regression passes with mutations mocked. Visual acceptance still requires checking expression changes, head turns, lighting and finger/lip occlusion in a new result; prompt assertions alone do not establish natural facial animation. No provider submission or payment was made. Evidence: `test-results/facial-performance-{unit,typecheck,build,dryrun,deploy,browser}.log`, `facial-performance-live.json`, and `docs/implementation/dance-reference-continuity.md`.

## Prioritize uploaded identities and scene with three-image generation (2026-10-20)

Acceptance: for new Compshare orders, prioritize the uploaded identities and selected scene; an approximate dance is acceptable. Send only three ordered reference images, with no video even when a motion URL is configured or supplied by the client. The hidden prompt contains no video or subject-reference labels. Image one supplies the dancer and image two supplies the princess from the opening frame through the final frame; never delay replacement or morph between identities. Image three supplies the environment in every shot. Ignore identity-photo backgrounds, poses and framing. Describe the fixed sequence in the server prompt: dancer shush, princess reaction, measured bent-knee tiptoe side steps and readable footwork, then the same dancer still moving in the same scene. Exclude uploaded-photo inserts, freeze-frames and end-cards. Preserve custom scene, creator text/styles and their priority, duration, orientations, reference-image roles, saved paid options and purchase idempotency. Preserve the original no-config prompt builder preset and continue routing historical saved orders with their frozen video references and prompts.

Custom-scene acceptance also excludes named film actors and default barn/straw/fantasy-scene wording from the compiled image-only prompt, uses the selected scene's lighting/materials/color palette, and requests exactly one instance of each person in a shot.

Verified: 310 AI/payment tests, typecheck and build pass. Tests capture the actual new-order paid Compshare serializer and a historical saved video-reference order, with external traffic simulated. Two browser regressions cover scene/text/tag checkout and input retention during processing. A user-authorized real image-priority test preserves the uploaded adult dancer, the selected lobby in its main shots and a moving ending, but still adds straw/duplicate-person artifacts in early shots. Final wording excludes those default scene cues and requests one instance per character; it was not followed by a further paid visual test. Passing payload assertions alone does not establish visual fidelity. Evidence and rollout: `docs/implementation/dance-reference-continuity.md`. No additional provider submission or payment is authorized by this test entry.

## Delayed processing reassurance (2026-10-20)

Acceptance: while the paid video remains processing for two minutes, show a concise reassurance directly below the right-hand generation area. Explain that busy periods can take longer and the video is still processing, without asserting unverified load or guaranteed success. Hide the hint before two minutes, when a result/error arrives and when starting a different purchase; clear timers on unmount. Centralize public copy and the two-minute threshold. Verify elapsed time without real waiting using the browser clock; no real provider call or charge.

Verified with the browser clock: absent at 119,999 ms, visible at 120,000 ms, and removed after the successful result. The same scenario retains photos/creator inputs through checkout return and refresh and repeats checkout without another upload. Published in Worker `cc1b413f-336e-434c-bb3e-470f76a3fb62`. Evidence: `test-results/retain-maker-inputs-focused-e2e.log`, `retain-maker-inputs-live-e2e.log` and `retain-maker-processing.png`. All 309 AI/payment tests, the 22 existing browser checks, typecheck/build and dry run also pass.

## Preserve maker photos and custom inputs through generation (2026-10-20)

Acceptance: clicking Generate and continuing through Stripe must retain dancer/princess/scene previews, the creator's own description, tags and orientation while submitting/processing and after reload. Restore only the owner's saved image references and creator inputs; never expose the hidden full prompt. Persist normalized creator inputs in the existing order JSON for new orders; recover bounded creator text/tags from known historical templates when metadata is absent. Keep previews visible and controls locked during active generation. Existing uploaded references remain usable for another purchase after completion; changing/removing references must invalidate the old result without silently clearing the description. Preserve payment admission/refunds. Also remove the default result-area screenshot.

Verified: 309 AI/payment unit tests, 22 prior browser checks and the combined return/reload/repeat-purchase scenario pass. The default CSS screenshot is absent from the processing panel. The new scenario's original failure was an accessibility selector hidden by the checkout modal; checking the retained textarea directly resolved it without an application change. Deployed Worker `cc1b413f-336e-434c-bb3e-470f76a3fb62`. No real Stripe charge or provider job. Implementation/evidence: `docs/implementation/maker-input-retention.md`, `test-results/retain-maker-inputs-unit.log`, `retain-maker-inputs-e2e.log` and `retain-maker-inputs-focused-e2e.log`.

## Remove the maker's default video still (2026-10-20)

Acceptance: on the violet homepage, remove the CSS video screenshot from the empty and generating result area. Show the existing neutral dark surface and current empty/progress content until a real result is available. Preserve actual result playback, the three video examples, selected photo previews, payment and generation behavior. Verify computed background styles in idle and processing states, responsive appearance and current public-site availability. This is a small presentation change; use existing browser regressions and a visual check.

## Explicit Compshare performer replacement prompt (2026-10-20)

Acceptance: keep the same Compshare API, price, payment flow, UI, orientations and reference assets. The hidden server prompt must explicitly map the active male dancer in the motion video to uploaded image one, the seated watching princess to image two, and the environment to image three. Apply replacement to every shot, including facial close-ups and footwork; source motion never defines the new performer's face, age, hair, body proportions or outfit. Preserve image-defined identity while allowing creator descriptions/tags to change outfits, expressions, camera and scene. Begin by establishing the replacement face visibly. Keep the original image-only/AutoDL prompt behavior. Verify the actual paid payload and one bounded real experiment with a clear reference image; distinguish successful request serialization from actual visual replacement.

Verified: 304 AI/payment tests, 22 related browser checks, typecheck, build and dry run passed. The actual paid request contains both performer-to-subject mappings and documented subject labels. Maximum description/all tags remain below the provider prompt limit. A single real five-second experiment with a clear fictional adult image and the explicit replacement prototype succeeded: the source's childlike black-suited performer becomes the curly-haired adult in green/brown clothing, including close-up and footwork shots. This used the same Compshare API, three image roles, motion asset and `use_context_ir=false`, for 50 points; no Stripe charge. Both input quality and prompt changed, so their separate effects are not isolated. Published Worker `c576c9e2-1a1a-471b-99ae-30a2a662d54f` applies the generic ten-second template to new orders. Evidence: `test-results/compshare-identity-unit.log`, `compshare-identity-e2e.log`, `compshare-identity-generation.json`, `compshare-identity-contact.png`, `compshare-identity-metadata.json` and `compshare-identity-deploy.log`.

## Compshare H3 provider migration with retained AutoDL (2026-10-20)

Download acceptance: the real Compshare output host does not grant browser CORS reads. Serve downloads through the existing authenticated streaming endpoint, restricted to the exact provider host and output directory. Keep historical AutoDL downloads working, reject malformed/unrelated URLs and preserve signed queries. Verify actual live video playback and byte-identical browser download.

Live download verified: a real anonymous session on the deployed site streamed the actual generated file through the download proxy; the browser saved 4,341,091 bytes identical by SHA-256 to the provider file. Actual playback advanced decoded 1344×768 video. The order response was a browser fixture; there were no payment/generation mutations. Evidence: `test-results/compshare-live-result-browser.json`.

Acceptance: new dance orders use Compshare MiniMax-H3 with Bearer authentication, native 768P, 10 seconds and explicit landscape/portrait ratios. Preserve the previous AutoDL implementation and comment its former default selection; historical saved AutoDL orders/tasks still fulfill and poll through their original provider. Preserve $4.99 paid-only admission, three owned/reference images, custom scene/text/tags, persisted options, recovery and refunds. Serialize Compshare images with `role=reference_image`, videos with `role=reference_video`, and convert prompt tags to `<Picture N>` / `<Video N>`. Optional server-owned reference video must be saved in each new order; clients cannot override it. Use purchase-scoped idempotency keys; never fall back to another provider after an ambiguous submission. Validate credentials before checkout; keep secrets server-side. Test provider serialization/status handling, both providers' paid lifecycles and related UI. A real integration check requires the user's new API key and available points.

Verified: 301 AI/payment tests, 22 related browser checks, typecheck, build and dry run passed. Deployed Worker `93426cc6-7a33-4399-bd78-c9006b38c3de` with the supplied key and 15-second motion reference. The real API rejects references longer than approximately 15 seconds and emits undocumented `moderating`; both were handled from observed responses. Exactly one accepted real test job succeeded, producing a 1344×768, 10.125-second H.264/AAC file for 100 points. No Stripe charge. Live homepage is available; custom scene/portrait checkout and 768/390/320px layouts pass without browser errors. Visual inspection shows strong source-video identity influence; this result does not establish personal likeness. Evidence: `test-results/compshare-unit.log`, `compshare-e2e.log`, `compshare-live-generation.json`, `compshare-live-video-metadata.json`, `compshare-production-smoke.json` and `compshare-deploy.log`.

## Optional custom scene image (2026-10-20)

Acceptance: keep the included barn scene and add an optional scene upload with preview/change/restore controls to the shared maker. Apply the existing JPG/PNG/WebP and 10 MB limits. Upload only on checkout, send the owned scene URL through checkout, save it as reference image three and use it after verified payment/recovery. A custom scene must remove the original prompt's hardcoded straw-wall/location restrictions. Preserve dancer/princess slots, custom description/tags, orientation, $4.99 and 10 seconds. Restore the saved scene preview on returning to an order and lock controls during processing. Reject other users' scene URLs or missing stored objects before checkout. Verify browser flow and actual provider payload with simulated external responses; no real charge/generation.

Verified: 259 AI/payment tests and 22 related browser checks, typecheck/build and Wrangler dry run pass. Published Worker `d657fe23-a2c1-4eea-b2e2-9328e7d63a38`. Live homepage returns200; scene preview/default restoration and mocked scene checkout pass. Desktop and 768/390/320px layouts fit without browser errors. Zero real uploads, charges or provider jobs. Evidence: `test-results/custom-scene-unit.log`, `custom-scene-e2e.log`, `custom-scene-visual.json`, `custom-scene-live.json` and `custom-scene-deploy.log`.

## Landscape / portrait video selection (2026-10-20)

Acceptance: the current H3 public workflow exposes both `768p横` and `768p竖`. Add accessible Landscape / Portrait controls beneath the photos, defaulting to landscape. Validate the selection before checkout, save its mapped provider resolution in the order, and use that saved resolution after payment/recovery. Restore the selected orientation on returning to an order and lock controls while processing. Preserve description/tags, $4.99, 10 seconds, reference images and payment/refund behavior. Check the real provider request serializer with simulated payment/provider responses, plus desktop/mobile browser interaction; no real charge or generation.

Verified: 249 AI/payment tests, 21 related browser checks, typecheck/build and Wrangler dry run pass. Live Worker `418abc5a-21da-44c4-ba64-1e82bad3f44d` returns200 and shows both choices. Live mouse/keyboard checks select Portrait and capture `orientation: portrait` in checkout, with all upload/payment/generation mutations simulated. Desktop and 768/390/320px layouts fit; no browser errors. Evidence: `test-results/orientation-api-rules.json`, `orientation-unit.log`, `orientation-e2e.log`, `orientation-visual.json`, `orientation-live.json` and `orientation-deploy.log`.

## Optional dance description and effective quick tags (2026-10-20)

Acceptance: add an optional 300-character description and three toggleable quick tags beneath the two photo inputs. Blank customization preserves the original template verbatim. Description/tags must cross the checkout boundary, be validated/canonicalized server-side, compile into non-conflicting model instructions, persist in the paid purchase and reach the actual AutoDL request body. Explicit description takes precedence over quick-tag styling when they conflict. Keep photo identities, one paid generation, $4.99 and 10 seconds. Reject invalid tags/oversized values before checkout. Preserve cancellation/recovery/refunds, lock inputs while processing and fit mobile. Verify the browser request, durable order options and actual provider payload using simulated Stripe/provider responses. Do not claim guaranteed visual adherence or run a real charge/generation.

Verified: 233 AI/payment tests and 17 homepage/paid-maker browser checks pass, including all custom-to-model-request boundaries. Typecheck/build pass and Wrangler packaging completed. Deployed Worker `631d6afb-fb3d-4d35-bc5f-4352d7aec985`. Live homepage and both maker routes return200 with enabled optional controls; live browser checks capture the description and all three normalized tag IDs in the checkout request, with external mutations mocked. Desktop and 768/390/320px layouts fit with no browser errors. Zero real uploads, charges or provider jobs; visual adherence remains untested. Evidence: `test-results/custom-description-unit.log`, `custom-description-e2e.log`, `custom-description-visual.json`, `custom-description-live.json`, `custom-description-deploy.log`.

## Concise photo and download copy (2026-10-20)

Acceptance: remove homepage storage-provider, public-URL, internal choreography and temporary-library implementation prose. Use short generation/download instructions. Simplify the corresponding privacy/terms language while preserving an accurate explanation of photo links and deletion requests on the policy page. Per the user's follow-up, do not implement or promise automatic deletion, change storage rules, or alter generation/payment behavior. Verify existing homepage/maker checks and live rendered copy.

Verified: typecheck, build/dry run and all four existing homepage checks pass. Published Worker `9ff4f9cb-8ff3-4a9d-b1be-78c581ace71f`. Live homepage/privacy/terms return200 with the concise copy and no automatic-deletion promise. Only copy sources changed; the bucket lifecycle was inspected without modifying its rules. No upload, charge or generation. Evidence: `test-results/concise-copy-e2e.log`, `concise-copy-deploy.log`, `concise-copy-live.json`.

## Selected violet motion homepage theme (2026-10-20)

Acceptance: apply the user's selected midnight/blue-violet visual direction to the homepage through CSS and a presentation class only. Preserve all copy, media URLs, controls, legal content, generation/payment behavior, API code and Stripe configuration. Restyle the existing checkout dialog to match. Keep the existing three videos, fit desktop/mobile, preserve focus and all paid-maker states. Use existing homepage and paid-maker E2E checks plus a desktop/mobile visual check; no additional review cycle or real charge/generation. Other routes retain their current styles.

Status: deployed as Worker `123160c8-f65c-4e81-aea8-8b1160a95167`. Typecheck, build/dry run and all 15 existing homepage/paid-maker checks pass. Live desktop and 768/390/320px layouts fit; the three original videos remain, the existing $4.99 dialog opens and no browser errors occurred. No real upload, payment or provider job. Evidence: `test-results/motion-ui-e2e.log`, `motion-ui-live-visual.json`, `motion-ui-live-desktop.png`, `motion-ui-live-mobile.png`, `motion-ui-live-dialog.png`, `motion-ui-deploy.log`.

## Stripe background recovery on the existing Free plan (2026-10-20)

Acceptance: Stripe live credential/account and $4.99 product/price/webhook are now verified and provisioned. Additive production D1 migration0008 succeeded. Initial Worker upload succeeded, but cron synchronization hit the existing account's five-trigger Free-plan limit. Replace only this app's proposed cron with SQLite-backed per-purchase Durable Object alarms; preserve existing jobs and billing plan. Persist recovery scheduling before creating a chargeable checkout, rearm paid/processing/refund work without an open browser, stop terminal work safely, and preserve all payment/one-use/refund guards. Cover alarm persistence/retries/concurrency in local runtime tests, then redeploy and verify a real unpaid hosted checkout,402 admission, callback signature, cancellation/expiry and generic-image cleanup. No actual charge or provider generation.

Status: deployed as Worker `9d20cf20-0159-4832-932a-5730ac652316`. 208 AI/payment unit tests, 24 browser checks, typecheck, production build, deployment dry run and actual local Worker admission checks passed. Real workerd SQLite alarm tests cover restart, repeated outages and concurrent wake cleanup. Production hosted checkout displays `Rumpelstiltskin AI` and US$4.99; unpaid admission returns402, signature validation, cancellation and real session expiry pass. The synthetic checkout was expired and generic test image removed. No real charge or provider job was submitted. Real paid generation/refund remains untested. No other project's schedules or plan changed. Evidence: `test-results/stripe-production-do-deploy.log`, `stripe-production-smoke.json`, `stripe-production-hosted-checkout.png`, `stripe-secret-scan.json`.

## Stripe paid dance generation (2026-10-20)

Acceptance: Generate opens a $4.99 USD one-video payment dialog; only a verified paid Stripe session authorizes one generation. Guests can buy without signup, return from Checkout to automatic generation, refresh safely, download the result and buy another video. Pending, cancelled, forged, wrong-owner or refunded sessions must not start any provider job, regardless of old free credits. Verify webhook authentication, concurrent/double delivery, correct amount/currency/product, durable one-use claims and refunds for confirmed technical generation failures. Background reconciliation must continue if the browser closes. Update free/pricing/refund copy and preserve the compact three-video gallery. No real charge/provider generation is part of tests. The target live Stripe account is explicitly `acct_1TXtuTKmWtIG8s90`; do not change Pixal3D configuration.

Verified locally: 208 AI/payment unit tests, 24 browser checks, TanStack typecheck, Cloudflare production build, all local D1 migrations through 0008 and Wrangler deployment dry run pass. The final browser suite covers homepage/tool/tutorial/analytics regressions plus 11 paid-maker scenarios: dialog/focus/mobile, no upload before Pay, checkout without generation, verified return/download/repeat purchase, cancellation/unpaid return, refresh, temporary failure, refund, initial lookup retry, terminal missing reference cleanup and preservation of an owned completed video. Actual local Worker/D1 checks reject old free-generation inputs, forged purchases and unsigned webhook bodies; a signed probe is accepted. Spec and quality reviews approved after checkout-draft rotation, fair batch scheduling, terminal return errors and the alarm timestamp regression were fixed.

Live activation complete: the user supplied the live key through an ignored local file. Correct account and charge readiness were verified; app-specific price/webhook were provisioned, additive remote D1 migration0008 applied and Worker deployed. Production checks and limits are recorded above. Pixal3D configuration remains unchanged. Evidence: `test-results/stripe-final-e2e.log`, `stripe-unit-tests.log`, `stripe-cloudflare-build.log`, `stripe-d1-production-migration.log`, `stripe-wrangler-dry-run-live.log`, `stripe-local-admission.json`, `stripe-production-smoke.json`. See `docs/implementation/stripe-video-payments.md`.

## Simplified video examples (2026-10-20)

Acceptance: per the user's annotated screenshot, remove the homepage gallery intro, featured maker sample and its call to action, inspiration subheading and explanatory paragraph. Render the three existing reference cards directly beneath the video-examples heading. Keep their playback controls and current card captions. Preserve the separate generator-page demo.

Verified: typecheck, production build, deployment dry run and all 13 homepage/maker/tool-page E2E checks passed. Published as Worker version `9be55485-1792-475f-b8b7-b65cde202ea2`. Live homepage returned 200 with exactly three playable videos in the grid directly after the section heading, no removed blocks, and no horizontal overflow at 390px. The separate generator demo remains covered by the existing tool-page check. Evidence: `test-results/homepage-videos-simplified-production.json`, `homepage-videos-simplified-live-desktop.png`, `homepage-videos-simplified-live-mobile.png` and `homepage-videos-simplified-deploy.log`. No provider job was submitted.

## Playable homepage video examples (2026-10-20)

Acceptance: replace the homepage's three illustrative stills with three playable, visually reviewed AI dance references, and feature the existing real maker sample separately. Show no added author names or source-credit text, per user instruction. Distinguish inspiration clips from this maker's result without claiming endorsement or identical results. Preserve aspect ratios, provide controls and inline playback, avoid autoplay and eager video downloads, and handle playback failure. Verify raw SSR markup, local sample playback, remote media metadata/playback and a 390px layout. This targets the established English TanStack production site; the other apps are unmodified template applications.

Verified: TanStack typecheck, Cloudflare production build and Wrangler deployment dry run passed. All 13 homepage, maker and tool-page E2E checks passed, including native sample playback and unavailable-video recovery. Separate real-browser playback checks confirmed all four clips advance with decoded video frames, with no added credit text and no horizontal overflow at 390px. Evidence: `test-results/homepage-video-playback.json`, `homepage-videos-desktop.png` and `homepage-videos-mobile.png`. Existing maker test link assertion is now scoped to the maker, because the gallery adds legitimate direct-video links. No provider generation was submitted. Deployed version `d68b22ba-317e-4b65-8598-88188f3ec768`; live homepage returned 200, all four videos played, the privacy disclosure was present, and mobile overflow/added-credit checks passed. Production evidence: `test-results/homepage-videos-production.json`, `homepage-videos-live-desktop.png`, `homepage-videos-live-mobile.png` and `homepage-videos-deploy.log`.

## PostHog AI acquisition analytics (2026-10-15)

Acceptance (updated per user): TanStack English production site only. Initialize the official SDK once after hydration. Record basic page-load visits with referrer/UTM attribution so AI-referred visitor counts can be viewed. Do not track generation, uploads, previews, downloads, clicks or client-side navigation. Disable session replay, autocapture, person profiles and unrelated features; never send photos, filenames, prompts or media URLs. Analytics failure must not block the site. Update the privacy notice. Verify real SDK requests using a local build and mocked ingestion, then confirm live ingestion without creating any provider job. Do not enable billing or add a payment card.

Verified: TanStack typecheck, Cloudflare build/dry run, 2 existing maker SSR tests and the focused real-SDK E2E passed. Deployed version `5edb844b-3c6e-4ff0-993a-63bbb0f854ac`. Live ingestion returned HTTP 200 with `{"status":"Ok"}`; homepage H1 remains in raw SSR HTML and privacy disclosure is live. Only `/e/` ingestion was requested; no recording/config plugins or operation events were sent. Production verification created direct test visits, never a fabricated AI referrer or provider generation. Evidence: `test-results/posthog-e2e.log`, `posthog-build.log`, `posthog-deploy.log`, `posthog-production-smoke.json`. See `docs/implementation/posthog-analytics.md` for dashboard and configuration.

## Default princess restoration (2026-10-14)

Acceptance: preserve the existing princess identity and expression, improve clarity, remove player overlays, and use the same restored asset in the maker, public examples and AutoDL's default reference. Keep old files available for rollback; use a versioned URL to avoid stale browser/CDN caches.

Verified: edited 1589x990 PNG inspected for retained identity and removed overlays. R2 public GET returned 200 with identical bytes/SHA-256 (test-results/princess-reference-r2.json). Typecheck, Cloudflare build, 8 existing maker/template unit tests and 7 homepage/maker E2E checks passed. Browser confirmed both preview/example images loaded the new version. Updated the tutorial screenshots with mocked generation, zero paid jobs. Page evidence: test-results/princess-reference-page.png; edit prompt: docs/implementation/princess-reference-edit.json.

## Compact maker and generated tutorial art (2026-10-14)

Acceptance: remove the display-only "Your dance setting" block from the shared maker; preserve photo inputs and generation/download controls; keep the player compact instead of stretching to the form height; serve four generated tutorial illustrations with alt text and SSR copy; align the tutorial instructions and screenshots with the remaining controls.

Verified: TanStack typecheck and Cloudflare production build passed; 2 maker SSR tests and 10 homepage/maker/content-page E2E checks passed. Browser review confirmed the removed panel, a compact 16:9 player, all four generated 960x640 PNG illustrations loaded, and no horizontal overflow at 390px. Tutorial screenshots were recaptured with mocked generation (zero paid jobs). Evidence: test-results/homepage-tutorial-desktop.png, test-results/homepage-tutorial-mobile.png and test-results/stage4-tutorial-capture.json. Image prompts and saved paths: docs/implementation/homepage-tutorial-assets.json.

## Local preview R2 upload regression (2026-10-14)

Acceptance: the proxy-aware local preview forwards a WebSocket upgrade and frames instead of sending them through ordinary fetch; a real anonymous upload reaches the configured R2 bucket and its returned image URL is readable; failed upload creates no video task and consumes no trial. Do not submit another paid video job during diagnosis. Keep the user's selected photos intact.

Verified: real local Miniflare/WebSocket round-trip regression failed with UND_ERR_INVALID_ARG before the fix and passed after it. All 22 focused transport/video API/client tests passed; TanStack typecheck and production build passed. `scripts/manual/r2-upload-check.mjs` verified a real anonymous upload (HTTP 200), public R2 read (HTTP 200), identical bytes, unchanged 40-credit balance and available allowance. It removed its own test image and guest; paidJobs=0. Evidence: `test-results/r2-upload-fix.json`. The user's selected photos and trial were not modified.

本文档详细记录所有已实现的 E2E 测试用例，包含每个测试的具体步骤和验证内容。

> 编写规范和架构约定请查看 [`AGENTS.md`](./AGENTS.md)。

---

## 目录

### 已实现

- [1. 公共页面冒烟测试](#1-公共页面冒烟测试)
- [2. 认证流程测试](#2-认证流程测试)
- [3. 权限控制测试](#3-权限控制测试)
- [4. 仪表盘测试](#4-仪表盘测试)
- [5. 定价页测试](#5-定价页测试)
- [6. AI 功能页测试](#6-ai-功能页测试)
- [7. Stripe 支付流程测试](#7-stripe-支付流程测试)
- [8. 个人资料更新测试](#8-个人资料更新测试)
- [9. 修改密码测试](#9-修改密码测试)
- [10. 语言切换测试](#10-语言切换测试)
- [11. 上传页测试](#11-上传页测试)
- [12. 管理员面板测试](#12-管理员面板测试)
- [13. AI 对话（真实交互）](#13-ai-对话真实交互)
- [15. AI 图片生成（真实生成）](#15-ai-图片生成真实生成)
- [17. Creem 支付流程测试](#17-creem-支付流程测试)
- [18. PayPal 支付流程测试](#18-paypal-支付流程测试)
- [16. 管理员子页面筛选功能测试](#16-管理员子页面筛选功能测试)

- [21. 推荐返利系统测试](#21-推荐返利系统测试)
- [22. 管理员返利管理测试](#22-管理员返利管理测试)
- [23. 推荐佣金支付全流程测试](#23-推荐佣金支付全流程测试)
- [24. 管理员动态定价管理测试](#24-管理员动态定价管理测试)
- [25. Waffo 支付流程测试](#25-waffo-支付流程测试)

### 待实现 (Backlog)
- [19. 支付宝支付流程测试](#19-支付宝支付流程测试)
- [20. 博客功能测试](#20-博客功能测试)

### 追踪

- [Backlog 优先级汇总](#backlog-优先级汇总)
- [测试结果追踪](#测试结果追踪)

---

## 1. 公共页面冒烟测试

**文件：** `specs/public-pages.spec.ts` ｜ **优先级：** P0 ｜ **无需登录**

最基础的健全性检查，验证公共页面能正常打开、不报错。

| # | 测试名称 | 具体流程 |
|---|---------|---------|
| 1 | 首页加载 | 打开 `/en` → 验证页面标题不含 error/500/404 → 验证 `<header>` 和 `<nav>` 可见 → 验证首屏 `<h1>` 标题可见 |
| 2 | 登录页加载 | 打开 `/en/signin` → 验证邮箱输入框、密码输入框、提交按钮均可见 |
| 3 | 注册页加载 | 打开 `/en/signup` → 验证姓名输入框（`#name`）、邮箱输入框、密码输入框、提交按钮均可见 |
| 4 | 忘记密码页加载 | 打开 `/en/forgot-password` → 验证邮箱输入框可见 → 验证表单内按钮可见 |
| 5 | 定价页加载 | 打开 `/en/pricing` → 验证标题不含错误 → 验证至少有一个含 ¥ 或 $ 价格的元素可见 |

---

## 2. 认证流程测试

**文件：** `specs/auth-flow.spec.ts` ｜ **优先级：** P0

完整的 注册 → 登录 → 登出 → 重定向 生命周期测试。

### 注册组

| # | 测试名称 | 具体流程 |
|---|---------|---------|
| 1 | UI 表单注册 | 打开注册页 → 填写姓名/邮箱/密码 → 点击提交 → 等待 URL 离开 `/signup`（即注册成功后自动跳转） |
| 2 | API 注册 | 通过 `POST /api/auth/sign-up/email` 直接创建用户 → 验证返回 200 → 验证响应体包含 `user.email` |

### 登录 / 登出 / 重定向组

> 这组测试共用一个用户账号（在 `beforeAll` 中通过 API 注册一次），避免频繁注册触发限流。

| # | 测试名称 | 具体流程 |
|---|---------|---------|
| 3 | UI 表单登录 | 打开登录页 → 填写邮箱/密码 → 点击提交 → 等待 URL 离开 `/signin` |
| 4 | API 登录 | 通过 `POST /api/auth/sign-in/email` 登录 → 验证返回 200 |
| 5 | 登出后无法访问仪表盘 | 先 API 登录 → 访问仪表盘确认可进入 → 调用 API 登出 → 再次访问仪表盘 → 验证被重定向到 `/signin` |
| 6 | 已登录用户访问 /signin 重定向到 /dashboard | API 登录 → 访问 `/signin` → 验证被自动重定向到 `/dashboard` |
| 7 | 已登录用户访问 /signup 重定向到 /dashboard | API 登录 → 访问 `/signup` → 验证被自动重定向到 `/dashboard` |

---

## 3. 权限控制测试

**文件：** `specs/access-control.spec.ts` ｜ **优先级：** P0

验证保护页面的访问控制：未登录 → 重定向，无权限 → 403。

### 未认证访问组

| # | 测试名称 | 具体流程 |
|---|---------|---------|
| 1 | /dashboard 重定向 | 未登录访问 `/dashboard` → 验证 URL 包含 `/signin` |
| 2 | /upload 重定向 | 未登录访问 `/upload` → 验证 URL 包含 `/signin` |
| 3 | /admin 重定向 | 未登录访问 `/admin` → 验证 URL 包含 `/signin` |
| 4 | /premium-features 重定向 | 未登录访问 `/premium-features` → 验证 URL 包含 `/signin` |

### 已认证非管理员访问组

> 共用一个普通用户账号（`beforeAll` 注册）。

| # | 测试名称 | 具体流程 |
|---|---------|---------|
| 5 | 普通用户访问 /admin 返回 403 | API 登录普通用户 → 访问 `/admin` → 验证返回 HTTP 403 或重定向到 signin |
| 6 | 普通用户可以访问 /dashboard | API 登录普通用户 → 访问 `/dashboard` → 验证停留在仪表盘页面 |

---

## 4. 仪表盘测试

**文件：** `specs/dashboard.spec.ts` ｜ **优先级：** P1

验证仪表盘页面功能，包括用户信息展示和标签页导航。

> 所有测试共用一个浏览器上下文（避免限流），按串行顺序执行。

| # | 测试名称 | 具体流程 |
|---|---------|---------|
| 1 | 仪表盘加载并显示用户信息 | API 注册并登录 → 访问 `/dashboard` → 验证 URL 正确 → 验证 `<h1>` 可见 → 验证用户名显示在页面上 |
| 2 | 个人资料标签页显示邮箱和姓名 | 访问 `/dashboard` → 等待加载完成 → 验证用户姓名和邮箱都显示在页面上 |
| 3 | 可以在标签页之间导航 | 访问 `/dashboard` → 获取所有标签按钮 → 验证数量 > 1 → 点击第二个标签 → 验证未离开 dashboard 页面 |

---

## 5. 定价页测试

**文件：** `specs/pricing.spec.ts` ｜ **优先级：** P1 ｜ **无需登录**

验证定价页的计划卡片渲染和标签切换。

| # | 测试名称 | 具体流程 |
|---|---------|---------|
| 1 | 渲染计划卡片 | 打开定价页 → 验证页面标题可见 → 验证至少有一个含价格符号的元素 |
| 2 | 卡片显示名称、价格和功能 | 打开定价页 → 验证 `<h3>` 计划名称数量 ≥ 1 → 验证 CTA 按钮数量 ≥ 1 |
| 3 | 卡片包含功能列表和勾选图标 | 打开定价页 → 验证功能列表项数量 ≥ 1 |
| 4 | 订阅 / 积分标签切换 | 打开定价页 → 检查是否有标签切换器 → 如果有，点击「积分」标签 → 验证价格仍然可见 → 切回「订阅」标签 → 验证价格可见 |

---

## 6. AI 功能页测试

**文件：** `specs/ai-features.spec.ts` ｜ **优先级：** P2

验证 AI 功能页面能正常加载并显示关键 UI 元素。**不会**实际调用 AI API 生成内容。

| # | 测试名称 | 具体流程 |
|---|---------|---------|
| 1 | AI 对话页加载 | 打开 `/ai` → 如果未被重定向到登录页，验证文本输入区域（`<textarea>` 或 `contenteditable`）可见 |
| 2 | 图片生成页加载 | 打开 `/image-generate` → 验证提示词输入框可见 → 验证模型选择器（下拉框）存在 |
| 3 | 视频生成页加载 | 打开 `/video-generate` → 验证提示词输入框可见 → 验证模型选择器（下拉框）存在 |
| 4 | 图片生成页有生成按钮 | 打开 `/image-generate` → 验证页面上至少有一个按钮 |
| 5 | 模型目录不含已下线型号 | 打开 `/ai` → 打开模型下拉 → 可见 Qwen 3.7 Flash → 不可见 Qwen Turbo / DeepSeek Coder / GPT-5 Codex。打开 `/image-generate` → 可见 Qwen Image 3.0 Pro → 不可见 DALL-E 3 / Qwen Image Plus。打开 `/video-generate` → 可见 Seedance 2.5 → 不可见 Kling 2.5 / Wanxiang 2.6 |
| 6 | 视频生成页有生成按钮 | 打开 `/video-generate` → 验证页面上至少有一个按钮 |

---

## 7. Stripe 支付流程测试

**文件：** `specs/stripe-payment.spec.ts` ｜ **优先级：** P0

> ⚠️ **前置条件：**
> 1. 开发服务器在 7001 端口运行
> 2. `stripe listen --forward-to localhost:7001/api/payment/webhook/stripe` 正在运行
> 3. `.env` 中配置了 Stripe 测试模式的 API Key

完整的 Stripe 支付端到端流程，覆盖**订阅购买**和**积分购买**两个链路。使用测试卡号 `4242 4242 4242 4242` 模拟支付，不产生真实扣款。

> 所有测试共用一个浏览器上下文（`beforeAll` 注册），按串行顺序执行。

### A) 订阅购买流程

| # | 测试名称 | 具体流程 |
|---|---------|---------|
| 1 | 点击 Stripe 订阅计划跳转到 Checkout | API 注册用户 → 打开定价页（默认"订阅"标签页） → 等待 plan cards 渲染完成 → 找到 "Stripe Monthly Plan" 标题 → 滚动到可见区域 → 点击对应的 CTA 按钮 → 等待 URL 跳转到 `checkout.stripe.com` |
| 2 | 完成 Stripe 订阅支付 | 重复步骤 1 跳转到 Stripe Checkout → 等待卡号输入框出现 → 填写卡号 `4242 4242 4242 4242` → 填写有效期 `12/30` → 填写 CVC `123` → 填写持卡人姓名 → 点击 "Subscribe" 按钮 → 等待重定向回 `/payment-success` → 验证 URL 包含 `payment-success` 和 `provider=stripe` |
| 3 | 支付成功页显示成功 UI | 重复步骤 2 完成支付 → 验证成功页 `<h1>` 标题可见 → 验证页面上有跳转到 `/dashboard` 的链接 |
| 4 | 支付取消页可正常访问 | 直接访问 `/payment-cancel` → 验证 URL 正确 → 验证页面标题可见 → 验证有返回 `/pricing` 的链接 |
| 5 | 仪表盘订阅标签显示计划详情 | 访问 `/dashboard` → 点击"Subscription Status"导航按钮 → 等待订阅数据加载 → **如果 webhook 已处理**：验证计划名称 "Stripe Monthly Plan" 可见 → 验证 "Active" 状态徽章可见 → 验证 "Start Date" 和 "End Date" 标签可见 → 验证 "Recurring" 付款类型徽章可见 → 验证进度条存在。**如果 webhook 未处理**：验证 "No Active Subscription Found" 提示可见 → 验证 "View Plans" 链接可见 |

### B) 积分购买流程

| # | 测试名称 | 具体流程 |
|---|---------|---------|
| 6 | 点击 Stripe 积分计划跳转到 Checkout | 打开定价页 → 点击「Credits / 积分充值」标签 → 等待积分计划卡片渲染 → 找到 "100 Credits Stripe" 标题 → 点击对应的 CTA 按钮 → 等待 URL 跳转到 `checkout.stripe.com` |
| 7 | 完成 Stripe 积分购买 | 重复步骤 6 跳转到 Stripe Checkout → 填写测试卡信息 → 点击 "Pay" 按钮 → 等待重定向回 `/payment-success` → 验证 URL 包含 `payment-success` 和 `provider=stripe` |
| 8 | 仪表盘积分标签显示余额更新 | 访问 `/dashboard` → 点击"Credits"导航按钮 → 验证 "Credit Balance" 标题可见 → 验证 "Available Credits" 标签可见 → 读取余额数值 → 验证 ≥ 100 → 验证 "Total Purchased" ≥ 100 → 如果 webhook 已处理，验证交易记录中出现 "Purchase" 类型条目 |

### Stripe 订阅支付完整链路图

```
用户登录
  ↓
打开 /pricing 定价页（"订阅"标签页）
  ↓
点击 "Stripe Monthly Plan" 的 CTA 按钮
  ↓
前端调用 POST /api/payment/initiate { planId: 'monthly', provider: 'stripe' }
  ↓
后端创建 Stripe Checkout Session → 返回 paymentUrl
  ↓
前端 window.location.href = paymentUrl
  ↓
浏览器跳转到 checkout.stripe.com（Stripe 托管页面）
  ↓
用户填写测试卡信息并点击 "Subscribe"
  ↓
Stripe 处理支付 → 重定向到 /payment-success?session_id=xxx&provider=stripe
  ↓
前端调用 GET /api/payment/verify/stripe?session_id=xxx 验证支付状态
  ↓
同时 Stripe 发送 webhook → stripe listen 转发到 /api/payment/webhook/stripe
  ↓
后端更新订单状态 → 创建/更新订阅记录
  ↓
用户在仪表盘"订阅"标签页看到：计划名称、Active 状态、起止日期、进度条
```

### Stripe 积分购买完整链路图

```
用户登录
  ↓
打开 /pricing 定价页 → 切换到「积分充值」标签页
  ↓
点击 "100 Credits Stripe" 的 CTA 按钮
  ↓
前端调用 POST /api/payment/initiate { planId: 'credits100', provider: 'stripe' }
  ↓
后端创建 Stripe Checkout Session → 返回 paymentUrl
  ↓
浏览器跳转到 checkout.stripe.com
  ↓
用户填写测试卡信息并点击 "Pay"
  ↓
Stripe 处理支付 → 重定向到 /payment-success?session_id=xxx&provider=stripe
  ↓
webhook 触发后端 → 查询 plan 的 credits 字段 (100) → 调用 creditService.addCredits()
  ↓
用户在仪表盘"积分"标签页看到：可用积分 ≥ 100、累计购买 ≥ 100、交易记录
```

---

## 8. 个人资料更新测试

**文件：** `specs/profile-update.spec.ts` ｜ **优先级：** P1

验证仪表盘中编辑个人资料的完整流程：进入编辑模式 → 修改姓名 → 保存 → 验证更新。

> 所有测试共用一个浏览器上下文（`beforeAll` 注册），按串行顺序执行。

| # | 测试名称 | 具体流程 |
|---|---------|---------|
| 1 | 个人资料标签页显示用户名和编辑按钮 | API 注册用户 → 访问 `/dashboard` → 验证用户名可见 → 验证 "Edit" 按钮可见 |
| 2 | 可以进入编辑模式并修改姓名 | 访问 `/dashboard` → 等待用户名加载 → 点击 "Edit" 按钮 → 验证 `#name` 输入框可见 → 清空并填入新姓名 → 点击 "Save" → 等待编辑模式关闭（"Edit" 按钮重新出现） → 验证新姓名显示在页面上 |

---

## 9. 修改密码测试

**文件：** `specs/password-change.spec.ts` ｜ **优先级：** P2

验证仪表盘「账户」标签页的密码修改功能。

> 所有测试共用一个浏览器上下文（`beforeAll` 注册），按串行顺序执行。

| # | 测试名称 | 具体流程 |
|---|---------|---------|
| 1 | 账户标签页显示修改密码区域 | API 注册用户 → 访问 `/dashboard` → 点击 "Account" 标签 → 验证 "Change Password" 文字可见 → 验证修改密码按钮可见 |
| 2 | 可以打开密码修改对话框并提交 | 访问 `/dashboard` → 切换到 "Account" 标签 → 点击 "Change Password" 按钮 → 等待对话框出现 → 填写当前密码 → 填写新密码 → 填写确认密码 → 点击提交 → 等待对话框关闭（表示修改成功） |
| 3 | 可以用新密码登录 | 创建全新浏览器上下文（无 cookie） → 用新密码调用 `signInViaAPI` → 验证返回 200 → 访问 `/dashboard` → 验证用户名可见（确认 session 有效） |

---

## 10. 语言切换测试

**文件：** `specs/i18n-switching.spec.ts` ｜ **优先级：** P2 ｜ **无需登录**

验证页面头部的语言切换功能，确保切换后 URL 更新、内容切换且选择持久化。

| # | 测试名称 | 具体流程 |
|---|---------|---------|
| 1 | 首页使用默认英文语言 | 打开 `/en` → 验证 URL 包含 `/en` |
| 2 | 从英文切换到中文 | 打开 `/en` → 点击语言下拉菜单 → 选择"中文" → 等待页面跳转到 `/zh-CN/` → 验证 URL 包含 `/zh-CN` |
| 3 | 从中文切换回英文 | 打开 `/zh-CN` → 点击语言下拉菜单 → 选择 "English" → 等待页面跳转到 `/en/` → 验证 URL 包含 `/en` |
| 4 | 语言选择跨页面持久化 | 打开 `/zh-CN` → 导航到 `/zh-CN/pricing` → 验证 URL 仍是中文 → 导航到 `/zh-CN/signin` → 验证 URL 仍是中文 |
| 5 | 子页面双语言均可访问 | 访问英文定价页 `/en/pricing` → 验证标题可见 → 访问中文定价页 `/zh-CN/pricing` → 验证标题可见 |

---

## 11. 上传页测试（真实上传）

**文件：** `specs/upload-page.spec.ts` ｜ **优先级：** P2

验证上传页面的真实上传流程（成功上传 + 客户端校验）。需要已配置可用的存储服务（OSS/S3/R2/COS）。

> 测试共用一个浏览器上下文（`beforeAll` 注册），按串行顺序执行。

| # | 测试名称 | 具体流程 |
|---|---------|---------|
| 1 | 上传页加载并显示存储服务选择器 | API 注册用户 → 访问 `/upload` → 验证页面标题可见 → 验证存储服务选择下拉框（`[role="combobox"]`）可见 |
| 2 | 成功上传图片并显示结果 | 使用 `input[type="file"]` 上传 1 张小尺寸 PNG → 等待 `POST /api/upload` 返回 200 → 验证上传后缩略图可见 → 验证查看文件链接可见 |
| 3 | 非图片文件被拒绝 | 上传 `.txt` 文件 → 验证提示 "Only image files are allowed" → 验证未出现上传结果 |
| 4 | 超过 1MB 文件被拒绝 | 上传 > 1MB 文件 → 验证提示 "File size must be less than 1MB" → 验证未出现上传结果 |

---

## 12. 管理员面板测试

**文件：** `specs/admin-panel.spec.ts` ｜ **优先级：** P3

验证管理员面板的核心功能：Dashboard 统计、子页面数据表、侧边栏导航和权限控制。

> 使用预置管理员账号 `admin@example.com` 登录（非测试创建，不会被 teardown 清理）。

### 管理员 Dashboard

| # | 测试名称 | 具体流程 |
|---|---------|---------|
| 1 | 管理员 Dashboard 加载并显示统计卡片 | 用管理员账号 API 登录 → 访问 `/admin` → 验证 "Admin Dashboard" 标题可见 → 验证至少有 4 个统计卡片 |
| 2 | Dashboard 显示图表和今日数据 | 访问 `/admin` → 验证 "Today" 相关文字可见 → 验证 "Recent Orders" 相关文字可见 |

### 管理员子页面

| # | 测试名称 | 具体流程 |
|---|---------|---------|
| 3 | 用户管理页显示数据表 | 访问 `/admin/users` → 验证 "User Management" 标题可见 → 验证 `<table>` 存在 |
| 4 | 订阅管理页显示数据表 | 访问 `/admin/subscriptions` → 验证 `<table>` 存在 |
| 5 | 订单管理页显示数据表 | 访问 `/admin/orders` → 验证 `<table>` 存在 |
| 6 | 积分管理页显示数据表 | 访问 `/admin/credits` → 验证 `<table>` 存在 |

### 侧边栏导航

| # | 测试名称 | 具体流程 |
|---|---------|---------|
| 7 | 侧边栏导航跨页面跳转 | 访问 `/admin` → 点击侧边栏 "Users" 链接 → 验证 URL 包含 `/admin/users` → 点击 "Orders" 链接 → 验证 URL 包含 `/admin/orders` |

### 用户详情管理

| # | 测试名称 | 具体流程 |
|---|---------|---------|
| 8 | 管理员从用户列表进入用户详情页 | 访问 `/admin/users` → 等待表格加载 → 点击第一行用户链接 → 验证 URL 匹配 `/admin/users/<id>` → 验证显示 "Edit User" 标题 |
| 9 | 管理员通过 API 获取用户详情 | 获取管理员 session → `GET /api/users/<adminId>` → 验证返回 200 → 验证 `id` 和 `email` 正确 |
| 10 | 管理员通过 API 更新用户信息 | 创建测试用户 → 重新登录管理员 → `PATCH /api/users/<testUserId>` 更新名称 → 验证返回 200 → `GET /api/users/<testUserId>` 验证名称已更新 |
| 11 | 非管理员用户无法访问用户详情 API | 创建普通用户 → `GET /api/users/<randomId>` → 验证返回 401 或 403 |

### 权限控制

| # | 测试名称 | 具体流程 |
|---|---------|---------|
| 12 | 非管理员用户访问管理面板被拒 | 使用全新浏览器上下文（未登录） → 访问 `/admin` → 验证被重定向到 `/signin` 或显示 "Access Denied" |

---

## 13. AI 对话（真实交互）

**文件：** `specs/ai-chat.spec.ts` ｜ **优先级：** P2

> ⚠️ **前置条件：**
> 1. 至少一个 AI 提供商的 API Key 已配置（如 Qwen、DeepSeek、OpenAI 等）
> 2. 积分通过 `seedCredits()` 在 `beforeAll` 中直接写入数据库（500 credits）

真实发送消息、验证 AI 回复、检查积分不足提示。

> 所有测试共用一个浏览器上下文（`beforeAll` 注册 + 种子积分），按串行顺序执行。

| # | 测试名称 | 具体流程 |
|---|---------|---------|
| 1 | 使用默认模型发送消息并获得回复 | API 注册用户 → `seedCredits(userId, 500)` → 访问 `/ai` → 等待页面渲染 → 点击 "New Chat" 清除示例消息 → 在 `<textarea>` 输入 "Hello, please respond with OK" → 点击 `button[aria-label="Submit"]` → 等待 `.is-user` 用户消息出现 → 等待 `.is-assistant` 助手消息出现 → 轮询直到助手消息文本非空（Streamdown 流式渲染） |
| 2 | 对话历史显示用户和助手消息正确排列 | 访问 `/ai` → 清除示例消息 → 输入 "Say the word PINEAPPLE" → 提交 → 等待用户和助手消息均出现 → 验证消息总数 ≥ 2 → 验证倒数第二条为 `.is-user`、最后一条为 `.is-assistant` |
| 3 | 积分不足时显示错误提示 | 新建浏览器上下文 → API 注册用户（不种子积分，余额为 0） → 访问 `/ai` → 清除示例消息 → 输入 "Hello" → 提交 → 验证 "Insufficient Credits" toast 或 `.bg-destructive/10` 错误区域出现 |

### 积分种子方式

```
beforeAll:
  signUpViaAPI → 获取 userId → seedCredits(userId, 500)
  
seedCredits 实现 (helpers/credits.ts):
  1. 连接 DATABASE_URL
  2. UPDATE user SET credit_balance = credit_balance + amount WHERE id = userId
  3. INSERT INTO credit_transaction (bonus 类型) 用于审计追踪
```

---

## 15. AI 图片生成（真实生成）

**文件：** `specs/ai-image-generate.spec.ts` ｜ **优先级：** P2

> ⚠️ **前置条件：**
> 1. 至少一个图片生成提供商的 API Key 已配置（当前使用 Qwen / Aliyun BaiLian）
> 2. 积分通过 `seedCredits()` 在 `beforeAll` 中直接写入数据库（500 credits）
> 3. 生成通常需要 5-15 秒，测试超时设置为 120 秒

真实调用 Qwen 图片生成 API，验证图片生成、下载、积分不足提示。

> 所有测试共用一个浏览器上下文（`beforeAll` 注册 + 种子积分），按串行顺序执行。

| # | 测试名称 | 具体流程 |
|---|---------|---------|
| 1 | 使用默认 Qwen 模型生成图片 | API 注册用户 → `seedCredits(userId, 500)` → 访问 `/image-generate` → 验证 `<h1>` 标题可见 → 验证 Provider 下拉框（`[role="combobox"]`）默认 "Aliyun BaiLian" → 验证 Model 下拉框默认 "Qwen Image 3.0 Pro" → 在 `<textarea>` 输入 "A cute cat sitting on a table" → 点击 "Generate" 按钮 → 等待成功 toast "Image generated successfully!" 出现（超时 60 秒） → 验证 `img[alt="Generated image"]` 可见 → 验证图片 `src` 非空 → 验证 "Download" 按钮可见 |
| 2 | 生成后可以下载图片 | 访问 `/image-generate` → 输入提示词 → 点击生成 → 等待成功 toast → 验证 "Download" 按钮可见且可用 → 点击下载 → 验证无错误发生 |
| 3 | 积分不足时显示错误提示 | 新建浏览器上下文 → API 注册用户（不种子积分，余额为 0） → 访问 `/image-generate` → 输入提示词 → 点击生成 → 验证 "Insufficient Credits" toast 出现 |

### 积分种子方式

```
beforeAll:
  signUpViaAPI → 获取 userId → seedCredits(userId, 500)
  
seedCredits 实现 (helpers/credits.ts):
  1. 连接 DATABASE_URL
  2. UPDATE user SET credit_balance = credit_balance + amount WHERE id = userId
  3. INSERT INTO credit_transaction (bonus 类型) 用于审计追踪
```

### 页面选择器参考

```
通过 agent-browser 探索发现的选择器：
  - h1: "AI Image Generation"
  - 积分显示: text "credits: <number>"
  - Provider 下拉框: [role="combobox"] (第1个) — 默认 "Aliyun BaiLian"
  - Model 下拉框: [role="combobox"] (第2个) — 默认 "Qwen Image 3.0 Pro"
  - 提示词输入: <textarea> placeholder="Describe the image you want to generate..."
  - 生成按钮: button 包含 "Generate" 文字
  - 结果区域: h2 "Result"，状态 "Idle" / "Generating..."
  - 生成图片: img[alt="Generated image"]
  - 下载按钮: button 包含 "Download" 文字
  - 成功 toast: Sonner 通知 "Image generated successfully!"
  - 积分不足 toast: "Insufficient Credits"
```

> **注意：** 视频生成测试暂不添加，因生成时间较长（通常 1-5 分钟），不适合自动化测试的超时设置。

---

## 16. 管理员子页面筛选功能测试

**文件：** `specs/admin-filters.spec.ts` ｜ **优先级：** P3

> 使用预置管理员账号 `admin@example.com` 登录。

验证各管理员子页面的搜索和下拉筛选功能。搜索功能通过 URL 参数导航验证页面状态（绕过 Vue `useVModel` 的反应性时序问题），下拉筛选通过 Radix/Reka combobox 交互验证 URL 更新。

> **实现说明：**
> - `goToPage` 等待 `networkidle` 确保 SSR 水合完成（避免点击时 Vue 事件处理器未挂载）
> - `pickFromCombobox` 使用重试循环 + Escape 关闭已打开的下拉框（处理 Radix UI overlay 阻塞）
> - Next.js 订阅页使用 `paymentType` 参数，Nuxt 使用 `provider` 参数（测试自动检测）

### A) 用户管理页筛选

| # | 测试名称 | 具体流程 |
|---|---------|---------|
| 1 | 搜索通过 URL 反映到页面状态 | 访问 `/admin/users?searchField=email&searchValue=admin&page=1` → 验证搜索输入框的值为 "admin" |
| 2 | 按角色筛选更新 URL | 访问 `/admin/users` → 在角色下拉框中选择 "Admin" → 等待 URL 包含 `role=admin` |
| 3 | 按封禁状态筛选更新 URL | 访问 `/admin/users` → 在封禁状态下拉框中选择 "Banned" → 等待 URL 包含 `banned=true` |
| 4 | 清除按钮重置所有筛选 | 访问带有多个筛选参数的 URL → 点击清除按钮 → 验证 URL 不再包含 `searchValue`、`role`、`banned` |

### B) 订阅管理页筛选

| # | 测试名称 | 具体流程 |
|---|---------|---------|
| 5 | 搜索通过 URL 反映到页面状态 | 访问 `/admin/subscriptions?searchField=userEmail&searchValue=test&page=1` → 验证搜索输入框值为 "test" |
| 6 | 按状态筛选更新 URL | 访问 `/admin/subscriptions` → 选择 "Active" → 等待 URL 包含 `status=active` |
| 7 | 第三筛选器更新 URL | 访问 `/admin/subscriptions` → 自动检测第三筛选器类型 → Next.js: 选择 "Recurring" → 验证 `paymentType=recurring`；Nuxt: 选择 "Stripe" → 验证 `provider=stripe` |

### C) 订单管理页筛选

| # | 测试名称 | 具体流程 |
|---|---------|---------|
| 8 | 按状态筛选更新 URL | 访问 `/admin/orders` → 选择 "Paid" → 等待 URL 包含 `status=paid` |
| 9 | 按提供商筛选更新 URL | 访问 `/admin/orders` → 选择 "Stripe" → 等待 URL 包含 `provider=stripe` |
| 10 | 组合筛选全部出现在 URL | 访问 `/admin/orders` → 选择 "Paid" → 再选择 "Stripe" → 验证 URL 同时包含 `status=paid` 和 `provider=stripe` |

### D) 积分管理页筛选

| # | 测试名称 | 具体流程 |
|---|---------|---------|
| 11 | 按类型筛选更新 URL | 访问 `/admin/credits` → 选择 "Purchase" → 等待 URL 包含 `type=purchase` |
| 12 | 搜索通过 URL 反映到页面状态 | 访问 `/admin/credits?searchField=userEmail&searchValue=admin&page=1` → 验证搜索输入框值为 "admin" |
| 13 | 清除按钮重置筛选 | 访问带有筛选参数的 URL → 点击清除按钮 → 验证 URL 不再包含 `searchValue`、`type` |

---

## 待实现的测试 (Backlog)

以下是已规划但尚未实现的测试用例。按优先级排列，实现后应迁移到上方对应章节。

### 17. Creem 支付流程测试

**计划文件：** `specs/creem-payment.spec.ts` ｜ **优先级：** P1

> ⚠️ **前置条件：**
> 1. `.env` 中配置了 Creem 测试模式的 API Key 和 Webhook Secret
> 2. Creem webhook 转发已配置到 `localhost:7001/api/payment/webhook/creem`
> 3. Creem 产品已创建并配置了 `creemProductId`

Creem 与 Stripe 流程类似，都是页面跳转到托管 Checkout 页面完成支付，通过 webhook 回调通知后端。

#### A) 订阅购买流程

| # | 测试名称 | 具体流程 |
|---|---------|---------|
| 1 | 点击 Creem 订阅计划跳转到 Checkout | API 注册用户 → 打开定价页 → 找到 "Creem Monthly Plan" 标题 → 点击 CTA 按钮 → 等待 URL 跳转到 Creem Checkout 页面 |
| 2 | 完成 Creem 订阅支付 | 跳转到 Creem Checkout → 填写测试卡信息（Creem 测试模式下的测试卡号） → 点击支付按钮 → 等待重定向回 `/payment-success?provider=creem` |
| 3 | 仪表盘显示订阅详情 | 访问 `/dashboard` → 点击"订阅"标签 → 验证 "Creem Monthly Plan" 计划名称可见 → 验证 Active 状态可见 |

#### B) 一次性购买流程

| # | 测试名称 | 具体流程 |
|---|---------|---------|
| 4 | 点击 Creem 一次性计划跳转到 Checkout | 打开定价页 → 找到 "Creem Monthly Plan (One Time)" 标题 → 点击 CTA 按钮 → 等待 URL 跳转到 Creem Checkout |
| 5 | 完成 Creem 一次性支付 | 完成支付流程 → 验证重定向回 `/payment-success?provider=creem` |

#### Creem 支付链路图

```
用户登录
  ↓
打开 /pricing 定价页
  ↓
点击 "Creem Monthly Plan" 的 CTA 按钮
  ↓
前端调用 POST /api/payment/initiate { planId: 'monthlyCreem', provider: 'creem' }
  ↓
后端通过 Creem SDK 创建 Checkout Session → 返回 checkoutUrl
  ↓
浏览器跳转到 Creem Checkout 页面
  ↓
用户填写卡信息并支付
  ↓
Creem 处理支付 → 重定向到 /payment-success?provider=creem
  ↓
Creem 发送 webhook (checkout.completed / subscription.active)
  → 后端更新订单 → 创建/更新订阅
  ↓
用户在仪表盘查看订阅状态
```

---

## 18. PayPal 支付流程测试

**文件：** `specs/paypal-payment.spec.ts` ｜ **优先级：** P2

> ⚠️ **前置条件：**
> 1. `.env` 中配置了 PayPal **沙盒** Client ID 和 Secret（`PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`）
> 2. `.env` 中配置了沙盒买家账号（`PAYPAL_E2E_USER_NAME`, `PAYPAL_E2E_USER_PWD`）
> 3. `PAYPAL_SANDBOX="true"` 已设置
> 4. 沙盒环境的 Plan ID 已配置在 `config/payment.ts`（`paypalPlanId`）

PayPal 使用沙盒账户测试，用户跳转到 PayPal 授权页面，使用沙盒买家账号登录并确认支付。每个流程使用独立的浏览器上下文和用户，避免状态泄漏。

> 如果 `PAYPAL_E2E_USER_NAME` / `PAYPAL_E2E_USER_PWD` 未配置，所有测试自动跳过。

#### A) 一次性支付（One-time）

> 所有测试共用一个浏览器上下文（`beforeAll` 注册），按串行顺序执行。

| # | 测试名称 | 具体流程 |
|---|---------|---------|
| 1 | 点击 PayPal 一次性计划跳转到 PayPal | API 注册用户 → 打开定价页 → 找到 "PayPal Monthly (One Time)" 标题 → 点击 CTA 按钮 → 等待 URL 跳转到 `sandbox.paypal.com` |
| 2 | 完成 PayPal 一次性支付并看到成功页 | 跳转到 PayPal → 使用沙盒买家账号登录（email → Next → password → Log In） → 点击 "完成购物" / "Pay Now" 按钮 → 等待重定向回 `/payment-success?provider=paypal` → 验证 `<h1>` 标题和 dashboard 链接可见 |
| 3 | 仪表盘订阅标签显示 PayPal 计划 | 访问 `/dashboard` → 点击"Subscription"标签 → 验证 "PayPal Monthly" 计划名称可见（或 "No Active Subscription" 如 webhook 未处理） → 如有计划则验证 "Active" 状态可见 |

#### B) 循环订阅（Recurring）

> 使用独立浏览器上下文和用户。

| # | 测试名称 | 具体流程 |
|---|---------|---------|
| 4 | 点击 PayPal 订阅计划跳转到 PayPal | API 注册用户 → 打开定价页 → 找到 "PayPal Monthly Plan" 标题 → 点击 CTA → 等待跳转到 `sandbox.paypal.com`（PayPal 订阅确认页面） |
| 5 | 完成 PayPal 订阅并看到成功页 | 使用沙盒买家账号登录 → 点击 "同意并订阅" / "Agree & Subscribe" 按钮（PayPal 订阅页面使用 iframe/Web Component 渲染，需跨 frame 搜索按钮） → 等待重定向回 `/payment-success?provider=paypal` |

#### C) 积分购买

> 使用独立浏览器上下文和用户。

| # | 测试名称 | 具体流程 |
|---|---------|---------|
| 6 | 完成 PayPal 积分购买并看到成功页 | API 注册用户 → 打开定价页 → 切换到"积分充值"标签 → 找到 "100 Credits PayPal" → 点击 CTA → 在 PayPal 沙盒完成支付 → 验证重定向回 `/payment-success?provider=paypal` |
| 7 | 仪表盘积分余额更新 | 访问 `/dashboard` → 点击"Credits"标签 → 轮询最多 6 次（每次间隔 10s）等待 webhook 处理 → 验证可用积分 ≥ 100 → 验证累计购买 ≥ 100 |

#### PayPal 支付链路图

```
用户登录
  ↓
打开 /pricing 定价页
  ↓
点击 "PayPal Monthly (One Time)" 的 CTA 按钮
  ↓
前端调用 POST /api/payment/initiate { planId: 'monthlyPaypalOneTime', provider: 'paypal' }
  ↓
后端调用 PayPal API 创建 Order → 获取 approve URL
  ↓
浏览器跳转到 sandbox.paypal.com（授权页面）
  ↓
用户使用沙盒买家账号登录 → 点击 "Pay Now" / "完成购物"
  ↓
PayPal 重定向到 /api/payment/return/paypal?order_id=xxx&token=xxx&PayerID=xxx
  ↓
后端自动 capture 订单 → 更新订单状态 → 创建订阅
  ↓
重定向到 /payment-success?provider=paypal
  ↓
用户在仪表盘查看订阅/积分状态
```

#### PayPal 沙盒页面选择器参考

```
通过 agent-browser 探索发现的选择器：

一次性支付 (Orders API) 登录页面:
  - 邮箱输入: #email (textbox "Email or mobile number")
  - 下一步按钮: #btnNext (button "Next")
  - 密码输入: #password (textbox "Password")
  - 登录按钮: #btnLogin (button "Log In")

一次性支付审批页面 (sandbox.paypal.com/checkoutnow):
  - PayPal 余额: radio "PayPal余额 首选" (默认选中)
  - 信用卡: radio "Visa 信用卡 ••••0522"
  - 支付按钮: button "完成购物" / "Pay Now" / "Complete Purchase"
  - 取消链接: link "取消并返回TinyShip"

订阅支付审批页面 (sandbox.paypal.com/webapps/hermes):
  ⚠️ 内容在 iframe 中渲染，需使用 frame.getByRole('button', ...) 搜索
  - 审批按钮: button "同意并订阅" / "Agree & Subscribe"
  - 取消按钮: button "取消并返回到TinyShip"

注意：PayPal 可能记住登录状态，跳过 email/password 步骤直接到审批页面。
测试代码需处理两种场景（全新登录 vs 已登录）。
```

---

### 19. 支付宝支付流程测试

**计划文件：** `specs/alipay-payment.spec.ts` ｜ **优先级：** P2

> ⚠️ **前置条件：**
> 1. `.env` 中配置了支付宝**沙盒**环境的 App ID、私钥和公钥
> 2. 支付宝沙盒环境已开通（参考 [支付宝沙盒文档](https://opendocs.alipay.com/open/00dn7o)）
> 3. `ALIPAY_SANDBOX=true` 已设置
> 4. 沙盒买家账号已准备好

支付宝使用 PC 网站支付（`alipay.trade.page.pay`），用户跳转到支付宝页面完成支付，支付宝通过异步通知（notify_url）回调后端。

#### A) 订阅购买

| # | 测试名称 | 具体流程 |
|---|---------|---------|
| 1 | 点击支付宝计划跳转到支付宝 | API 注册用户 → 打开定价页 → 找到 "Alipay Monthly Plan / 支付宝月度" 标题 → 点击 CTA 按钮 → 等待 URL 跳转到 `alipay.com` 或 `alipaydev.com`（沙盒） |
| 2 | 在支付宝沙盒中完成支付 | 跳转到支付宝页面 → 使用沙盒买家账号登录并支付 → 等待重定向回 `/payment-success?provider=alipay` |
| 3 | 异步通知处理后仪表盘更新 | 支付宝发送异步通知到 `/api/payment/webhook/alipay` → 后端验签并更新订单 → 用户访问仪表盘验证订阅状态 |

#### 支付宝支付链路图

```
用户登录
  ↓
打开 /pricing 定价页
  ↓
点击 "Alipay Monthly Plan" 的 CTA 按钮
  ↓
前端调用 POST /api/payment/initiate { planId: 'monthlyAlipay', provider: 'alipay' }
  ↓
后端调用 alipay.trade.page.pay → 生成支付页面 URL
  ↓
浏览器跳转到 alipay.com / alipaydev.com（支付宝页面）
  ↓
用户登录沙盒买家账号 → 确认支付
  ↓
支付宝同步跳转到 /payment-success?provider=alipay
  ↓
同时支付宝异步通知 → POST /api/payment/webhook/alipay
  ↓
后端验签 → 更新订单状态 → 创建订阅
  ↓
用户在仪表盘查看订阅状态
```

> **注意：** 微信支付使用 Native 扫码支付（二维码），不适合 Playwright 自动化测试（无法模拟扫码），暂不计划添加。

---

### 20. 博客功能测试

**计划文件：** `specs/blog.spec.ts` ｜ **优先级：** P2

> ⚠️ **前置条件：**
> 1. 数据库已推送 `blog_post` 表（`pnpm db:push`）
> 2. 预置管理员账号 `admin@example.com` 可用

验证博客功能的完整流程：管理员创建/编辑/删除博客文章，公共页面展示已发布文章，权限控制。

> 管理员测试使用预置账号 `admin@example.com`（非测试创建，不会被 teardown 清理）。

#### A) 管理员博客管理

> 所有测试共用一个浏览器上下文（管理员登录），按串行顺序执行。

| # | 测试名称 | 具体流程 |
|---|---------|---------|
| 1 | 管理员侧边栏显示博客入口 | 用管理员账号 API 登录 → 访问 `/admin` → 验证侧边栏包含 "Blog" 链接 → 点击链接 → 验证 URL 包含 `/admin/blog` |
| 2 | 博客列表页加载并显示数据表 | 访问 `/admin/blog` → 验证页面标题可见 → 验证 `<table>` 存在 → 验证 "New Post" 按钮可见 |
| 3 | 创建新博客文章 | 点击 "New Post" 按钮 → 验证 URL 包含 `/admin/blog/new` → 填写标题 "E2E Test Post" → 验证 slug 自动生成 → 填写摘要 → 在 Markdown 编辑器中输入内容 → 选择状态为 "Published" → 点击保存 → 等待重定向到 `/admin/blog` → 验证列表中出现 "E2E Test Post" |
| 4 | 编辑已有博客文章 | 在列表中找到 "E2E Test Post" → 点击编辑按钮 → 验证 URL 包含 `/admin/blog/` → 修改标题为 "E2E Test Post Updated" → 点击保存 → 等待重定向到列表 → 验证列表中标题已更新 |
| 5 | 删除博客文章 | 在列表中找到 "E2E Test Post Updated" → 点击删除按钮 → 验证确认对话框出现 → 点击确认删除 → 验证文章从列表中消失 |
| 6 | 非管理员用户无法访问博客管理页 | 新建浏览器上下文 → 注册普通用户 → 访问 `/admin/blog` → 验证被重定向到 `/signin` 或返回 403 |

#### B) 公共博客页面

> 需要先通过 API 创建一篇已发布和一篇草稿文章用于测试。

| # | 测试名称 | 具体流程 |
|---|---------|---------|
| 7 | 博客列表页加载并显示已发布文章 | 访问 `/blog` → 验证页面标题可见 → 验证至少有一篇文章卡片可见 → 验证卡片包含标题、摘要、日期 |
| 8 | 草稿文章不在公共页面显示 | 访问 `/blog` → 验证页面上不包含草稿文章的标题 |
| 9 | 博客详情页正确渲染 Markdown 内容 | 在博客列表点击文章卡片 → 验证 URL 包含 `/blog/` → 验证文章标题可见 → 验证作者信息可见 → 验证发布日期可见 → 验证 Markdown 内容已渲染（检查 `<h1>`/`<p>`/`<code>` 等 HTML 元素） |

#### C) 公共导航

| # | 测试名称 | 具体流程 |
|---|---------|---------|
| 10 | 网站头部导航包含博客链接 | 打开首页 `/` → 验证 `<header>` 中包含 "Blog" 链接 → 点击链接 → 验证 URL 包含 `/blog` |

#### 博客管理完整链路图

```
管理员登录
  ↓
打开 /admin/blog 博客管理页
  ↓
点击 "New Post" 按钮
  ↓
填写标题（自动生成 slug）、摘要、Markdown 内容、状态
  ↓
点击保存 → POST /api/admin/blog
  ↓
后端创建 blog_post 记录 → 重定向到列表
  ↓
已发布文章自动出现在 /blog 公共页面
  ↓
用户访问 /blog → 看到文章列表
  ↓
点击文章 → /blog/[slug] → Markdown 渲染展示
```

---

## 21. 推荐返利系统测试

**文件：** `specs/affiliate.spec.ts` ｜ **优先级：** P1

验证推荐返利系统的用户侧完整流程：推荐码生成、推荐链接 cookie 捕获、推荐码领取、仪表盘推荐标签页展示、提现请求。

> 需要显式配置 `AFFILIATE_ENABLED=true`（默认关闭）。

### A) 推荐码生成与仪表盘 API

> 所有测试共用一个浏览器上下文（`beforeAll` 注册），按串行顺序执行。

| # | 测试名称 | 具体流程 |
|---|---------|---------|
| 1 | 推荐统计 API 返回推荐码和链接 | API 注册用户 → `GET /api/affiliate/stats` → 验证返回 200 → 验证响应包含 `referralCode`（8 字符）、`referralLink`（含 `?ref=`）、`commissionBalance`（≥ 0）、`commissionRate`（> 0）、`enabled`（true） |
| 2 | 推荐统计 API 多次调用返回相同推荐码 | 同一用户连续调用两次 `GET /api/affiliate/stats` → 验证两次返回的 `referralCode` 完全相同（幂等性） |

### B) 推荐链接 Cookie 捕获

| # | 测试名称 | 具体流程 |
|---|---------|---------|
| 3 | 访问带 ?ref= 的 URL 设置推荐 cookie | 新建浏览器上下文（未登录） → 访问 `/?ref=TESTCODE123` → 等待页面加载 → 验证浏览器 cookie 中存在 `referral_code=TESTCODE123` → 验证 URL 不再包含 `ref=` 参数 |

### C) 推荐码领取流程

| # | 测试名称 | 具体流程 |
|---|---------|---------|
| 4 | 完整推荐领取流程 | 用户 A（推荐人）API 注册 → `GET /api/affiliate/stats` 获取推荐码 → 新建浏览器上下文 → 访问 `/?ref={推荐码}` → 用户 B（被推荐人）API 注册 → `POST /api/affiliate/claim` → 验证返回 200 且 `applied` 为 true → 验证用户 A 的 `GET /api/affiliate/referrals` 返回 1 条记录 |
| 5 | 无推荐码时领取返回正常 | API 注册用户（无 cookie） → `POST /api/affiliate/claim` → 验证返回 200 且 `applied` 为 false 或 `noCode` 为 true |

### D) 仪表盘推荐标签页 UI

| # | 测试名称 | 具体流程 |
|---|---------|---------|
| 6 | 仪表盘显示推荐标签页 | API 注册用户 → 访问 `/dashboard` → 验证页面上有 "Affiliate" 或 "推荐" 标签按钮可见 → 点击该标签 → 验证推荐统计区域可见（佣金余额、佣金比例等） → 验证推荐链接输入框可见 |
| 7 | 仪表盘显示提现标签页 | 访问 `/dashboard` → 验证页面上有 "Withdrawal" 或 "提现" 标签按钮可见 → 点击该标签 → 验证提现表单可见（金额输入框、支付方式选择） |

### E) 提现请求

| # | 测试名称 | 具体流程 |
|---|---------|---------|
| 8 | 余额不足时提现失败 | API 注册用户 → `POST /api/withdrawal/request` body: `{ amount: "100", paymentMethod: "alipay", paymentAccount: "test@test.com" }` → 验证返回 400 且包含余额不足错误信息 |

### 推荐返利完整链路图

```
用户 A 注册
  ↓
GET /api/affiliate/stats → 生成推荐码 (lazy-generate)
  ↓
用户 A 分享推荐链接 example.com/?ref=ABCD1234
  ↓
用户 B 点击链接 → 中间件设置 referral_code cookie (30天)
  ↓
URL 参数 ?ref= 被自动清除
  ↓
用户 B 注册/登录
  ↓
前端调用 POST /api/affiliate/claim
  ↓
后端: user B.referredByCode = ABCD1234
  ↓
如果配置了 refereeSignupBonus > 0: 给用户 B 加积分
如果配置了 referrerSignupBonus > 0: 给用户 A 加积分
  ↓
用户 B 购买任何计划 → payment webhook 触发
  ↓
processReferralCommission → 计算佣金 → 写入 commission 表 → 增加用户 A 的 commissionBalance
  ↓
用户 A 在仪表盘"推荐"标签页看到佣金余额和推荐列表
  ↓
用户 A 在"提现"标签页提交提现申请
  ↓
管理员在 /admin/withdrawals 审批提现
```

---

## 22. 管理员返利管理测试

**文件：** `specs/admin-affiliate.spec.ts` ｜ **优先级：** P2

> 使用预置管理员账号 `admin@example.com` 登录。
> 依赖 `libs/database/seed.ts` 中的推广返利测试数据（3 个邀请用户, 3 条佣金记录, 2 条提现记录）。

验证管理员后台的佣金管理、提现管理页面，以及用户列表中推荐相关列的展示。

### A) 管理员佣金管理页

| # | 测试名称 | 具体流程 |
|---|---------|---------|
| 1 | 佣金管理页加载并显示表格 | 用管理员账号 API 登录 → 访问 `/admin/commissions` → 验证页面标题 "Commission Records" 或 "佣金记录" 可见 → 验证 `<table>` 存在 |
| 2 | 佣金管理页有搜索字段下拉框 | 访问 `/admin/commissions` → 验证 `[role="combobox"]` 搜索字段下拉框可见 → 验证搜索输入框可见 |
| 3 | 佣金管理页搜索无报错 | 访问 `/admin/commissions` → 在搜索框输入 "admin" → 等待 1s → 验证页面标题仍然可见（页面未崩溃） |
| 4 | 佣金管理页有状态筛选 | 访问 `/admin/commissions` → 验证 `[role="combobox"]` 数量 ≥ 2（搜索字段 + 状态筛选） |

### B) 管理员提现管理页

| # | 测试名称 | 具体流程 |
|---|---------|---------|
| 5 | 提现管理页加载并显示表格 | 访问 `/admin/withdrawals` → 验证页面标题 "Withdrawal Requests" 或 "提现管理" 可见 → 验证 `<table>` 存在或显示空状态提示 |
| 6 | 提现管理页有搜索字段下拉框 | 访问 `/admin/withdrawals` → 验证 `[role="combobox"]` 搜索字段下拉框可见 → 验证搜索输入框可见 |
| 7 | 提现管理页搜索无报错 | 访问 `/admin/withdrawals` → 在搜索框输入 "admin" → 等待 1s → 验证页面标题仍然可见 |
| 8 | 提现管理页有状态筛选 | 访问 `/admin/withdrawals` → 验证 `[role="combobox"]` 数量 ≥ 2 |

### C) 管理员侧边栏导航

| # | 测试名称 | 具体流程 |
|---|---------|---------|
| 9 | 侧边栏包含佣金和提现入口 | 访问 `/admin` → 验证侧边栏包含 "Commissions" 或 "佣金管理" 链接 → 验证侧边栏包含 "Withdrawals" 或 "提现管理" 链接 |

### D) 用户管理页推荐列

| # | 测试名称 | 具体流程 |
|---|---------|---------|
| 10 | 用户列表视图筛选包含推荐列 | 访问 `/admin/users` → 等待表格加载 → 点击 "视图"/"View" 按钮 → 验证下拉菜单包含 "Referral Code/推荐码"、"Referred By/邀请人"、"Commission Balance/佣金余额" 三项 |
| 11 | 推荐列可以切换显示 | 访问 `/admin/users` → 点击 "视图" → 点击 "推荐码" 菜单项 → 关闭下拉 → 验证表头出现 "Referral Code/推荐码" |

### E) 用户管理 API 推荐信息

| # | 测试名称 | 具体流程 |
|---|---------|---------|
| 12 | 用户 API 返回推荐人信息 | `GET /api/admin/users?limit=50` → 验证返回 200 → 找到 `referredByCode` 非空的用户 → 验证该用户的 `referredBy` 对象包含 `email` 字段（即推荐码已被解析为实际用户信息） |

---

## 23. 推荐佣金支付全流程测试

**文件：** `specs/affiliate-commission.spec.ts` ｜ **优先级：** P0

> ⚠️ **前置条件：**
> 1. 开发服务器在 7001 端口运行
> 2. `stripe listen --forward-to localhost:7001/api/payment/webhook/stripe` 正在运行
> 3. `.env` 中配置了 Stripe 测试模式的 API Key
> 4. 显式配置 `AFFILIATE_ENABLED=true`（默认关闭）

验证推荐返利系统的完整支付链路：推荐人分享 → 被推荐人注册 → 被推荐人通过 Stripe 购买 → Webhook 触发佣金计算 → 推荐人余额增加。

这是捕获集成 bug（如 metadata 覆盖导致推荐信息丢失）的关键端到端测试。

> 所有测试共用浏览器上下文，按串行顺序执行。整体超时 3 分钟（含 Stripe + Webhook 处理）。

| # | 测试名称 | 具体流程 |
|---|---------|---------|
| 1 | 被推荐人完成 Stripe 积分购买 | `beforeAll`: 用户 A（推荐人）API 注册 → `GET /api/affiliate/stats` 获取推荐码和初始余额 → 用户 B（被推荐人）设置 `referral_code` cookie → API 注册 → `POST /api/affiliate/claim` 领取推荐码 → **测试体**: 用户 B 打开定价页 → 切换到「积分充值」标签 → 找到 "100 Credits Stripe" → 点击 CTA → 跳转到 Stripe Checkout → 填写测试卡 `4242 4242 4242 4242` → 提交支付 → 验证重定向回 `/payment-success?provider=stripe` |
| 2 | 推荐人佣金余额增加 | 轮询用户 A 的 `GET /api/affiliate/stats`（最多 12 次，每次间隔 5s）→ 验证 `commissionBalance` 大于初始余额（$5 × 20% = $1.00 佣金） |
| 3 | 推荐人仪表盘显示佣金统计 | 用户 A 访问 `/dashboard` → 点击 "Affiliate" 标签 → 验证 "Commission Balance" 可见 → 通过 API 验证 `totalRegisteredReferrals ≥ 1` 且 `totalPaidReferrals ≥ 1` |
| 4 | 佣金记录包含购买用户信息 | `GET /api/affiliate/commissions?limit=10` → 验证返回 ≥ 1 条佣金记录 → 最新记录包含 `buyer.email`（含 @）、`orderAmount`、`commissionAmount > 0` |

### 推荐佣金完整链路图

```
用户 A（推荐人）注册
  ↓
GET /api/affiliate/stats → 获取推荐码 + 记录初始佣金余额
  ↓
用户 B（被推荐人）设置 referral_code cookie
  ↓
用户 B 注册 → POST /api/affiliate/claim → referredByCode 写入用户 B
  ↓
用户 B 打开 /pricing → 选择 "100 Credits Stripe" ($5)
  ↓
POST /api/payment/initiate → 创建订单
  → 查询用户 B 的 referredByCode → 解析推荐人 ID
  → 订单 metadata = { referralCode, referrerId, ...stripeMetadata }
  ↓
跳转到 checkout.stripe.com → 填写测试卡 → 支付
  ↓
Stripe 发送 webhook → stripe listen 转发到 /api/payment/webhook/stripe
  ↓
后端处理 webhook → processReferralCommission(orderId)
  → 读取订单 metadata.referrerId
  → 计算佣金 ($5 × 20% = $1.00)
  → 写入 commission 表
  → 增加用户 A 的 commissionBalance
  ↓
轮询用户 A 的 /api/affiliate/stats → 验证余额增加
  ↓
用户 A 仪表盘 → Affiliate 标签 → 看到佣金和推荐统计
```

---

## 24. 管理员动态定价管理测试

**文件：** `specs/admin-pricing.spec.ts` ｜ **优先级：** P2

> 使用预置管理员账号 `admin@example.com` 登录。

验证管理员后台的动态定价管理功能：列表页加载、创建/编辑/删除方案、导入静态配置、权限控制。不需要种子数据，测试中创建的方案在 afterAll 中自动清理。

### A) 列表页

| # | 测试名称 | 具体流程 |
|---|---------|---------|
| 1 | 定价列表页加载并显示操作按钮 | 用管理员账号 API 登录 → 访问 `/admin/pricing` → 验证 "Pricing Plans" 标题可见 → 验证 "Create Plan" 链接可见 → 验证 "Import" 按钮可见 → 验证 "Subscription" / "Credits" 标签切换按钮可见 |
| 2 | 订阅/积分标签切换 | 访问 `/admin/pricing` → 点击 "Credits" 标签 → 验证 URL 仍为 `/admin/pricing` → 点击 "Subscription" 标签 → 验证 URL 正确 |

### B) 创建方案

| # | 测试名称 | 具体流程 |
|---|---------|---------|
| 3 | 创建方案页加载并显示分组卡片 | 访问 `/admin/pricing/new` → 验证 "Create Plan" 标题可见 → 验证 "Plan Information"、"Pricing"、"Provider Configuration"、"Display Settings" 四个区块可见 → 验证返回链接可见 |
| 4 | 创建新定价方案 | 填写英文名称/描述/时长标签/功能特性 → 切换到中文标签填写 → 输入金额 9.99 → 点击保存 → 验证重定向回列表页 |
| 5 | 新建方案出现在列表中 | 访问列表页 → 验证刚创建的方案名称可见 |

### C) 编辑方案

| # | 测试名称 | 具体流程 |
|---|---------|---------|
| 6 | 编辑页加载并显示已有数据 | 在列表页找到方案 → 点击编辑按钮 → 验证 URL 匹配 `/admin/pricing/<id>` → 验证 "Edit Plan" 标题可见 → 验证名称输入框包含正确值 |
| 7 | 更新方案名称 | 编辑页清空名称 → 输入新名称 → 保存 → 验证重定向回列表 → 验证新名称可见 |

### D) 切换激活状态

| # | 测试名称 | 具体流程 |
|---|---------|---------|
| 8 | 切换方案激活开关 | 在列表页找到方案行 → 点击 Switch → 等待 API 响应 → 验证状态改变 → 点击复原 |

### E) 删除方案

| # | 测试名称 | 具体流程 |
|---|---------|---------|
| 9 | 删除方案后从列表消失 | 接受确认对话框 → 点击方案行的删除按钮 → 等待删除 → 验证方案不再显示 |

### F) 导入静态配置

| # | 测试名称 | 具体流程 |
|---|---------|---------|
| 10 | 通过 API 导入静态配置方案 | POST `/api/admin/pricing-plans/import` → 验证返回 200 → 验证 `imported ≥ 0` |

### G) 表单交互

| # | 测试名称 | 具体流程 |
|---|---------|---------|
| 11 | 提供商配置区块根据所选提供商显示对应字段 | 默认 Stripe → 验证 "Stripe Price ID" 可见 → 切换到 WeChat → 验证显示 "无需额外配置" 提示 |
| 12 | i18n 标签切换保持各语言数据独立 | 英文标签填写名称 → 切换到中文标签 → 验证名称为空 → 填写中文名称 → 切回英文 → 验证英文名称恢复 |

### H) 权限控制

| # | 测试名称 | 具体流程 |
|---|---------|---------|
| 13 | 非管理员用户无法访问定价管理页 | 未登录访问 `/admin/pricing` → 验证重定向到 `/signin` 或返回 403 |
| 14 | 非管理员用户无法访问定价管理 API | 未认证调用 `GET /api/admin/pricing-plans` → 验证返回 401 或 403 |

---

## 25. Waffo 支付流程测试

**文件：** `specs/waffo-payment.spec.ts` ｜ **优先级：** P1 ｜ **需要登录 + Waffo Test API Key + Webhook 隧道**

> 前置条件：
> 1. 开发服务器运行在 7001 端口
> 2. 公网隧道转发到 `/api/payment/webhook/waffo`
> 3. `.env` 已配置 `WAFFO_MERCHANT_ID`、`WAFFO_PRIVATE_KEY`（Test 环境密钥）
> 4. 动态模式：`pricing_plan` 中已有真实 `PROD_xxx`；静态模式：`config/payment.ts` 的 `waffoProductId` 已替换
> 5. 完整结账用例需设置 `E2E_WAFFO_COMPLETE=true`

测试卡：`4576 7500 0000 0110`

| # | 测试名称 | 具体流程 |
|---|---------|---------|
| 1 | 订阅跳转 Waffo Checkout | API 注册 → 定价页点击 Waffo Monthly Plan → 验证跳转到 `checkout.waffo.ai` |
| 2 | 一次性跳转 Waffo Checkout | API 注册 → 点击 Waffo Monthly Plan (One Time) → 验证跳转到 Waffo |
| 3 | 积分包跳转 Waffo Checkout | API 注册 → 切换积分 Tab → 点击 100 Credits Waffo → 验证跳转到 Waffo |
| 4 | 完成订阅结账 | 跳转 Checkout → 使用测试卡支付 → 验证回到 `/payment-success`（需 webhook 隧道） |

---

### Backlog 优先级汇总

| 优先级 | 编号 | 测试名称 | 前置条件 | 预计用例数 |
|--------|------|----------|----------|-----------|
| P2 | 19 | 支付宝支付流程 | 支付宝沙盒 App ID/密钥 + 沙盒买家账号 | 3 |
| ✅ | 20 | 博客功能 | blog_post 表已创建 + 管理员账号 | 11 |

---

## 测试结果追踪

每次运行后在此记录结果：

| 日期 | 应用 | 通过 | 失败 | 跳过 | 备注 |
|------|------|------|------|------|------|
| 2026-02-25 | Next.js | 35 | 0 | 0 | 全部通过（含 Stripe 支付） |
| 2026-03-04 | Next.js | 3 | 0 | 0 | AI Chat 真实交互（ai-chat.spec.ts） |
| 2026-03-06 | Next.js | 3 | 0 | 0 | AI Image Generation 真实生成（ai-image-generate.spec.ts） |
| 2026-03-06 | Nuxt.js | 3 | 0 | 0 | AI Image Generation 真实生成（ai-image-generate.spec.ts） |
| 2026-03-06 | Next.js | 5 | 0 | 0 | Creem 支付流程（creem-payment.spec.ts） |
| 2026-03-06 | Nuxt.js | 5 | 0 | 0 | Creem 支付流程（creem-payment.spec.ts） |
| 2026-03-06 | Next.js | 7 | 0 | 0 | PayPal 支付流程（paypal-payment.spec.ts） |
| 2026-03-06 | Nuxt.js | 7 | 0 | 0 | PayPal 支付流程（paypal-payment.spec.ts） |
| 2026-03-08 | Nuxt.js | 88 | 0 | 0 | **全量回归** — 全部通过（5m19s） |
| 2026-03-08 | Next.js | 88 | 0 | 0 | **全量回归** — 全部通过（6m00s） |
| 2026-03-09 | Nuxt.js | 11 | 0 | 0 | 博客功能（blog.spec.ts）— 全部通过（16.6s） |
| 2026-03-09 | Next.js | 11 | 0 | 0 | 博客功能（blog.spec.ts）— 全部通过（43.4s） |
| 2026-03-09 | Nuxt.js | 11 | 0 | 0 | 博客增强后回归（blog.spec.ts）— 全部通过（15.9s） |
| 2026-03-09 | Next.js | 11 | 0 | 0 | 博客增强后回归（blog.spec.ts）— 全部通过（55.5s） |
| 2026-04-27 | Next.js | 105 | 0 | 0 | **SQLite/D1 分支全量回归 (PG)** — 全部通过（7.4m） |
| 2026-04-27 | Nuxt.js | 96 | 2 | 0 | **SQLite/D1 分支全量回归 (PG)** — 2 个超时 flaky（admin-panel 导航 + blog 创建）（7.4m） |
| 2026-04-27 | TanStack | 105 | 0 | 0 | **SQLite/D1 分支全量回归 (PG)** — 全部通过（6.5m） |
| 2026-04-28 | Next.js | 103 | 1 | 0 | **SQLite/D1 分支全量回归 (SQLite)** — 1 个 PayPal 沙盒超时（9.4m） |
| 2026-04-28 | Nuxt.js | 92 | 2 | 2 | **SQLite/D1 分支全量回归 (SQLite)** — 1 个 admin-filters flaky + 1 个 PayPal 沙盒超时（8.4m） |
| 2026-04-28 | TanStack | 103 | 1 | 0 | **SQLite/D1 分支全量回归 (SQLite)** — 1 个 PayPal 沙盒超时（8.3m） |
| 2026-05-26 | Next.js | 20 | 0 | 0 | **返利管理增强 (PG)** — affiliate + admin-affiliate 全部通过（1.5m） |
| 2026-05-26 | TanStack | 20 | 0 | 0 | **返利管理增强 (PG)** — affiliate + admin-affiliate 全部通过（49s） |
| 2026-05-26 | Nuxt.js | 20 | 0 | 0 | **返利管理增强 (PG)** — affiliate + admin-affiliate 全部通过（40s） |
| 2026-05-26 | Next.js | 20 | 0 | 0 | **返利管理增强 (SQLite)** — affiliate + admin-affiliate 全部通过（1.5m） |
| 2026-05-26 | TanStack | 20 | 0 | 0 | **返利管理增强 (SQLite)** — affiliate + admin-affiliate 全部通过（31s） |
| 2026-05-26 | Nuxt.js | 20 | 0 | 0 | **返利管理增强 (SQLite)** — affiliate + admin-affiliate 全部通过（30s） |
| 2026-05-26 | Next.js | 4 | 0 | 0 | **推荐佣金支付全流程 (PG)** — affiliate-commission 全部通过（52s） |
| 2026-05-26 | TanStack | 4 | 0 | 0 | **推荐佣金支付全流程 (PG)** — affiliate-commission 全部通过（59s） |
| 2026-05-26 | Nuxt.js | 4 | 0 | 0 | **推荐佣金支付全流程 (PG)** — affiliate-commission 全部通过（33s） |
| 2026-08-24 | Next.js | 6 | 0 | 0 | AI 功能页 + 新模型目录（ai-features.spec.ts） |
| 2026-08-24 | Nuxt.js | 6 | 0 | 0 | AI 功能页 + 新模型目录（ai-features.spec.ts） |
| 2026-08-24 | TanStack | 6 | 0 | 0 | AI 功能页 + 新模型目录（ai-features.spec.ts） |
| 2026-08-26 | Next.js | 4 | 0 | 0 | Waffo 支付（waffo-payment.spec.ts，含完整订阅结账 + webhook） |
| 2026-08-26 | Nuxt.js | 4 | 0 | 0 | Waffo 支付（waffo-payment.spec.ts，含完整订阅结账 + webhook） |
| 2026-08-26 | TanStack | 4 | 0 | 0 | Waffo 支付（waffo-payment.spec.ts，含完整订阅结账 + webhook） |
| 2026-08-30 | TanStack | 163 | 0 | 1 | **前台重设计分支全量回归 (PG)** — 全部通过（13.4m）；支付 spec 适配 provider tab |
| 2026-08-30 | Next.js | 163 | 0 | 1 | **前台重设计分支全量回归 (PG)** — 全部通过（12.6m） |
| 2026-08-30 | Nuxt.js | 163 | 0 | 1 | **前台重设计分支全量回归 (PG)** — 全部通过（11.5m）；creem 重试防冷路由 flaky |

_每次测试运行后更新此表。_

## Stage 5: internal links and launch acceptance (2026-10-14)

TanStack only, English. Acceptance: the home registry renders exactly six h3 target links; all six inner pages link home using Rumpelstiltskin AI; A/B/E cross-link in body prose and F → D → A is navigable; target anchor labels map to one URL; internal links have no nofollow and external links use only rel=nofollow. All 17 current HTML routes have one title, description, H1 and self-canonical; seven indexable pages have semantic headings and SSR body, while ten authentication/payment/legal resources have noindex. Sitemap lists seven indexable pages and robots allows all paths. No keywords metadata, broken internal URL/fragment, or fixed SSR image without alt or dimensions of at least 300×300. Footer links both legal pages containing ColdStone co. and zw83716@gmail.com. Analytics remains disabled with a documented single configuration slot. Curl evidence must include home and tutorial H1/body. No new paid generation, cloud resource creation or deployment.

Verified against the built Cloudflare local preview: 36/36 E2E checks passed (Stage 5's 16 checks plus homepage, Stage 1, Stage 3 and Stage 4; the separate www-host check is excluded from this command). The read-only audit covered 17 HTML routes, 21 fixed SSR image occurrences, 141 internal-link occurrences and 15 unique URL destinations including returnTo queries; all destinations returned 200. All ten resource pages are noindex, and all seven indexable pages appear in the sitemap. Actual curl output includes the home H1 and 36 paragraphs, and the tutorial H1 and 17 paragraphs. Every page has the shared legal footer. Evidence: `test-results/stage5-audit/report.json`, each route's raw HTML, `curl-home.html`, `curl-how-to-make-rumpelstiltskin-ai-video.html`, `sitemap.xml` and `robots.txt`. The legacy Stage 3 Related Tools selector was scoped to its section because the new body links correctly create additional matching anchors. No accounts, uploads, payments, paid generations or remote deployments were triggered.

Final Stage 5 follow-up: generated-result Open video links now use only rel=nofollow, with no new-tab target. Rebuild and typecheck passed; all 16 Stage 5 acceptance checks passed again against the final build. A separate local www upstream returned 301 to https://rumpelstiltskin-ai.co/signin?returnTo=%2Faccount, saved in `test-results/stage5-audit/www-redirect.txt`. Nine SEO unit checks passed. Desktop/mobile legal-page checks and homepage hydration passed with no mutating requests.

## Stage 4: meme, tutorial and 1987 film articles (2026-10-14)

TanStack only, English. Acceptance: D/E/F use exact requested titles/H1 and D description from pageRegistry; one description/canonical/H1, SSR body, no keywords, exact Rumpelstiltskin AI home link per article. D has the four requested H2s and distinguishes the AI meme from the real 1987 film with factual source links. E has four executable steps, four actual interface screenshots (alt and native/declared dimensions at least 300×300), and three Common Problems Q&As. F has the three requested H2s and explains the movie misattribution without claiming the AI scene is real film footage. Humanizer edit preserves supported facts. Sitemap automatically includes all seven public pages. No new paid video generation or remote deployment for this content change.

Verified: TanStack typecheck and Cloudflare production build passed; 9 SEO unit tests and 9 targeted E2E tests passed (Stage 4 + Stage 3 + homepage). Actual curl HTML confirms all three article headings/metadata and sitemap7; six desktop/mobile views pass without overflow, runtime errors or POSTs. Tutorial screenshots use local UI demonstrations with explicit captions, not a new paid generation. Evidence: `test-results/stage4-ssr-check.json`, `stage4-visual-check.json` and `stage4-*.html`. Playwright cleanup is confined to `test-results/playwright-seo`.

## Stage 3: two tools and generator comparison (2026-10-14)

TanStack only. Acceptance: three exact routes use the shared page registry and seoHead; required titles/H1 and page A description are unchanged; each page has one query-free apex canonical, SSR body and no keywords; A/B reuse the authenticated maker and return to their own route after sign-in; A renders the required H2 order and three FAQs, B renders its required H2 order and full target phrase; C uses a real table with at least five tools and official source links, unknown values marked Not publicly disclosed; all three have a Rumpelstiltskin AI link to home. Public images have alt and native dimensions at least 300×300. Sitemap automatically contains home plus these three published pages and excludes the three future pages.

Verified: 17 focused unit tests, TanStack typecheck and Cloudflare build passed. Six HTTP/JavaScript-disabled browser tests passed (homepage + A/B/C + image resources + sitemap); comparison table has six tool rows. Evidence: `test-results/stage3-ssr-check.json`, `stage3-*.html`, `stage3-sitemap.xml`; implementation and official sources in `docs/implementation/stage3-pages.md`.

Visual: three pages × desktop 1440px/mobile 390px passed; no full-page horizontal overflow, console/page errors or POST requests. A/B local previews and consent controls passed. The comparison table scrolls only within its mobile container. Evidence: `test-results/stage3-visual-check.json` and screenshots.

## H3 three-image reference dance (2026-10-14)

TanStack only, English SSR. Acceptance: dancer photo is required; optional princess upload previews and can be removed to restore the provided default; fixed scene is visible; submission sends three ordered image references to `minimax_h3_lightx2v_v5`, 10 seconds, landscape; dancer identity is preserved with navy tailcoat clothing override; fixed scene/princess defaults cannot be overridden by request prompt; existing authentication, credits, polling and download remain functional.

Verification: 44 focused unit tests passed across six files; TanStack typecheck and Cloudflare build passed. Curl confirms the single H1, four required H2s, dancer/princess labels and fixed scene are SSR, with no keywords meta. Edge browser mock checks passed for independent image validation, princess restore, ordered identity submission and dancer-upload cache reuse. Desktop 1440px/mobile 390px show no horizontal overflow. Mock browser artifacts: `test-results/multi-image-ui-*`; no provider calls and credits remained 40. One separate real generation is recorded in `test-results/autodl-three-image-check.json`.
## Compshare blocked-task recovery (2026-10-20)

Follow-up incident: verify actual Cloudflare runtime submission and status requests. Worker fetch rejects `redirect: error` before network I/O; use `manual` and reject non-2xx responses, including redirects. Reproduce in real workerd, retain credentials only on the intended host, restore the latest paid order using its original idempotency key, and verify the task is persisted and reconciled without another payment. Distinguish infrastructure errors from provider content rejection.

The recovered provider task estimates more than ten minutes remaining. Paid browser polling must continue through at least eleven minutes of actual processing instead of reporting the old ten-minute timeout; preserve the two-minute reassurance, cancellation and explicit test deadlines. Use a thirty-minute paid polling budget and retain the legacy polling defaults.

Verified runtime follow-up: final deployment `a9c09314-ca2c-4bfa-9ef9-a876d06fe7ae`, 304 AI/payment tests and typecheck/build/dry run pass. Real workerd regression tests first reproduce and then eliminate the pre-network exception, and preserve redirect credential isolation. The strengthened input-retention/waiting E2E passes on the published site after thirteen minutes of virtual processing. The actual original paid order has a persisted provider task and active recovery; the provider independently reports `running`. No new customer payment or unrelated model job. Temporary remote diagnostic Worker and duplicate local secrets were removed. See `docs/implementation/compshare-workers-runtime.md`.

Acceptance: an actual provider `blocked` terminal response ends processing and uses the existing full $4.99 refund path once, including closed-browser recovery. Provider moderation details remain internal. Unknown statuses and transport failures remain retryable. No extra checkout or paid diagnostic job is created; the latest already-paid order may be recovered only using its original provider idempotency key. Verify the adapter regression, paid refund tests, TanStack typecheck/build and the recovered live order's terminal/payment state.

User follow-up: show the actionable failure reason (political/public-figure likeness rejected, or content rejected) together with the actual refund-pending/refunded status directly inside the visible right-hand video result panel. Preserve the reason after refresh. Stop the generation spinner and never present a failed generation as complete. Do not expose raw provider traces, prompts or personal details. Verify both refund states in browser fixtures; refund the confirmed blocked live order once and check Stripe plus D1.

Verified on published version `786d3cc5-f701-4aa4-9394-ec438fd17a88`: 300 AI/payment unit tests, typecheck/build/dry run and all four final focused live browser checks pass. The earlier full live run passed 16/17, with one external-resource `page.reload` timeout; its isolated retry and final DOM-ready check both pass. Both refund messages are visible directly in the result panel and survive refresh. Real Stripe read-back and D1 confirm the latest order's full 499-cent refund succeeded. See `docs/implementation/blocked-video-refunds.md` and `test-results/last-generation-*`.

# Stage 1: TanStack single-language SEO foundation (2026-10-14)

Acceptance scenarios: homepage HTTP HTML contains its H1 and body without JavaScript; every active resource page has exactly one query-free apex canonical and noindex; all page metadata comes from seoHead and contains no keywords; www requests return 301 preserving path/query; robots permits all paths and links sitemap; sitemap contains only the homepage and discovers future public file routes automatically; unknown paths return an SSR 404 with a homepage link; language-prefixed demo routes are inactive. Only TanStack is in scope. Status: 12/12 HTTP checks passed in Workers development and built Workers local preview; 9/9 SEO unit checks passed; TanStack typecheck and Cloudflare production build passed. No remote deployment.



## Launch user walkthrough: authentication (2026-10-14)

TanStack only. Acceptance: signup/signin show only configured providers in SSR; unavailable phone/WeChat routes offer email sign-in without submitting an external request; password recovery explains unavailable email delivery and supplies the real support address; signup asks only name/email/password, documents password length, and awards the existing 40-credit trial. Public tool -> signin -> signup/signin -> original tool preserves safe returnTo. Header reflects session, current credit balance and working sign-out on desktop/mobile. Invalid reset URLs show a recovery path in SSR. Local browser walkthrough may create an e2e-* account; no real email, SMS, OAuth or paid generation. Artifacts are confined to test-results/launch-auth.

## Launch user walkthrough: final verification (2026-10-14)

Acceptance: anonymous visitors see the sign-in requirement before selecting photos; refreshing a known task resumes GET status checks without another paid POST; status errors can be retried without a photo; missing tasks unlock recovery; invalid files, optional princess reset, consent, video playback, download and reset work. Persisted tasks remain owner-scoped across module reloads, terminal updates do not regress, and concurrent failed polls refund once. User-locked metadata remains unchanged; actual conditions are clear in ordinary copy.

Verified final build: 41/41 E2E checks passed (36 site checks + 5 maker tests), 109/109 focused unit tests, typecheck, production build and Wrangler dry-run passed. Actual user walkthrough: 7 thematic pages and 67 internal-link clicks, no page errors/overflow; 9 distinct external links opened with final 200; 10/10 auth checks include real local registration/signout/signin with 40 credits and safe returnTo. Test account deleted only after exact identity check. Existing private MP4 used as a browser-intercepted fixture for playback and byte-identical download, not a new paid generation or public sample. Tutorial screenshots recaptured from current controls. Local D1 migration 0006 applied; remote migration/deployment remain unperformed. Details: docs/implementation/launch-user-review.md. Do not use Playwright's repository-level default cleanup directory.

Authentication walkthrough verified against the rebuilt Cloudflare preview on port 7002: all 10 browser checks passed. Six auth resources were opened and captured; actual clicks preserved returnTo through sign-in/recovery/sign-up. One local test account registered through the UI, received 40 credits, signed out and signed back in to the original tool; the header showed session and credits at desktop and 390px width. Already-authenticated redirects and unsafe external returnTo normalization passed. No browser errors, external OAuth/email/SMS calls or paid generation occurred. The test account was checked against the exact generated email before supported Better Auth deletion (HTTP 200). Evidence: `test-results/launch-auth/report.json`, before/after and mobile screenshots; reproducible script `scripts/manual/launch-auth-audit.mjs`. Email provider credentials are unconfigured, so automated password recovery is clearly unavailable and directs to the actual support address; real outbound delivery remains an external production setup item.

## Production deployment and API redirect (2026-10-15)

Acceptance: deploy the existing English TanStack site to the authorized Cloudflare account with its own D1, existing R2 bucket and production secrets. Preserve the POST method and index-route path for video submission on the real HTTPS domain. Public page normalization remains 301; API host/protocol normalization uses 308. Verify all nine published pages, primary-domain redirects, robots/sitemap, anonymous session and trial access, and upload storage without submitting a paid generation.

The initial live regression reproduced a 301 for POST /api/video-generate/; local preview did not use the production hostname. The middleware now preserves API paths, preventing a POST from becoming a GET through page canonicalization. Remote D1 uses the eight existing migrations and separate production credentials. Production test results are recorded in the deployment document.

Verified: deployed version `ad1e85bb-0967-4695-a5b4-74bf6936b2b5`. All nine published pages passed live SSR/metadata checks. Homepage, robots and API POST regression E2E checks passed. A real anonymous-session/R2-upload/browser smoke check passed all five checks with zero provider jobs. WWW/HTTP 301, 404 noindex, sitemap and both R2 reference images were verified. The current R2 URL is the active media custom domain. Evidence: `test-results/production-pages.json`, `test-results/production-smoke.json`, `test-results/production-home.png`, `docs/implementation/cloudflare-production-deployment.md`.

## Remove Open video and overstated copy (2026-10-15)

Acceptance: remove the Open video entry in all shared maker states, retain preview and Download video, and remove references to that entry in errors, troubleshooting, tutorial text and screenshots. Remove the meme page's 30-second SEO promise and the homepage's Any Photo title; remove completion-speed promises from metadata. Use “Generation can take a few minutes” for the site's waiting-time guidance, with no “or longer”. Describe choreography as the template request rather than a guaranteed result. Verify all seven public pages plus legal pages in SSR, existing playback/download and relevant metadata checks only. No provider job or deployment.

Verified: Cloudflare build and TanStack typecheck passed, 2 maker SSR unit checks and 3 focused metadata/playback/download E2E checks passed. All nine published HTML responses have one H1 and one description, with no Open video, seconds/minute speed promises, Any Photo or or longer wording. The four tutorial UI screenshots were recaptured using local mock responses. Evidence: `test-results/realistic-copy-ssr.json`, `test-results/realistic-copy-build.log`, `test-results/stage4-tutorial-capture.json`. No real generation or deployment occurred.

## Dance steps and links spacing (2026-10-15)

Acceptance: the paragraph linking to the generator and tutorial follows the four dance-step cards with a clear gap, without overlapping any card. Check desktop (1440px), tablet (768px) and phone (390px), including no horizontal overflow. Preserve copy and navigation. Verify only the relevant page E2E, build and typecheck.

Verified: the initial desktop regression reproduced a -12px gap, matching the reported overlap. The tool-page override now leaves 24px between the cards and following note. Cloudflare build, TanStack typecheck and the focused dance-page E2E passed at all three widths. Evidence: `test-results/dance-steps-spacing-1440.png`, `test-results/dance-steps-spacing-768.png`, `test-results/dance-steps-spacing-390.png`. No provider job or deployment occurred.

## Remove browser-limit and refresh instructions (2026-10-14)

Acceptance: remove browser-based free-allowance wording from all published copy and metadata, including comparison and legal pages. Remove refresh/status-check instructions from normal, error and retry copy, keeping processing feedback and a plain Try again recovery action. Keep backend allowance, automatic polling and task recovery unchanged. Update tutorial screenshots. Verify published SSR copy and the existing generation/recovery smoke tests without a provider job.

Verified: build and typecheck passed. All seven public articles/tools plus privacy/terms returned 200, with no browser-limit, refresh or status-check wording in their raw HTML. Three focused visitor/recovery E2E checks passed; retry is labeled Try again and does not submit another job. The four tutorial screenshots were recaptured with the new copy, using locally mocked responses. Evidence: `test-results/public-copy-cleanup-e2e.log`, `test-results/clean-offer-home.png`, `test-results/stage4-tutorial-capture.json`. No provider generation or deployment occurred.

## Visible limited-time free offer (2026-10-14)

Acceptance: the shared maker on home/A/B displays a prominent, server-rendered No login required / Free for a limited time banner and states one free video per browser with no payment. Update the three centralized descriptions and their inherited social metadata to include these features. Do not invent an end date or countdown. Keep one H1, existing routes and the one-video limit. Verify SSR copy, build/typecheck and the existing visitor-generation smoke test only.

Verified: build and typecheck passed, 2 maker SSR checks and 2 focused E2E checks passed. Curl confirms real strong/span banner text in all three raw HTML documents, one H1 and one description each; their descriptions and OG descriptions contain both offer features. The visitor smoke check still permits one generation and blocks a second. Screenshot: `test-results/free-offer-home.png`; log: `test-results/free-offer-e2e.log`. No provider job or deployment occurred.

## Accountless public website (2026-10-14)

Acceptance: remove sign-in, signup, signed-in identity and sign-out controls from the header and all three makers. Retire the public authentication pages and disable account-registration/login endpoints while retaining the framework's anonymous session needed for upload, task ownership and downloads. Preserve the one-video browser limit and task resume. Remove account-creation instructions from current copy and legal text. Check the visitor generation/resume/download flows, former auth URLs and absence of account entry links; no paid provider call or deployment.

Verified: Cloudflare build, TanStack typecheck and 2 maker SSR checks passed. Six focused E2E checks passed: anonymous visitor submission with a single provider mock, refresh recovery without another job, expired-task recovery, retry after a temporary status error, photo validation/playback/download, and retired account page/API checks. All six former auth pages return 301 to home; credential/social registration/login endpoints return 404. The visible header and maker contain no signin/signup/signout controls. Evidence: `test-results/accountless-site-e2e.log`, `test-results/accountless-home.png`. The anonymous Better Auth session remains internal for existing task ownership and limits; existing records were preserved. No payment, paid generation or deployment occurred.

The four tutorial UI screenshots were recaptured to remove the former optional signin line from the pictured controls; all dimensions remain at least 300px. Upload/generation responses were mocked and no user's portrait was used. Evidence: `test-results/stage4-tutorial-capture.json`.

## Generator page specifications and demo (2026-10-14)

Acceptance: A renders the requested seven H2 sections in order, with one H1, centralized metadata/canonical and no prohibited wording. Preserve the actual free-once mechanism per user clarification; do not claim repeat paid generation or monetary refunds. Output specs must read the same parameters used by the server and state the real MP4/audio behavior. Include a playable portrait presentation of an existing generated demo that does not contain the user's identity, with an accessible title/description and cover alt. Align home/A/B FAQs with their assigned topics and keep required internal anchors. Verify SSR, media metadata/playability, 300px image minima and related E2E only; do not create a paid provider job or deploy.

Verified: TanStack typecheck and Cloudflare production build passed; 6 template + 9 SEO unit checks passed. Homepage 2 and site acceptance/linking 16 checks passed; the stage 3 page/media checks passed 4/4 after correcting the test selector to address the section rather than its H2. The final replacement demo was then checked again: native playback without site JavaScript, 720×1280 metadata, 10-second duration, cover dimensions/alt and 390px no-overflow assertion passed. Screenshots: `test-results/generator-page-output-desktop.png`, `test-results/generator-page-output-mobile.png`. Logs: `test-results/generator-page-stage3-e2e.log`, `test-results/generator-page-final-demo-e2e.log`; curl source: `test-results/generator-page-ssr.html`. No deployment, payment, user-portrait publication or provider generation occurred.

Specification basis: `danceOutputSettings` supplies duration 10 and resolution `768p横` to both the server template and public table; the configured label is 16:9, while an existing returned landscape MP4 is 1344×768 (7:4), so the page states approximately 16:9 and avoids a guaranteed exact pixel size. The same sample is 10.125 seconds and contains AAC audio, so duration is a request target and audio is described as possibly present, without an added Tip Toe track. The download handler preserves provider bytes and supplies an MP4 filename. Final demo source is the earlier costume-character three-image generation, shown on a portrait canvas with its full scene preserved. Asset provenance and processing are recorded in `docs/implementation/generator-demo-manifest.json`.

## Dance page revision and film URL migration (2026-10-14)

Acceptance: page B uses the Tip Toe title and free-once description, renders the requested five H2 sections in SSR, and describes only actions in the current five-shot prompt. Include silent-video/TikTok sound instructions with sources and the required internal links. Move the film explainer to `/is-rumpelstiltskin-1987-real`, return a permanent 301 from the old URL, and include only the new URL in navigation and sitemap. Explain the AI clip separately from the real 1987/1995 films with citations. Verify metadata, image dimensions, internal links, the redirect and desktop/mobile rendering. No provider generation or deployment is required.

Verified: production build and TypeScript passed; SEO unit tests 9/9 and stage 3–5 E2E checks 24/24 passed. The old route returns 301 with and without a query; the new route is SSR with a self canonical, and sitemap contains seven public URLs with only the new film address. The shared registry updates all six homepage links and the F → D → A chain. Desktop 1440px and mobile 390px checked in the browser; mobile actions use one column without horizontal overflow. Evidence: `test-results/dance-page-migration-e2e.log`, `test-results/stage5-audit/report.json`, `test-results/dance-page-actions-desktop.png`, `test-results/dance-page-actions-mobile.png`.

Action basis: `src/lib/dance-prompt.ts` shots 1/3/4/5 specify The Shush Gesture (0–1.8s), The Tip Toe Step (3–6.5s), The Footwork Close-Up (6.5–8.2s, the same step viewed closer), and The Small Finishing Pose (8.2–10s, continued stepping followed by the ending). The princess reaction remains 1.8–3s. Timing is presented as a template target, not a guarantee. Prompt/API behavior is unchanged. Sources are centralized in `src/lib/dance-fact-sources.ts`: LADBible and meme.com for the AI clip, AFI for 1987 credits, Wikipedia for 1995 credits, Apple Music for the 2014 song, and TikTok’s own upload/sound guide. No search-volume figures, film plots as meme origins, or disputed creator attribution were added; the meme article’s origin paragraphs were aligned with the same source set.

## Anonymous one-video trial (2026-10-14)

Supersedes the earlier login-before-upload and visible-credit-balance behavior above. TanStack English site only. Visitors choose photos and generate without registration; Better Auth anonymous sessions protect uploads, task status and downloads. One successful video per browser/account, with a signed visitor cookie and a database-enforced atomic reservation. Provider failure restores eligibility after refund; status retry/refresh never creates another job. Signup/signin carries the browser/anonymous usage into the account. A new browser cannot reset an existing account's allowance. IP short-window caps use trusted Cloudflare client IP, not a permanent one-IP-one-person rule. Anonymous sessions cannot access unrelated APIs. No new public page, private-media publication or paid provider call in automated checks.

Verified: 114/114 AI unit tests, 42/42 E2E checks, and 6/6 real Better Auth + local D1 integration checks passed. These cover parallel submissions (one provider request), failure restoration, anonymous generation controls, playback/download, registration with task ownership migration, used-account access from a fresh browser, and signout. Four tutorial screenshots were recaptured. Local D1 0007 applied; remote migration/deployment not performed. Evidence: `test-results/anonymous-trial/report.json`, `scripts/manual/anonymous-trial-audit.mjs`; implementation and deployment notes: `docs/implementation/anonymous-video-trial.md`.

# AI Rap Video homepage refresh — 2026-10-24

Scope: deployed TanStack homepage and its shared photo form; Next/Nuxt and backend generation prompts are outside this request.

- Homepage title, H1, intro, instructions, FAQ, branding and navigation use AI Rap Video. Canonical points to https://ai-rapvideo.co/.
- Preserve existing gallery video URLs, posters and tutorial images. Replace old themed links with working homepage anchors.
- Both upload controls announce required. With either photo missing, generation stays disabled even after consent. Removing either photo blocks generation and clears saved inputs.
- Verified SSR, image availability, desktop/mobile layout and both-photo interactions with `homepage.spec.ts` and `launch-maker.spec.ts`: 22 passed, 2 free-mode cases skipped because payment is enabled. AI unit tests: 364 passed; SEO unit tests: 9 passed. TanStack typecheck, Cloudflare build and deployment dry run pass. No real charges or provider jobs were submitted.

Sitemap cleanup: exclude every Rumpelstiltskin pathname from route discovery, published URL inputs and final XML rendering. The six legacy pages stay accessible but no longer appear in the sitemap; the current sitemap contains only the AI Rap Video homepage. Verify with `tests/unit/seo/foundation.test.ts` and the deployed `/sitemap.xml` response.

Legacy page retirement supersedes the accessible-page behavior above: the six specified Rumpelstiltskin URLs return HTTP 410 with `X-Robots-Tag: noindex, follow`, no `Location` header, and no redirect to the homepage. This response runs before canonical normalization, including www, query parameters and trailing slashes. HEAD returns the same status and headers with an empty body. Legacy client-side page heads are also noindex. Homepage remains 200; sitemap remains homepage-only. Verify with `tests/unit/seo/retired-pages.test.ts` and direct deployed HTTP checks.

## AI Rap Video P3 consistency — 2026-10-24

Scope is the deployed TanStack site. Active homepage, legal, payment-result and 404 HTML must contain no retired branding, image paths, links or alt text. All mentioned prices remain $4.99 USD per video; confirmed generation failure receives a full refund; stored uploads and saved videos are scheduled for automatic deletion after 24 hours. Both photo uploads and the existing homepage keyword remain. Seven legacy page paths, including the former 1987 alias, terminate as 410 without redirecting. The 21 removed marketing images and old demo video must return 404/410. Sitemap contains only https://ai-rapvideo.co/. Retired page route code, copy and dedicated styles are removed from the frontend build; earlier stage3/stage4 published-page tests are superseded by retirement and consistency checks.

Verification: `site-consistency.spec.ts`, `retired-pages.spec.ts`, current SEO HTTP tests, focused unit tests, TanStack typecheck, Cloudflare production build and dry run. No real payment or video generation is submitted. Final outcomes are recorded in `docs/implementation/ai-rapvideo-p3-consistency.md`.

## AI Rap Video single-page SEO — 2026-10-24

Execute P0-1 through P2-6 in order, homepage only. Raw homepage HTML must contain parseable SoftwareApplication + FAQPage JSON-LD, matching the seven original visible FAQ pairs; real 1200x630 OG image and matching Twitter/OG title/description; exact requested 61-character title, unchanged H1/description; subtitle directly after H1; three new SSR content sections between instructions and examples; 900–1100 main words; five local rap example clips with complete captions and at least one portrait video; three described anchor cards and rap-maker/presentation identifiers. Preserve $4.99, both photos, current refund/retention copy, existing backend behavior and the exact one-entry sitemap. Verify with homepage-seo.spec.ts and relevant existing homepage/SEO/SSR checks. Capture before/after raw HTML, word-count scope, metadata and FAQ comparison evidence. No real charge or generation is needed.

Order update (2026-10-24): the earlier instructions → editorial → examples order is a historical record superseded by the user's latest tool → examples → instructions → editorial requirement. Examples must directly follow the maker; H2 order is Examples → How → What Is → Who → Why → FAQ → Explore. Preserve historical source snapshots.


## AI Rap Video direct generator (2026-10-24)

Scope: deployed TanStack homepage only. No paid provider requests in automated checks.

- [x] Two required photos (JPG/PNG/WebP, 20 MB), consent, four scene cards and a 240-character optional theme.
- [x] Fixed 12 seconds, 768p portrait, original generated rap audio; no price, credits, checkout, login or output settings.
- [x] Anonymous session, upload twice, submit the rap payload once, poll, preview and download.
- [x] Submission is disabled during processing; reload recovers the task without a new generation.
- [x] Failed generation preserves inputs; status/download errors retry the existing task.
- [x] Mobile form fits viewport; scene keyboard interaction and counter remain accessible.
- [x] JSON-LD Offer is free, FAQ matches visible copy, Title/H1 and single-homepage sitemap remain correct.

Verification: 126 targeted unit tests passed; TanStack TypeScript and Cloudflare production build passed; all six mocked generation flow browser tests passed, homepage/asset/mobile/privacy/retired-route checks passed; four homepage SEO checks passed after copy adjustment. The production-host-only www redirect case is skipped on localhost. No paid AutoDL generation was submitted.
