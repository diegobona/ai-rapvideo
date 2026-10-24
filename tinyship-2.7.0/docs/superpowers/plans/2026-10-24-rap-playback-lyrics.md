# Rap Playback Lyrics Implementation Plan

> **For agentic workers:** Use subagent-driven development for the independent backend and player work below. Follow the existing single-site scope.

**Goal:** Generate four editable lyrics with DeepSeek first, then generate the video using the approved text and show that submitted script beneath the player.

**Architecture:** The user's updated two-step design supersedes post-generation ASR. A server-only DeepSeek endpoint creates four short lines; the editor submits the approved draft to H3 as literal tagged lyrics. Freeze the submitted script in existing task JSON, restore it with finished video results, and use the planned solo intervals for approximate highlighting. No ASR service or AI binding is deployed.

**Tech Stack:** Existing TanStack/React, DeepSeek JSON API, AutoDL H3, existing task JSON/R2 storage, Vitest and Playwright.

## Backend

- [x] Add server-only DEEPSEEK_API_KEY configuration and a bounded, owner/session-checked lyric-generation endpoint.
- [x] Validate exactly four editable short lines and selected en/zh language; default to English.
- [x] Embed the approved text verbatim in H3 dialogue tags; remove all requests for H3 to compose or rewrite lyrics.
- [x] Preserve the submitted script in task results without a migration or changes to legacy paid orders.

## Player

- [x] Add translated first-step Generate Lyrics action, four editable lines and separate Generate Video action.
- [x] Show lyric-generation failure/retry independently; never submit a video automatically after writing lyrics.
- [x] Display the frozen submitted script under the result video; track play time, pause, seek and result replacement for approximate planned-interval highlighting.
- [x] Preserve the old video's submitted script when a visitor edits the next draft; old videos without saved scripts show a truthful unavailable state.

## Verification and deployment

- [x] Run relevant unit tests, TanStack typecheck and Cloudflare build.
- [x] Run mocked browser checks for lyric generation/editing, separate video submit, pause/seek and restored script after refresh.
- [x] Deploy existing ai-rapvideo Worker while preserving keys and variables; verify production homepage/API authentication.
- [x] Document DeepSeek configuration, exact submitted lyric handling and approximate highlight timing. Keep the sitemap and page URLs unchanged.
