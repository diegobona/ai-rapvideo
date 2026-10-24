# Dance video orientation

The English TanStack maker supports Landscape and Portrait, defaulting to Landscape. This applies to the homepage and both existing generator pages through their shared component. Quality remains 768p, duration remains 10 seconds, and price remains $4.99 USD.

The public H3 workflow schema was fetched successfully on October 20, 2026 from `https://autodl.art/api/v1/comfyui/workflows/minimax_h3_lightx2v_v5`. Its resolution enum includes `768p横` (1344 × 768) and `768p竖` (768 × 1344). These canvases are approximately widescreen/vertical rather than exact 16:9/9:16, so the controls use orientation names without promising exact aspect ratios.

`config/danceOutput.ts` holds the two choices and provider resolution mapping. `libs/ai/dance-output.ts` validates values for both client and server. Checkout accepts only `landscape` or `portrait`; omission preserves existing clients' landscape output. Arbitrary provider-size, price and duration overrides are still rejected.

The server maps orientation to the actual `VideoGenerationOptions.size` before creating a checkout and stores it in the existing purchase JSON. No schema migration is needed. The options hash separates portrait drafts from otherwise identical landscape drafts. Fulfillment and recovery submit the stored resolution to AutoDL; later UI choices cannot rewrite a paid job. Public owned-order responses return only the orientation needed to restore the control on payment return. Selection locks with the existing photo/customization controls during processing.

Description, quick tags, reference images, payment admission, refunds and photo retention behavior are unchanged. The existing video preview preserves the full output using `object-contain` for either canvas.

Validation uses simulated Stripe/provider responses and the actual AutoDL request serializer, plus browser checks. No real payment or provider generation is performed for this feature.

Local verification: all 249 AI/payment unit tests, 21 related homepage/maker/generator browser checks, TypeScript checking, production build and Wrangler dry run pass. Browser checks confirm portrait checkout payloads, restored/locked portrait orders, keyboard-accessible native radio controls and no overflow at 768/390/320px. Evidence: `test-results/orientation-api-rules.json`, `orientation-unit.log`, `orientation-e2e.log`, `orientation-visual.json`, `orientation-typecheck.log`, `orientation-build.log` and `orientation-dry-run.log`.

Published Worker: `418abc5a-21da-44c4-ba64-1e82bad3f44d`. The live homepage returns200; live mouse/keyboard selection and simulated portrait checkout pass, with no browser errors or overflow at the checked widths. Evidence: `test-results/orientation-live.json`, `orientation-live-{desktop,mobile}.png` and `orientation-deploy.log`.
