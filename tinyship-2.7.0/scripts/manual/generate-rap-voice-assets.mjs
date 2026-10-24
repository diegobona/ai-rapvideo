// One-time production asset creation, never imported by the app or its build.
// --apply creates the four deliverable voices; an existing task is resumed.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { parse } from 'dotenv';
import { ProxyAgent, setGlobalDispatcher } from 'undici';

if (!process.argv.includes('--apply')) throw new Error('Pass --apply to create the four production reference assets.');
const root = new URL('../../', import.meta.url);
const work = new URL('.tmp/rap-voice-assets-v2/', root);
const output = new URL('apps/tanstack-app/public/audio/rap-voices/rap-v2/', root);
const stateFile = new URL('tasks.json', work);
const workflow = 'minimax_h3_z0901';
const voices = [
  { name: 'male-one', seed: 46197021, person: 'adult man', voice: 'distinctly masculine, deep, chest-resonant, grainy and weighty; clipped low-pitched consonants' },
  { name: 'male-two', seed: 91368042, person: 'adult man', voice: 'distinctly masculine, lean, bright, slightly nasal and forward; quick dry attacks, lighter pitch than a deep male voice' },
  { name: 'female-one', seed: 30875063, person: 'adult woman', voice: 'distinctly feminine female voice, clear, bright and cutting, agile percussive articulation in a natural female speaking range' },
  { name: 'female-two', seed: 75214084, person: 'adult woman', voice: 'distinctly feminine female voice, warm, husky, rounded and assertive, lower female speaking range with crisp consonants' },
];

function prompt(voice) {
  return `integrated_multimodal_description:
[Shot 1] A single fictional ${voice.person}, an experienced battle MC, stands alone at a dry studio microphone in a quiet sound-treated booth. Static waist-up shot. The entire audio is ONE isolated solo English rap vocal, recorded close to the microphone, like an unaccompanied hip-hop battle verse for a vocal sample pack. The MC (S1) has a ${voice.voice}. Start the verse immediately and keep that one voice unchanged.
Delivery is emphatic rhythmic SPEECH, an old-school boom-bap rap flow at 96 BPM, four bars in 4/4. Strong consonant attacks, syncopated sixteenth-note syllables, sharp stress on beats two and four, tight phrase endings and small rhythmic pauses. Every vowel is short. Pitch stays in the natural speech range; rhythmic accent, breath and attitude provide the expression. This is acapella rap with no instrumental accompaniment, no melodic singing, held notes, crooning, vibrato, sung hook or Auto-Tune. It must sound like a rapper spitting bars, not reading a sentence aloud or performing a pop ballad. The MC's lips articulate these four original bars, one per 2.5 seconds:
From 0.0 to 2.5 seconds, the ${voice.person} (S1) raps with clipped syncopated accents: <d>[English]Kick, snap, step, let the rhythm connect.</d>
From 2.5 to 5.0 seconds, the same MC (S1) punches each stressed syllable: <d>[English]Sharp with the bars, every word lands correct.</d>
From 5.0 to 7.5 seconds, the same MC (S1) continues the percussive flow: <d>[English]Tick, tack, switch, put the stress on the snare.</d>
From 7.5 to 10.0 seconds, the same MC (S1) finishes the last rap bar cleanly: <d>[English]My voice cuts through, put your hands in the air.</d>
Only this MC vocalizes. No ad-libs, vocal doubles, backing voices, harmony, crowd, narration or extra words. Keep mouth and voice synchronized. No titles or subtitles.

overall_soundscape:
One dry, isolated, intelligible human rap vocal only. Sound-treated studio silence between syllables and phrases; no audible room reverb, metronome, percussion, bass, instruments, or other sound layers.

non_diegetic_music:
N/A. No music or beat is present in this isolated acapella reference; the 96 BPM pulse is expressed by the voice's rhythm alone.`;
}

