# AI Rap Video direct generation

The deployed TanStack homepage now uses free direct generation. New requests do not create Stripe checkouts or consume user credits. Historical paid-order verification and recovery remain available.

## Current voice library: owner-supplied recordings

### Rap delivery revision

The owner reported conversational delivery for task `ukO8TeibXEXt8U6FQeAQH`. Its saved English lyrics use four birthday-greeting lines; the prior drafting instructions requested 4–6 words and "unhurried" delivery. This is an owner listening report plus source/task inspection, not an independent audio assessment.

Lyric drafting and the video prompt now share a 96 BPM target (`RAP_TEMPO_BPM`). New drafts target 6–8 short English words and roughly 8–12 syllables per bar, paired end rhymes and internal rhythmic groups. The video prompt explicitly requests four-beat MC bars with eighth-note bursts, occasional offbeat pickups, backbeat accents and audible drums. Delivery guidance sits outside literal dialogue tags, preserving approved lyrics verbatim and the existing solo windows. Source voices supply identity/timbre only. Existing edited lyrics are never rewritten on video submission; users must regenerate lyrics to get the new drafting style.

These are generation targets, not guaranteed audio timing or proof of rap quality. No paid synthesis, final-video acceptance run or automated test is performed for this revision. If voice-conditioned H3 continues to reproduce speech cadence, a separate controlled rap-audio and lip-sync pipeline needs evaluation rather than treating more prompt adjectives as a guaranteed solution.

Submission fix: `validateStoredPhotos` previously sent the third, built-in rap scene through the R2 user-upload ownership validator. Since that asset uses the website origin rather than the upload origin, every current three-image request was rejected before provider submission, surfaced as `video_service_unavailable`. The validator now recognizes only an exact configured scene URL in position 3 for the rap workflow. Both performer photos still undergo ownership and R2 existence validation; arbitrary website URLs do not receive an exemption. No paid generation is used to verify this change, per the owner's instruction.

The active catalog is `config/rapVoiceSources.json`: five supplied WAV files, labelled young/middle-aged/older male and young/middle-aged female by the owner. `scripts/manual/import-owner-rap-voices.py --source-dir C:/Users/zhouw/Downloads` encodes the complete recordings as 24 kHz mono 128 kbps MP3 under `public/audio/rap-voices/owner-v1/`, with no pitch, tempo, EQ or content edits. A manifest records source/output hashes. Source WAV files remain untouched.

Both preview and H3 reference URLs use this catalog. Each recording is independent of performer position; there is no invented A/B variation. The UI disables the other performer's selected voice, and the server rejects duplicate choices, including legacy gender aliases. The older female option is absent until a corresponding recording is provided. The former H3-generated v3 library and MiniMax candidate script remain archived locally and are not selected by the active catalog.

The prompt references speaker identity/timbre only, not source speech language or cadence. Approved lyric language and rap timing remain explicit. No final-video generation or listening acceptance is performed; the owner handles manual evaluation. Type checking and the production build passed. Cloudflare deployed Worker version `6ec68ab6-e85f-43b0-8549-ec930fc46118` with all five MP3 assets. No automated tests or paid generation calls were run for this replacement.

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

### Active image and separated-audio references

The public video request still contains exactly the two uploaded people. The server
adds the selected built-in, empty scene image as the third image reference. Image 1
and image 2 define the left and right identities; image 3 supplies only the set,
lighting, and central microphone. New scene-reference assets are separate from the
existing display thumbnails. The default stage is the plain Orange Studio, with
one hanging microphone, instead of the previous hotel lounge.

The source clip for the extracted audio is the site owner's supplied
`friends.mp4`. A local source-separation model produces the instrumental and vocal
stems. Its instrumental remains the shared BGM reference. New voice selections
use the original synthetic `rap-v3` voice library described below. The previously
extracted vocal stem and time-window crops remain available for older jobs.

Each generation submits three audio references: performer 1, performer 2, and BGM.
The prompt binds `<audio 0>` and `<audio 1>` only to their performer and describes
`<audio 2>` as instrumental style and groove, never a third voice. Reference words
must not replace the approved lyrics. This is reference-based generation, not
post-production copying of the BGM into the finished video.

