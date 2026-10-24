"""Create isolated, fixed-speaker audition assets; never changes the live catalog.

Requires MINIMAX_SPEECH_API_KEY in apps/tanstack-app/.dev.vars.
Run with --apply. Existing identical requests are resumed without recharging.
Official API: https://platform.minimax.io/docs/api-reference/speech-t2a-http
"""
import argparse
import hashlib
import html
import json
import os
from pathlib import Path
import re
import urllib.error
import urllib.request

ROOT = Path(__file__).resolve().parents[2]
OUTPUT = ROOT / '.tmp' / 'fixed-voice-candidates'


def settings():
    values = {}
    for line in (ROOT / 'apps/tanstack-app/.dev.vars').read_text(encoding='utf-8-sig').splitlines():
        if '=' in line and not line.lstrip().startswith('#'):
            key, value = line.split('=', 1)
            values[key.strip()] = value.strip().strip('"').strip("'")
    return values


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--apply', action='store_true')
    args = parser.parse_args()
    if not args.apply:
        parser.error('--apply is required to create paid reference assets')
    env = settings()
    key = os.environ.get('MINIMAX_SPEECH_API_KEY') or env.get('MINIMAX_SPEECH_API_KEY')
    if not key:
        raise SystemExit('Fill MINIMAX_SPEECH_API_KEY in apps/tanstack-app/.dev.vars. No requests made.')
    base = env.get('MINIMAX_SPEECH_BASE_URL', 'https://api.minimaxi.com').rstrip('/')
    if base not in ('https://api.minimaxi.com', 'https://api.minimax.io'):
        raise SystemExit('Only official MiniMax speech endpoints are allowed.')
    config = json.loads((ROOT / 'config/rapVoiceCandidates.json').read_text(encoding='utf-8'))
    voices = config['voices']
    if len({v['voiceId'] for v in voices}) != len(voices):
        raise SystemExit('Each candidate must use a distinct speaker ID.')
    OUTPUT.mkdir(parents=True, exist_ok=True)
    for voice in voices:
        if not re.fullmatch(r'[a-z0-9-]+', voice['id']):
            raise SystemExit('Invalid candidate ID.')
        body = {
            'model': config['model'], 'text': config['text'], 'stream': False,
            'language_boost': 'English', 'output_format': 'hex',
            'voice_setting': {'voice_id': voice['voiceId'], 'speed': 1, 'vol': 1, 'pitch': 0},
            'audio_setting': {'sample_rate': 32000, 'bitrate': 128000, 'format': 'mp3', 'channel': 1},
        }
        fingerprint = hashlib.sha256(json.dumps(body, sort_keys=True).encode()).hexdigest()
        destination = OUTPUT / f"{voice['id']}.mp3"
        metadata = OUTPUT / f"{voice['id']}.json"
        if metadata.exists():
            old = json.loads(metadata.read_text(encoding='utf-8'))
            if old.get('requestHash') != fingerprint:
                raise SystemExit(f"{voice['id']}: settings changed; use a new candidate ID.")
            if old.get('complete') and destination.exists() and hashlib.sha256(destination.read_bytes()).hexdigest() == old.get('sha256'):
                print(f"{voice['id']}: already saved", flush=True)
                continue
            raise SystemExit(f"{voice['id']}: earlier request unresolved; inspect before retrying to avoid duplicate charges.")
        record = {**voice, 'requestHash': fingerprint, 'complete': False, 'listeningVerified': False}
        metadata.write_text(json.dumps(record, indent=2, ensure_ascii=False), encoding='utf-8')
        request = urllib.request.Request(base + '/v1/t2a_v2', data=json.dumps(body).encode(), headers={
            'Authorization': 'Bearer ' + key, 'Content-Type': 'application/json',
        })
        try:
            with urllib.request.urlopen(request, timeout=120) as response:
                result = json.load(response)
        except urllib.error.HTTPError as error:
            raise SystemExit(f"{voice['id']}: HTTP {error.code}; no automatic retry.") from None
        except Exception:
            raise SystemExit(f"{voice['id']}: request outcome uncertain; no automatic retry.") from None
        status = result.get('base_resp', {}).get('status_code')
        if status != 0:
            raise SystemExit(f"{voice['id']}: provider status {status}; no automatic retry.")
        if result.get('data', {}).get('status') != 2:
            raise SystemExit(f"{voice['id']}: incomplete synthesis response; no automatic retry.")
        audio_hex = result.get('data', {}).get('audio', '')
        if not isinstance(audio_hex, str) or len(audio_hex) < 200 or len(audio_hex) % 2 or not re.fullmatch('[0-9a-fA-F]+', audio_hex):
            raise SystemExit(f"{voice['id']}: missing complete hex audio; do not resubmit automatically.")
        destination.write_bytes(bytes.fromhex(audio_hex))
        record.update(complete=True, sha256=hashlib.sha256(destination.read_bytes()).hexdigest(), model=config['model'])
        metadata.write_text(json.dumps(record, indent=2, ensure_ascii=False), encoding='utf-8')
        print(f"{voice['id']}: saved for manual listening", flush=True)
    cards = ''.join(f'<section><h2>{html.escape(v["label"])}</h2><p>{html.escape(v["voiceId"])}</p><audio controls preload="none" src="{v["id"]}.mp3"></audio></section>' for v in voices)
    (OUTPUT / 'index.html').write_text('<!doctype html><html lang="zh-CN"><meta charset="utf-8"><title>音色候选试听</title><style>body{max-width:800px;margin:40px auto;background:#141020;color:#eee;font:18px sans-serif}section{padding:20px;border-bottom:1px solid #555}audio{width:100%}</style><h1>固定说话人音色候选</h1><p>相同英文文本、原始音高。请比较音色；这是语音参考，不代表最终 rap 效果。尚未替换线上素材。</p>' + cards + '</html>', encoding='utf-8')
    print('Candidate preview saved. Production catalog unchanged.', flush=True)


if __name__ == '__main__':
    main()
