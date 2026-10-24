# Homepage video examples — 2026-10-20

The homepage shows three externally hosted creative-reference cards directly below the video-examples heading. Following the user's annotated screenshot, the gallery introduction, featured maker-sample card, inspiration subheading and explanatory paragraph were removed. The cards keep their AI-reference labels and captions, without added author names or source-credit text; there are no endorsements or claims that these clips were generated here.

The existing maker sample remains on the separate generator page; its processing history is documented in `generator-demo-manifest.json`. No private user portraits were published, and no new generation was submitted.

External media were discovered on https://www.makeviral.ai/templates/ai-rumpelstiltskin-dance and checked in an Edge browser on October 20, 2026:

| Remote file under `/media/templates/ai-rumpelstiltskin-dance/` | Dimensions | Actual duration |
| --- | --- | --- |
| `example.mp4` | 720 × 1280 | 10.08 s |
| `example-wide-s25-original.mp4` | 1280 × 720 | 14.708008 s |
| `example-with-friend.mp4` | 720 × 1280 | 10.08 s |

The source page describes the depicted people as AI-made. Each card streams the original MP4 and preview image from that host; nothing was copied into public assets, cropped, watermarked differently, or relabeled as a local result. Public access is not evidence of a redistribution license. Do not turn these references into locally hosted assets without checking permission. Remote availability depends on that host; playback errors show a message and a direct-video fallback link.

Social-platform players were also investigated, but all three returned server errors during the actual browser check and were excluded. Evidence: `test-results/external-video-review.png` and `test-results/fictional-video-review.png`.

The gallery uses the site's existing English copy module, native video controls, `playsInline`, and `preload="none"`. All media keep their full frame using `object-fit: contain`; the landscape reference is letterboxed within the matching portrait cards. The privacy notice now covers direct third-party media requests.

Verification results are recorded in `tests/e2e/TEST-CATALOG.md`.

Initial publication to https://rumpelstiltskin-ai.co/ on October 20, 2026 used Worker version `d68b22ba-317e-4b65-8598-88188f3ec768`. All four videos in that earlier layout played on the live page, the privacy disclosure was present, and the 390px layout had no horizontal overflow. Evidence: `test-results/homepage-videos-production.json`. The subsequent simplified layout is tracked in the test catalog and production deployment record.

The simplified layout was published later that day as `9be55485-1792-475f-b8b7-b65cde202ea2`. Live checks confirmed exactly three videos immediately below the heading, successful playback of all three, no removed content and no mobile overflow. Evidence: `test-results/homepage-videos-simplified-production.json`.
