"""Import the five owner-provided voices without changing pitch, speed or content."""
import argparse
import hashlib
import json
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[2]

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source-dir', type=Path, required=True)
    args = parser.parse_args()
    catalog = json.loads((ROOT / 'config/rapVoiceSources.json').read_text(encoding='utf-8'))
    output = ROOT / 'apps/tanstack-app/public/audio/rap-voices/owner-v1'
    output.mkdir(parents=True, exist_ok=True)
    records = []
    for voice in catalog.values():
        source = args.source_dir / voice['source']
        target = output / (voice['id'] + '.mp3')
        subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-i', str(source),
                        '-map', '0:a:0', '-vn', '-ac', '1', '-ar', '24000', '-c:a', 'libmp3lame',
                        '-b:a', '128k', str(target)], check=True)
        records.append({'id': voice['id'], 'sourceFile': voice['source'],
                        'sourceSha256': hashlib.sha256(source.read_bytes()).hexdigest(),
                        'outputFile': target.name, 'outputSha256': hashlib.sha256(target.read_bytes()).hexdigest()})
        print(voice['id'] + ': imported', flush=True)
    (output / 'NOTICE.json').write_text(json.dumps({
        'source': 'Five audio files supplied by the site owner in this chat',
        'labels': 'Gender and age groups follow the owner-provided filenames; not independently inferred.',
        'processing': 'Full recording encoded as 24 kHz mono 128 kbps MP3. No pitch, tempo, EQ or content changes.',
        'usage': 'Voice identity references only. Final lyrics language and rap rhythm are controlled separately.',
        'listeningVerified': False, 'files': records,
    }, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

if __name__ == '__main__':
    main()
