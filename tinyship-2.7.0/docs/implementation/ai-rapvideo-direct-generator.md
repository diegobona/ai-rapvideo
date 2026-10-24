# AI Rap Video direct generation

The deployed TanStack homepage now uses free direct generation. New requests do not create Stripe checkouts or consume user credits. Historical paid-order verification and recovery remain available.

## Fill the API key

Edit `apps/tanstack-app/.dev.vars` and fill or replace this server-only value:

```dotenv
AUTODL_API_KEY=your-autodl-comfyui-token
DEEPSEEK_API_KEY=your-deepseek-api-key
```

Use a token from the AutoDL **ComfyUI** group. Do not add `Bearer` and do not rename the variable to a `VITE_` variable. The file is ignored by Git. The existing auth, database and R2 values in this file are preserved. The safe starting template is `apps/tanstack-app/.dev.vars.example`.

For a local Cloudflare runtime, from `apps/tanstack-app` run:

```sh
node scripts/cloudflare-vite.mjs dev --port 7001
```

For production, the same `AUTODL_API_KEY` must be saved as a Worker secret; local `.dev.vars` values are not uploaded by a code deployment:

```sh
wrangler secret put AUTODL_API_KEY
```

The DeepSeek key powers the first, editable-lyrics step. It is also a production Worker secret named `DEEPSEEK_API_KEY`; the lyrics endpoint returns a safe unavailable response when it is missing. Never paste a key into public TypeScript configuration, browser requests or the repository.

## Product settings

`config/rapVideo.ts` contains the public fixed settings and four scene cards:

- Workflow: `minimax_h3_803`.
- Duration: 12 seconds.
- Resolution: `768p竖(768*1376)`.
- Mode: `高质模式`.
- Scenes: hotel lobby, luxury lobby, studio booth and street cypher.
- Two separately uploaded portraits are required; each may be JPG, PNG or WebP up to 20 MB.
- The optional theme is at most 240 characters.

These settings are enforced on the server. The legacy `AUTODL_VIDEO_WORKFLOW_ID` override does not change the rap homepage workflow.

## Request and result flow

The first explicit action creates an anonymous session and submits the optional topic and selected language to `POST /api/video-generate/lyrics`. The server calls the official DeepSeek JSON API with `deepseek-flash`, validates four short lines, and returns them for editing. This step sends no photos, uploads no files, and creates no video job. English is selected by default; Chinese requires explicit selection. Lyrics can also be entered manually.

The separate video action uploads both portraits to their existing owned R2 paths and submits the approved script:

```json
{
  "rapTemplate": "rap-duo-v1",
  "personOneImageUrl": "https://your-media-host/uploads/owner/first.jpg",
  "personTwoImageUrl": "https://your-media-host/uploads/owner/second.jpg",
  "voices": ["male", "female"],
  "scene": "hotel-lobby",
  "topic": "A birthday celebration with my best friend",
  "lyrics": {
    "language": "en",
    "lines": [
      "We light up the night",
      "Our friendship shines so bright",
      "We step into the light",
      "Together we take our flight"
    ]
  }
}
```

`POST /api/video-generate/` returns the persisted task ID. Existing status and download endpoints deliver the result. Refresh recovers the current task; it never submits a new generation. The server validates ownership of both photos, the scene, topic, selected voices and all four lyrics before calling AutoDL. New jobs use two appearance references, two server-selected dry rap audio references and the four exact approved lines, with generated rap vocals and a beat. No reference video, default second person or separate per-request audio-generation service is required. The submitted script is frozen in existing task JSON before completion and retained in the finished result, without a database migration.

The in-flight admission guard permits one active request per browser/account. Once a run completes, the visitor may generate another. Provider status/download errors retry the existing task. Managed uploaded photos and saved videos retain the existing scheduled 24-hour deletion policy.

Automated verification uses mocked AutoDL responses. A real provider generation remains a separately identifiable billable request; mock success does not certify rap quality or mouth synchronization.

## Voice casting

The prompt in `apps/tanstack-app/src/lib/rap-prompt.ts` binds the first photo to on-screen speaker S1 and the second photo to S2. The user explicitly chooses male or female for each voice; the default pair is male/female. `config/rapVoices.ts` selects a different server-owned dry rap sample for each position, including male/male and female/female pairs. The first sample supplies S1's voice identity and spoken-rap delivery, and the second supplies S2's. The prompt asks for short consonant-led syllables, syncopation and strong-beat accents at natural speaking pitch. The samples do not replace the approved words or the explicitly selected English/Chinese language. Each person's voice stays bound to their own performer, with no shared vocals, voice swapping or off-screen narrator.

