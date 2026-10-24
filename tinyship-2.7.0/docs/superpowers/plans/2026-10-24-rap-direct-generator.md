# Direct AI Rap Video Generator Implementation Plan

> **For agentic workers:** Use parallel implementation with bounded review of the API contract and user flow. Preserve the existing homepage work and paid-order recovery.

**Goal:** Let visitors upload two portraits, choose one of four scenes, enter a short theme and generate a free 12-second rap video without checkout.

**Architecture:** The TanStack homepage uses the existing anonymous session, owned R2 uploads and durable video task pipeline. The server validates a small rap request and compiles an H3 prompt, then calls AutoDL `minimax_h3_803` with fixed 12-second, 768p portrait, high-quality parameters. API credentials stay in the ignored server environment file.

**Tech Stack:** TanStack Start, React, AutoDL ComfyUI HTTP API, Cloudflare Workers/D1/R2, Vitest and Playwright.

## Tasks

- [x] Add public scene/settings config and server-owned rap input validation and prompt.
- [x] Extend AutoDL adapter for the exact 803 schema without changing historical workflow compatibility.
- [x] Connect repeatable free generation to existing submission, polling, recovery and download endpoints.
- [x] Replace the homepage tool with two required uploads, four selectable scene cards, a 240-character theme, fixed output details and result/download states.
- [x] Generate four original stage-card images.
- [x] Remove checkout and obsolete pricing claims from the homepage, metadata and current-service copy.
- [x] Prepare the existing ignored server configuration file and update its template/instructions without printing or committing keys.
- [x] Verify ownership checks, fixed provider settings, invalid input, missing configuration and duplicate submission behavior with targeted tests.
- [x] Verify the desktop/mobile tool, successful mocked generation/download, recoverable errors and refresh recovery in the browser.
- [x] Run affected unit tests, TanStack typecheck, production build and a local Cloudflare runtime preview. Keep sitemap and Title/H1 unchanged.

## Acceptance scenarios

1. `/` renders exactly four scene choices and two required photo inputs; there are no duration/resolution controls, price, credits, checkout or sign-in steps.
2. A visitor with both photos and consent can submit `{rapTemplate, personOneImageUrl, personTwoImageUrl, scene, topic}`; the server fixes provider, workflow, duration, resolution and mode.
3. Unowned URLs, missing photos, unknown scenes, overlong topics and client-supplied provider parameters are rejected before an AutoDL job is created.
4. A single run uploads the two portraits, submits once, polls status, previews the result and downloads it. Retry download and refresh never create a second job.
5. Missing `AUTODL_API_KEY` disables generation with a useful message; the key is never present in server HTML, browser bundles or API responses.
6. Completion releases the in-flight reservation so another free video can be generated. A failed run retains inputs and can be retried; transport uncertainty preserves the current job reference.

Only the deployed TanStack site is in scope; the Next/Nuxt starter applications and historical paid-order data remain outside this homepage change.
