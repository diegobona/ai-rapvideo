# Optional scene image

The shared English TanStack maker retains the included barn scene and accepts an optional JPG, PNG or WebP scene image up to 10 MB. It previews the chosen image, supports replacement/restoring the default and locks with the other inputs during processing. Local previews use revocable object URLs. Images upload only when the visitor continues to checkout; a successful upload is reused after a checkout error.

Checkout accepts `sceneImageUrl` alongside the existing photos, custom text/tags and orientation. The server verifies that it belongs to the current visitor's R2 upload prefix and that the object exists. The prepared options preserve dancer in reference slot one, princess in slot two and the selected scene in slot three. Omitting the field retains the existing barn scene and original empty-customization prompt verbatim. `config/danceReferences.ts` centralizes the included reference keys.

For a custom scene, prompt compilation switches to the compatible scaffold even with no custom text or styles. It identifies @Image3 as the selected environment and removes the original hardcoded straw-wall staging and room/furniture restrictions. Requested custom text and styles still take precedence over defaults. This verifies the request/instruction path; output fidelity remains model-dependent.

The final references and prompt are saved in the existing purchase JSON before checkout. Changed scenes produce distinct drafts. Verified payment and background recovery use the saved options; owned-order responses expose the selected scene URL to restore its preview. No schema migration, new environment variable or change to price ($4.99), duration (10 seconds), orientation, payment/refund admission or photo retention is needed.

Checks use simulated Stripe/provider traffic, including the actual AutoDL serializer. No real charge or provider generation is performed.

Local verification: 259 AI/payment tests and 22 related browser checks pass, including combined three-image uploads, custom text/tags/orientation, scene ownership/existence rejection, persisted paid options, slot order in the actual H3 payload, default restoration, invalid file rejection and saved scene recovery/locking. Desktop plus 768/390/320px layouts fit without browser errors. Typecheck, production build and Wrangler dry run pass. Evidence: `test-results/custom-scene-unit.log`, `custom-scene-e2e.log`, `custom-scene-visual.json`, `custom-scene-typecheck.log`, `custom-scene-build.log` and `custom-scene-dry-run.log`.

Published Worker: `d657fe23-a2c1-4eea-b2e2-9328e7d63a38`. Live checks confirm the scene control, preview/default restoration and scene URL in a simulated checkout request, with no browser errors or overflow at checked widths. Evidence: `test-results/custom-scene-live.json`, `custom-scene-live-{desktop,mobile}.png` and `custom-scene-deploy.log`.