The performance has one vocal handoff rather than four short alternating sections: 0–0.5 seconds is an instrumental intro, 0.5–5.5 is S1 alone, 5.5–6 is an instrumental pause, 6–11 is S2 alone, and 11–12 is an instrumental outro. Each solo contains two short lines. Every interval explicitly defines who is audible and whose mouth is closed. During pauses both mouths are closed and both voices silent. The former blanket instructions for both people's mouth/lip motion and performing together were removed because they conflict with exclusive solo sections. Harmony, backing vocals, ad-libs, doubled vocals and vocal samples are explicitly excluded.

This follows the [MiniMax speaker prompt guide, section 4.4](https://huggingface.co/MiniMaxAI/MiniMax-H3/blob/main/docs/VIDEO_PROMPT_WRITING_GUIDE_base_en.md) and the [AutoDL 803 public schema](https://autodl.art/api/v1/comfyui/workflows/minimax_h3_803). The integration sends `ref_audio_0` and `ref_audio_1` and binds them with AutoDL's zero-based `<audio 0>` and `<audio 1>` labels. Users cannot supply arbitrary audio URLs. These are generic reference voices, not a reconstruction of the photographed person's actual voice. Voice identity, rap delivery and synchronization remain generative model behavior and require listening to a completed output; configuration changes alone do not establish audio quality.

## Lyrics and vocal language

DeepSeek writes the four-line draft before video generation. Visitors can edit every line; server and client enforce four nonempty plain-text lines, at most 80 characters per line, at most eight words for an English line or 20 characters for a Chinese line. The selected English/Chinese language is authoritative; a Chinese topic does not silently switch English lyrics to Chinese. The H3 prompt embeds the edited lines verbatim in exactly four complete dialogue blocks with the selected language and instructs the video model not to compose, rewrite or add words.

The player displays the immutable submitted script directly beneath its video. Planned line intervals are 0.5–3, 3–5.5, 6–8.5 and 8.5–11 seconds. Highlighting updates on playback, pause, seeking and replay; these are approximate script intervals rather than recognized word timestamps. Editing the next draft does not alter a finished video's saved script. Historical videos without a script show a truthful unavailable message. There is no deployed ASR service or Workers AI binding.

Clear consonants, short phrases, clean foreground vocals, distinct voices and a quieter instrumental beat remain prompt instructions supported by the dry rap references. A newly generated clip is still required to hear how faithfully H3 raps the approved script.

## Verification (2026-10-24)

126 targeted unit tests, TanStack type checking, the Cloudflare production build and deployment dry run passed. Browser checks covered both required photos, consent, four scenes, topic submission, failed-generation retry without reupload, refresh recovery without a second POST, rejection versus uncertain submission, stale-result exclusion and download retry without a new job. Desktop and 390px mobile screenshots were inspected. The FAQ JSON-LD matches the visible seven answers, the Offer price is zero, and the sitemap retains only the homepage. No real billable AutoDL generation was created.

Deployed Worker version: `90e9f8bd-a23e-4b58-bcbc-fa3b784652d1`. Read-only production browser checks returned HTTP 200 on both `https://ai-rapvideo.co/` and the independent Workers address: four scenes, two uploads, enabled generation button and no displayed price. Zero generation POST requests were sent during these checks. Existing Worker secrets were preserved; no new secret values were uploaded.

### Voice and English-default prompt revision

Deployed Worker version: `668dd328-7bd0-4175-8fdf-37ac640ef6ca`. The 51 existing rap-template, rap-generation and AutoDL-adapter tests passed, as did TanStack type checking, the Cloudflare build and deployment dry run. The compiled server bundle contains the independent voice-casting and English-default instructions; those instructions are absent from the client asset bundle. Deployment preserved the existing variables and secrets. A fresh read-only GET to `https://ai-rapvideo.co/` returned HTTP 200 with the homepage title. The independent Workers hostname timed out during this machine's direct-connect check; this check does not establish its public availability. No real generation or audio listening test was performed for this revision, so vocal quality remains unverified.

### Sequential solo revision after the supplied sample

The user supplied `ai-rap-video.mp4` (12.25 seconds, 768×1376, 24 fps). Frame inspection confirmed both people opening their mouths during much of the later performance. Audio listening was unavailable in this tool session, so voice overlap and timbre observations rely on the user's report. Removed conflicting blanket mouth-motion and performing-together instructions, reduced the choreography to the single handoff documented above, and explicitly bound each inactive mouth to a closed, silent state. The gender-specific lower/higher voice-register distinction also applies to same-gender pairs.

Deployed Worker version: `5253bedb-75a2-4641-ab30-70718e314638`. The same 51 related tests, TanStack type checking, the Cloudflare build and deployment dry run passed. The compiled server bundle contains the solo handoff and revised voice-register instructions; client assets do not. A fresh read-only production homepage request returned HTTP 200. No new billable generation was submitted. These checks confirm deployment of the intended prompt, not that a newly generated video's audio or lip movements obey it.

### Two-step editable lyrics release (2026-10-24)

Deployed Worker version: 240a0b7b-9c21-4e6e-915c-f5ceecb47fcf. All 171 targeted unit tests and 15 mocked browser tests passed, together with TanStack type checking, Cloudflare build and deployment dry run. Desktop and mobile editor/player screenshots were inspected. The final client bundle contains none of the configured server secret values. The DeepSeek key was installed only as a Worker secret; its temporary deployment file was removed.

A real DeepSeek draft request passed before release. After release, the formal homepage, anonymous-session endpoint and lyrics endpoint each returned HTTP 200; the live endpoint returned four English lyrics with zero video-generation requests and zero photo uploads. A separate live headless-browser check did not complete, so production functionality was verified through the actual authenticated API instead. Playback/editing behavior was verified in the browser with mocked generation services. No new H3 video was generated; exact singing fidelity and voice exclusivity remain model-output properties requiring a new sample. Highlight timing is explicitly approximate. The sitemap retains only the homepage.
### Collapsed paragraph editor (2026-10-24)

Worker version: 0dc65b4b-0a97-4675-abab-b419e67c7747. The lyric editor is hidden until drafting succeeds, hidden while drafting/regenerating with a spinner, and shown as one large paragraph textarea. The original generated solo boundaries are preserved until editing; paragraph edits are repartitioned internally without changing word order. Failed regeneration preserves the previous text. Twenty related unit tests, five mocked browser workflows, type checking, build and deployment dry run passed. Existing provider keys were preserved; no real generation call was made for this interface revision.
# Separate performer voice references (2026-10-24)

The generator now submits two real audio references to AutoDL workflow 803:
`ref_audio_0` for the first performer, `ref_audio_1` for the second. Each photo
has an explicit male/female voice selector; defaults are male/female. Same-sex
pairs use two different reference speakers. The server owns the reference URLs;
public requests cannot replace them. Older open tabs without `voices` retain
the default pair. Legacy workflows do not silently discard audio references.

The initial reference release used ordinary Piper TTS samples to distinguish
voice timbres. Those samples did not demonstrate rap flow and are superseded by
the `rap-v2` dry rap references described below. AutoDL's documented zero-based
`<audio 0>` / `<audio 1>` labels bind each reference to its performer.

The performance script requests percussive spoken rap over a 96 BPM boom-bap
beat. Each approved line occupies four beats (2.5 seconds). Old melodic voice
register labels and the permission to sing have been removed. This is still
generative audiovisual synthesis: passing request tests does not prove that
the output has distinct voices, correct lip synchronization, or rap delivery.
Those require listening to an actual completed output.

### Dry rap delivery references (2026-10-24)

The active reference URLs are
`https://ai-rapvideo.co/audio/rap-voices/rap-v2/{male-one,male-two,female-one,female-two}.mp3`.
These are original synthetic rap performances created through AutoDL H3 text
generation, with the audio extracted into local MP3 assets. Their prompts request
dry, percussive rap rather than ordinary TTS narration. Each position retains
a separate reference speaker even when both selected voices have the same
gender.

The prompt now uses both timbre and delivery: short consonants and vowels,
syncopation, strong-beat accents and natural speaking pitch. The former instruction
forbidding reference rhythm was removed because it prevented the samples from
guiding rap flow. Delivery is adapted to the approved script and existing four
time slots; the model must not copy sample words or infer the lyric language
from the reference audio.

The user requested manual testing, so no automated test suite or final user-video
generation is run for this revision. Creating the reusable reference assets is
the implementation itself. The assets have not been claimed to pass a human
listening review; the user will listen to a newly generated result to assess
rap style, vocal gender and separation.

Published Worker version: `3b416a37-be4a-4903-a865-3a51c7b4de2b`. All four
reference-asset creation tasks completed and their soundtracks were extracted
to the deployed static directory. The Cloudflare production build and deployment
completed successfully. No automated tests, post-deploy HTTP checks, or final
user-video generation were run for this revision, as requested. The old TTS files
remain available only for previously submitted jobs; new requests use `rap-v2`.

