# AI Rap Video Homepage SEO Implementation Plan

> **For agentic workers:** Execute in this session, in the user's exact P0-1 through P2-6 order. No new page URLs, sitemap edits, backend prompt changes or payment changes.

**Goal:** Add homepage schema, sharing metadata, the exact requested title/subtitle, useful SSR copy, five rap examples and consistent rap UI naming.

**Architecture:** Keep the current TanStack homepage. Reuse its copy objects for SSR and FAQ JSON-LD. Extend homepage metadata without altering other page heads. Preserve the working generation and checkout flow.

**Tech Stack:** TanStack Start, React, TypeScript, Cloudflare Workers, existing Vitest/Playwright checks.

- [x] P0-1: Snapshot current source/FAQ/word count; add escaped SoftwareApplication + FAQPage JSON-LD in homepage head. Validate parsing and all seven FAQ strings exactly.
- [x] P0-2: Add homepage-only OG and Twitter tags. Verify real image dimensions; retain the requested image URL and use a real 1200x630 share crop if necessary.
- [x] P1-3: Set the exact requested title and subtitle; preserve description, H1 and primary keyword. Record actual title character count.
- [x] P1-4: Add the three requested SSR sections between instructions and examples. What Is=81 words, three audience paragraphs=50 words each. Headings and copy render directly in React SSR; FAQ remains verbatim. Final total is measured after gallery/navigation edits.
- [x] P1-5: Five distinct rap scenes are hosted locally, including a 720x1280 rooftop portrait edit preserving both performers. All captions include scene, description, duration/orientation and use case. Media decode/probe/image checks passed.
- [x] P2-6: Added three ten-word Explore descriptions; renamed the maker anchor, CSS classes, UI test IDs and checkout return fragments to rap-* without changing existing CSS declarations or payment/session behavior. Local SSR measures 907 editorial words / 1087 main words.
- [x] Verified 29 focused unit tests, typecheck, build/source guard and dry run. Deployed version 54b7c379-d17f-45cd-865e-e69723aa712e; all four production HTTP tests and raw-source audit passed. Final counts: editorial 534→907, main 700→1087. Seven FAQs match the pre-edit source; one-entry sitemap is byte-identical. Report: docs/implementation/ai-rapvideo-homepage-seo.md.

Only read-only preparation within the current step may run in parallel. Do not begin implementation of a later step before completing the current step. User authorization already includes implementation and deployment; no plan handoff approval is needed.