async function main() {
  const variables = parse(await readFile(new URL('apps/tanstack-app/.dev.vars', root), 'utf8'));
  const key = variables.AUTODL_API_KEY?.trim();
  if (!key) throw new Error('AUTODL_API_KEY is not configured');
  // Read the existing proxy for this process only; never modify machine rules.
  if (process.platform === 'win32' && !process.env.HTTPS_PROXY) {
    try {
      const server = execFileSync('powershell.exe', ['-NoProfile', '-Command',
        "$rapAssetProxy = Get-ItemProperty -LiteralPath 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings'; if ($rapAssetProxy.ProxyEnable -eq 1) { $rapAssetProxy.ProxyServer }",
      ], { encoding: 'utf8', windowsHide: true }).trim();
      const proxy = server.split(';').find(value => value.startsWith('https='))?.slice(6) || (!server.includes('=') ? server : '');
      if (proxy) setGlobalDispatcher(new ProxyAgent(proxy.includes('://') ? proxy : `http://${proxy}`));
    } catch { /* Use ordinary direct connections when no proxy is configured. */ }
  } else if (process.env.HTTPS_PROXY) {
    setGlobalDispatcher(new ProxyAgent(process.env.HTTPS_PROXY));
  }
  await mkdir(work, { recursive: true });
  await mkdir(output, { recursive: true });
  let state = {};
  try { state = JSON.parse(await readFile(stateFile, 'utf8')); } catch { /* First asset build. */ }
  const save = () => writeFile(stateFile, JSON.stringify(state, null, 2));
  async function request(path, body) {
    const response = await fetch(`https://autodl.art/api/v1/comfyui/comfyui_workflow/${path}`, {
      method: body ? 'POST' : 'GET',
      headers: { Authorization: key, 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(60_000),
    });
    if (!response.ok) throw new Error(`AutoDL HTTP ${response.status}`);
    const envelope = await response.json();
    if (envelope.code !== 'Success' || !envelope.data) throw new Error(`AutoDL ${String(envelope.code || 'invalid_response')}`);
    return envelope.data;
  }
  for (const voice of voices) {
    if (state[voice.name]?.taskId) continue;
    if (state[voice.name]?.submissionUncertain) throw new Error(`Uncertain previous submission for ${voice.name}; do not submit again automatically`);
    const body = { prompt: prompt(voice), duration: 10, resolution: '480p横(864*480)', seed: voice.seed };
    await writeFile(new URL(`${voice.name}-request.json`, work), JSON.stringify(body, null, 2));
    state[voice.name] = { submissionUncertain: true, workflow };
    await save();
    const task = await request(workflow, body);
    if (typeof task.task_id !== 'string' || !task.task_id) throw new Error('Missing asset task ID');
    state[voice.name] = { workflow, taskId: task.task_id };
    await save();
    console.log(JSON.stringify({ asset: voice.name, stage: 'submitted', taskId: task.task_id }));
  }
  for (let round = 0; round < 120; round++) {
    for (const voice of voices) {
      const item = state[voice.name];
      const audioFile = new URL(`${voice.name}.mp3`, output);
      if (item.complete && existsSync(audioFile)) continue;
      let videoFile = new URL(`${voice.name}.mp4`, work);
      if (!existsSync(videoFile)) {
        const data = await request(`result/${encodeURIComponent(item.taskId)}`);
        const status = String(data.status || '').toUpperCase();
        if (item.status !== status) console.log(JSON.stringify({ asset: voice.name, stage: status }));
        item.status = status;
        await save();
        if (['FAILED', 'CANCELLED', 'CANCELED'].includes(status)) throw new Error(`Asset ${voice.name} failed`);
        if (!['SUCCESS', 'COMPLETED'].includes(status)) continue;
        const result = data.results?.find(value => value && value.type === 'video' && value.file_type === 'mp4' && typeof value.url === 'string');
        if (!result) throw new Error(`No video soundtrack for ${voice.name}`);
        const response = await fetch(result.url, { signal: AbortSignal.timeout(120_000) });
        if (!response.ok) throw new Error(`Asset download HTTP ${response.status}`);
        await writeFile(videoFile, Buffer.from(await response.arrayBuffer()));
      }
      const converted = spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', fileURLToPath(videoFile),
        '-map', '0:a:0', '-vn', '-t', '10', '-ac', '1', '-ar', '24000', '-af', 'loudnorm=I=-19:TP=-2:LRA=7',
        '-c:a', 'libmp3lame', '-b:a', '128k', fileURLToPath(audioFile)], { windowsHide: true, encoding: 'utf8' });
      if (converted.status !== 0) throw new Error(`Soundtrack extraction failed for ${voice.name}`);
      item.complete = true;
      await save();
      console.log(JSON.stringify({ asset: voice.name, stage: 'written', file: fileURLToPath(audioFile), listeningVerified: false }));
    }
    if (voices.every(voice => state[voice.name]?.complete)) {
      console.log(JSON.stringify({ stage: 'all_four_assets_ready', workflow, listeningVerified: false }));
      return;
    }
    await new Promise(resolve => setTimeout(resolve, 10_000));
  }
  throw new Error('Asset preparation is still pending; rerun to resume existing tasks');
}

main().catch(error => { console.error(JSON.stringify({ stage: 'asset_preparation_failed', message: error.message })); process.exitCode = 1; });