AutoDL 803 documents its audio inputs primarily as speaker references. Assigning
the third input to music is an explicit prompt instruction, not a separately
documented BGM parameter; its actual output behavior remains for the owner's
manual generation review. No additional user-video generation is submitted to
test this revision.

### H3 prompt structure and timed actions

The prompt follows the six sections in the [official H3 full-reference guide](https://github.com/MiniMax-AI/MiniMax-H3/blob/main/skills/h3-prompt-writing/references/ref-en.txt):
`subject_definitions`, `summary`, `retention_analysis`, `detailed_description`,
`overall_soundscape`, and `non_diegetic_music`. The empty environment is defined
as `<Subject 3>` from `<Picture 3>`; it is not a third performer. Audio labels
retain the AutoDL wrapper's zero-based spelling `<audio 0>` through `<audio 2>`.

`detailed_description` establishes the live-action style before `[Shot 1]` and
describes one uncut waist-up portrait composition. Time ranges are phases inside
this shot, not new shot or cut markers. Each phase pairs the active performer's
concrete movement and exact approved lyric with the listener's closed-mouth,
silent state. These intervals remain aligned with the lyrics player:

| Seconds | Action and voice |
| --- | --- |
| 0–0.5 | Both settle with hands low, mouths closed, one preparatory nod; instrumental intro. |
| 0.5–3 | Person 1 raises the outside hand to chest height, extends an open palm, and raps line 1. Person 2 listens silently with closed lips. |
| 3–5.5 | Person 1 lowers the hand with two small wrist pulses and raps line 2, closing their mouth at 5.5. Person 2 remains silent. |
| 5.5–6 | Both mouths closed; person 1 lowers both hands, person 2 gives an anticipatory nod; instrumental handoff. |
| 6–8.5 | Person 2 raises the outside hand for a compact open-palm sweep and raps line 3. Person 1 listens silently with closed lips. |
| 8.5–11 | Person 2 draws the hand back with two small wrist pulses and raps line 4, closing their mouth at 11. Person 1 remains silent. |
| 11–12 | Both lower hands, give one small nod and closed-mouth smiles; instrumental outro. |

Hands remain below faces and clear of the central microphone. Positions and
camera remain fixed. The prompt uses `fully_preserved` for the two identities
and empty set, and `reference` for audio timbre, flow, and instrumental groove.
It requests new rhythmic spoken rap from the approved script, without melodic
vowels, extra words, or overlapping voices. Timing and audio compliance remain
model-output properties for the owner's manual review.

Deployment of the separated-reference and timed-action revision: Worker version
`a9b1a8b2-99eb-4f57-b782-421f073fffcf` on `ai-rapvideo.co` and
`www.ai-rapvideo.co`. TanStack type checking and the Cloudflare production build
completed successfully. The deployed static bundle contains the four empty
scene references and all four `friends-reference-v1` MP3 files. Existing Worker
variables and secrets were preserved with `--keep-vars`. At the owner's request,
no test suite, new video generation, or listening acceptance test was run.

`config/rapVideo.ts` contains the public fixed settings and four scene cards:

- Workflow: `minimax_h3_803`.
- Duration: 12 seconds.
- Resolution: `768p竖(768*1376)`.
- Mode: `高质模式`.
- Scenes: Orange Studio, Luxury Lobby, Studio Booth and Street Cypher.
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

`POST /api/video-generate/` returns the persisted task ID. Existing status and download endpoints deliver the result. Refresh recovers the current task; it never submits a new generation. The server validates ownership of both photos, the scene, topic, selected voices and all four lyrics before calling AutoDL. New jobs use two appearance references, one server-selected empty scene image, two server-selected rap voice references, one instrumental reference, and the four exact approved lines, with generated rap vocals and a beat. No reference video, default second person or separate per-request audio-generation service is required. The submitted script is frozen in existing task JSON before completion and retained in the finished result, without a database migration.

The in-flight admission guard permits one active request per browser/account. Once a run completes, the visitor may generate another. Provider status/download errors retry the existing task. Managed uploaded photos and saved videos retain the existing scheduled 24-hour deletion policy.

Automated verification uses mocked AutoDL responses. A real provider generation remains a separately identifiable billable request; mock success does not certify rap quality or mouth synchronization.

## Voice casting

### Twelve-sample voice library

Current status: all 12 original tasks completed and their MP3 references are
present. The original `female-senior-a` task eventually succeeded; its existing
result was downloaded without submitting or charging a new
generation task in this completion step. The temporary availability override has
been removed, enabling person 1's older-female style as well. All six profiles
now have independent A/B reference assets and per-person previews.

Completion release: Worker `00c36217-58f1-4759-ae18-1ac5c8da1d21` deployed to
`ai-rapvideo.co` and `www.ai-rapvideo.co`. Type checking and the production build
passed, and the deployment bundle contains all 12 MP3 files. Existing variables
and secrets were preserved. No new generation task, automated test suite, or
listening acceptance test was performed during this completion step.

Availability on initial release: 11 of the 12 planned samples completed. The
original `female-senior-a` task remained RUNNING for over 28 minutes; a replacement
submission was rejected by AutoDL with `BadRequest: 余额不足，请先充值` and returned
no task ID. The original task ID and state are preserved in the ignored progress
file. This sample is explicitly `available: false` in the catalog: person 1's
older-female option is disabled and labeled Preparing, and the server also
rejects that unavailable selection. Person 2's older-female sample is ready.
No placeholder or another age profile was substituted. The completion release
removes that availability override and includes the original successful sample.

Published Worker version: `1bcc2996-0926-48c8-92ad-7fdd92c2afd1`, with the 11 ready
MP3s, six profile choices, per-person previews, and the pending selection disabled
on both client and server. Type checking and the Cloudflare build passed. Existing
Worker variables/secrets were preserved. No automated test suite, listening
acceptance test, or end-user video-generation test was run. The original pending
provider task was not cancelled; local polling processes have been stopped.

`config/rapVoiceCatalog.json` defines male/female voices in young-adult, mature,
and older-adult styles, with independent A/B samples for each of the six profiles.
The assets are original fictional solo performances created through the existing
AutoDL text-generation workflow `minimax_h3_z0901`; each has its own task, seed,
resonance/texture direction and ten-second acapella performance. They are not
pitch-shifted copies of one speaker. Requested age and vocal characteristics are
generation targets, not a claim of human listening verification.

`config/rapVoices.ts` selects A for person 1 and B for person 2. Same-profile pairs
therefore always use separate reference IDs and files. The six valid profile keys
are validated server-side; legacy `male` and `female` values map to the respective
young-adult profile. Arbitrary audio URLs are still rejected. The frontend offers
six voice-style choices per person and a collapsed audio preview of that exact
person's assigned sample. Previewing a static file creates no generation task.
Changing a voice replaces its preview audio element, stopping previous playback.

The script `node scripts/manual/generate-rap-voice-assets.mjs --apply --catalog-v3`
creates/resumes the assets and extracts their soundtracks to
`public/audio/rap-voices/rap-v3/`. Task IDs and original generated media remain in
the ignored `.tmp/rap-voice-assets-v3/`; the deployed NOTICE records provenance.
An uncertain submission is never automatically resubmitted. The script creates
the library deliverables, not test videos featuring user-uploaded people.

The prompt explicitly binds each selected profile's gender, age character,
resonance, and delivery to its own person. Photo appearance does not override a
user's selected voice. H3 still generates the final vocals; whether it maintains
the selected contrast must be judged by the owner using the previews and output.

### Performance binding

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

### Reference-informed performer motion (2026-10-25)

Compared half-second frames from the owner's `friends.mp4` reference with the
latest generated result. The reference uses a closer waist-level two-shot,
camera-pointing, chest-level two-hand accents, a raised index finger, forward
leans and continuous silent-partner reactions. The previous prompt's steady
shoulders, low hands and restrained listener instructions suppressed these moves.

The current motion description specifies gesture preparation, beat accent and
recovery within each lyric window, a tighter crop, and continuous shoulder/head
rhythm for both performers. The reference's earlier speaker change is retimed
to the existing solo windows: S1 at 0.5–5.5 seconds and S2 at 6–11 seconds.
Only the active performer mouths lyrics; the silent partner remains expressive.

This is text-directed choreography, not reference-video motion transfer. The
current adapter still sends two portraits, one scene image, two selected
`owner-v1` voice samples and the existing BGM; it does not submit `friends.mp4`.
Exact poses and frame-level reproduction are not guaranteed. Type checking and
the production build passed. No automated test suite or new paid video-generation
task was run; actual motion quality is left for the owner's manual evaluation.

### Stronger instrumental mix direction (2026-10-25)

The owner reported that generated background music was too quiet. The prompt
previously placed lead vocals clearly in front without specifying a sustained
instrumental level. The summary and music section now request a music-forward
mix with drums and bass nearly as prominent as the vocal, which stays only
slightly above the beat for intelligibility. Every lyric line should retain
audible kick, snare, hi-hats and bass; the beat should not duck when vocals enter.
The soundscape section clarifies that quiet ambience and silent handoffs apply
to room noise and voices, never to the instrumental.

This changes generation instructions, not a numeric mixer control. The current
adapter sends reference audio to H3 and does not separately mix the output
stems. Actual output balance still requires the owner's manual listening check;
no new video-generation task or automated test suite is run for this change.

Read-only FFmpeg measurements found the existing BGM at -18.00 LUFS / -4.15
dBTP, compared with -28.84 LUFS / -8.64 dBTP for `male-young` and -32.97 LUFS /
-11.40 dBTP for `female-young`. The BGM reference is already louder than those
voice-reference files, so its gain and asset URL were left unchanged. Reference
file levels do not establish or control the generated output's music/vocal ratio.

### Topic-selected shared ending (2026-10-25)

The owner approved a joint final line and theme-specific closing gesture, with
the explicit constraint that the successful earlier choreography stay unchanged.
The 0.0–8.5-second motion paragraphs are retained verbatim. The existing fourth
line at 8.5–11.0 seconds is now performed by `(S1,S2)` in rhythmic unison, retaining
each selected voice; 11.0–12.0 seconds completes the preset's recovery and smile.
The 12-second duration, four-line editor, first three cue times, reference assets,
96 BPM and stronger instrumental direction are retained. No fifth line is added.

The existing DeepSeek lyric request also selects one bounded `endingAction`:
`celebrate`, `friendship`, `team`, `affection`, `victory`, `playful` or `groove`.
Only the explicit user topic informs that selection; arbitrary topics, missing
or invalid IDs use `groove`. The model never supplies executable choreography.
`config/rapEndings.ts` owns each gesture's preparation, final-word accent and
recovery. Scene-specific space constraints adapt that same gesture without
changing the earlier movements or adding props. There is no extra model call.

The optional action travels with approved lyrics and survives paragraph editing.
New submissions always save an action, including the neutral fallback for older
drafts. Historical saved tasks without the field retain their original solo
fourth-line playback labels. New fourth-line cues identify both performers.
Changing the topic after drafting preserves the words, uses the neutral ending
and prompts the user to regenerate lyrics to refresh the theme-selected action.

No generated video or automated test suite is used for acceptance: the owner
will manually evaluate voices, unison and gesture synchrony in the next output.
Prompt timing is an instruction, not a guarantee of measured audiovisual timing.

Type checking and the Cloudflare production build passed. Published Worker
version: `b675356b-4244-40ef-95aa-a3868f8514ab`. The source diff confirms the
0.0–8.5-second choreography paragraphs were retained verbatim. No test video
or live DeepSeek request was submitted for this release.

### Explicit speaker binding at every vocal event (2026-10-25)

For task `bkWYU8IYi587lx8aACy86`, the saved approved lyrics assign the first two
lines to Person 1, the third to Person 2 and the fourth to Both, with the
`celebrate` ending. These labels describe the submitted plan, not detected voices
in the finished video. Frame inspection also shows a late visible handoff and
continued mouth movement by the first performer during the second solo; it does
not establish the audible timbres. The owner reports hearing the male voice
throughout. Free-task storage and the provider result endpoint do not retain or
return the original selected voice inputs, so those exact historical inputs
cannot be retrospectively confirmed from the available task record.

The prompt previously defined speaker IDs at the start but used bare S1/S2
names at the solo vocal events. H3's full-reference guide section 5.4 requires
the visual subject and corresponding speaker ID at each vocal event. The audio
definitions and each solo now explicitly bind `<Subject 1> (S1)` to `<audio 0>`
and `<Subject 2> (S2)` to `<audio 1>`. The third line explicitly stops the first
voice. The shared final utterance carries `(S1,S2)` and requests two separately
identifiable reference-bound voices rather than doubling the first voice.
Source: https://huggingface.co/MiniMaxAI/MiniMax-H3/blob/main/docs/VIDEO_PROMPT_WRITING_GUIDE_ref_en.md#54-speakers-audio-sources-and-dialogue

The adapter's zero-based audio labels, existing reference assets, BGM, lyrics,
timings, early choreography and accepted closing gesture are unchanged. This
corrects a documented prompt-format deficiency; it does not prove that formatting
was the sole cause or guarantee the model will follow the voice assignment.
Type checking and the production build passed. No automated test suite, lyric
generation or new video-generation task was run. The owner will evaluate the
next generated video's actual voice handoff and joint final line manually.

Published Worker version: `16dc5b86-e06b-4628-9567-443088007255`.


### Compact lyrics editor and performer order (2026-10-25)

Removed the language selector: lyric generation always requests English. Edited
text uses an auto language mode that instructs H3 to preserve the literal lyric
language (including mixed languages), rather than translating it to English.
Existing generated line boundaries remain intact until the paragraph is edited.
The textarea displays two lines with scrolling for wrapped content. A Swap people
button exchanges both photos and their selected voices; a caption explains that
Person 1 sings first, Person 2 follows and both perform the final phrase.
Type checking passed. No automated tests or paid generation requests were run.

### Audio reference duration budget (2026-10-25)

The owner reported a single male timbre again in `G6ggsvbFazHWyIMue-LWc`
(provider task `d19b0366-4e38-4b6f-bce9-ec2beb937257`). Its saved approved script
correctly assigns two opening lines to Person 1, one to Person 2 and a shared
ending. Historical tasks do not record the selected references, so the exact
selection for this task cannot be established from storage. Read-only checks of
all five deployed voice URLs returned audio/mpeg, HTTP 200, distinct hashes and
byte-for-byte agreement with local owner-v1 files.

A concrete contract violation was found: H3 permits at most three audio clips,
each 2–15 seconds, with at most 15 seconds combined. The previous default pair
(5.985750 + 5.171292 seconds) plus the 12.096009-second BGM totals 23.253051
seconds. AutoDL's public workflow schema has no documented override of this
limit. Its public parameters also have no hard per-utterance voice routing.
Sources:
- https://huggingface.co/MiniMaxAI/MiniMax-H3/blob/main/README.md#model-variants-and-input-specifications
- https://www.autodl.art/api/v1/comfyui/workflows/minimax_h3_803

New submissions preserve both complete owner-supplied voice files and use
`friends-reference-v1/bgm-reference-2s.wav`: the first exactly 2.000000 seconds
of the existing instrumental, decoded as 32 kHz PCM without tempo/pitch/gain
changes. Default cumulative reference length is 13.157042 seconds; the longest
allowed distinct pair totals 14.982500 seconds including BGM. The reference is
only a music-style sample; requested output duration remains 12 seconds.

Measured voice durations are now part of the catalog and refreshed by the owner
voice importer. Server-side plan construction rejects audio durations outside
the individual or cumulative limits. The plan's public asset IDs, URLs, durations
and version are saved with each new temporary task and retained on completion.
No keys, uploaded photos or raw prompt text are added to this diagnostic record.
Existing choreography, prompt, lyric assignments and original audio assets are
unchanged. No automated tests, lyric request or paid generation was run.

This fixes an objectively invalid reference budget, not a proven cause of the
specific timbre collapse: AutoDL does not expose how overlong references are
handled internally. Speaker labels remain generative guidance; they are not
independent, deterministically routed audio tracks. New output requires the
owner's manual listening assessment.

Type checking and the Cloudflare production build passed. Published Worker
version: `eab42368-cd26-4b9d-88bd-1b82df51e0bf`. Audio output quality is not
claimed verified; no test generation was submitted.
