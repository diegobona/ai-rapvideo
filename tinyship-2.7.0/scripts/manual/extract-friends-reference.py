"""Build local vocal and instrumental references with the official UVR MDX model.

Run in a local environment with numpy and onnxruntime installed. FFmpeg must be
on PATH. Model and official metadata are downloaded separately into .tmp; this
script never uploads media or calls a generation API.

The numpy STFT follows UVR's periodic Hann, reflected center padding, channel
packing, three-bin low-frequency cutoff, and inverse overlap-add convention.
Official implementation: https://github.com/Anjok07/ultimatevocalremovergui
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import subprocess
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import onnxruntime as ort


ROOT = Path(__file__).resolve().parents[2]
WORK = ROOT / ".tmp" / "media-separation"
RATE = 44100
HOP = 1024


def command(arguments: list[str], data: bytes | None = None) -> bytes:
    return subprocess.run(arguments, input=data, check=True, capture_output=True).stdout


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def stft(wave: np.ndarray, n_fft: int, dim_f: int) -> np.ndarray:
    centered = np.pad(wave, ((0, 0), (n_fft // 2, n_fft // 2)), mode="reflect")
    frames = np.lib.stride_tricks.sliding_window_view(centered, n_fft, axis=-1)[:, ::HOP]
    window = np.hanning(n_fft + 1)[:-1].astype(np.float32)
    spectrum = np.fft.rfft(frames * window, axis=-1).transpose(0, 2, 1)
    packed = np.stack((spectrum.real, spectrum.imag), axis=1)
    return np.ascontiguousarray(packed.reshape(1, 4, n_fft // 2 + 1, -1)[:, :, :dim_f], dtype=np.float32)


def istft(spectrum: np.ndarray, n_fft: int, length: int) -> np.ndarray:
    dim_f, frame_count = spectrum.shape[-2:]
    pairs = spectrum.reshape(2, 2, dim_f, frame_count)
    complex_spectrum = pairs[:, 0] + 1j * pairs[:, 1]
    complex_spectrum = np.pad(complex_spectrum, ((0, 0), (0, n_fft // 2 + 1 - dim_f), (0, 0)))
    window = np.hanning(n_fft + 1)[:-1].astype(np.float32)
    frames = np.fft.irfft(complex_spectrum.transpose(0, 2, 1), n=n_fft, axis=-1) * window
    padded_length = HOP * (frame_count - 1) + n_fft
    wave = np.zeros((2, padded_length), dtype=np.float32)
    weight = np.zeros(padded_length, dtype=np.float32)
    for frame_index in range(frame_count):
        offset = frame_index * HOP
        wave[:, offset:offset + n_fft] += frames[:, frame_index]
        weight[offset:offset + n_fft] += window * window
    wave /= np.maximum(weight, 1e-8)
    return wave[:, n_fft // 2:n_fft // 2 + length]


def save_audio(wave: np.ndarray, path: Path, codec: str, start: float | None = None, duration: float | None = None) -> None:
    data = np.ascontiguousarray(wave.T, dtype="<f4").tobytes()
    args = ["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-f", "f32le", "-ar", str(RATE), "-ac", "2", "-i", "pipe:0"]
    if start is not None:
        args += ["-ss", str(start)]
    if duration is not None:
        args += ["-t", str(duration)]
    args += ["-c:a", codec]
    if codec == "libmp3lame":
        args += ["-b:a", "192k"]
    args += [str(path)]
    command(args, data)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, default=Path("C:/Users/zhouw/Downloads/friends.mp4"))
    parser.add_argument("--model", type=Path, default=WORK / "UVR-MDX-NET-Inst_HQ_3.onnx")
    parser.add_argument("--model-data", type=Path, default=WORK / "model_data.json")
    parser.add_argument("--output", type=Path, default=ROOT / "apps/tanstack-app/public/audio/rap-voices/friends-reference-v1")
    args = parser.parse_args()
    args.output.mkdir(parents=True, exist_ok=True)
    WORK.mkdir(parents=True, exist_ok=True)

    # UVR identifies a model using MD5 of its final 10 MB, not the entire file.
    with args.model.open("rb") as handle:
        handle.seek(-min(args.model.stat().st_size, 10000 * 1024), os.SEEK_END)
        model_hash = hashlib.md5(handle.read()).hexdigest()
    metadata = json.loads(args.model_data.read_text(encoding="utf-8-sig"))
    if model_hash not in metadata:
        raise ValueError(f"Official UVR model metadata does not recognize {model_hash}")
    parameters = metadata[model_hash]
    if parameters["primary_stem"] != "Instrumental":
        raise ValueError("This reference build expects the official instrumental model")
    n_fft = parameters["mdx_n_fft_scale_set"]
    dim_f = parameters["mdx_dim_f_set"]
    dim_t = 2 ** parameters["mdx_dim_t_set"]
    compensation = parameters["compensate"]
    print(json.dumps({"model": args.model.name, "model_metadata": parameters}), flush=True)

    raw = command(["ffmpeg", "-hide_banner", "-loglevel", "error", "-i", str(args.source), "-vn", "-f", "f32le", "-acodec", "pcm_f32le", "-ar", str(RATE), "-ac", "2", "pipe:1"])
    mix = np.frombuffer(raw, dtype="<f4").reshape(-1, 2).T.copy()
    sample_count = mix.shape[-1]
    chunk_size = HOP * (dim_t - 1)
    trim = n_fft // 2
    usable = chunk_size - 2 * trim
    padding = usable + trim - (sample_count % usable)
    padded = np.pad(mix, ((0, 0), (trim, padding)))

    options = ort.SessionOptions()
    options.intra_op_num_threads = min(8, os.cpu_count() or 1)
    options.inter_op_num_threads = 1
    session = ort.InferenceSession(str(args.model), sess_options=options, providers=["CPUExecutionProvider"])
    input_name = session.get_inputs()[0].name
    print(json.dumps({"input": session.get_inputs()[0].shape, "duration": sample_count / RATE, "provider": session.get_providers()}), flush=True)
    chunks = []
    starts = list(range(0, sample_count, usable))
    for index, start in enumerate(starts):
        piece = padded[:, start:start + chunk_size]
        spectrum = stft(piece, n_fft, dim_f)
        spectrum[:, :, :3] = 0
        # UVR's two-pass denoise: average positive and sign-inverted inferences.
        prediction = 0.5 * session.run(None, {input_name: spectrum})[0]
        prediction -= 0.5 * session.run(None, {input_name: -spectrum})[0]
        separated = istft(prediction, n_fft, chunk_size)
        chunks.append(separated[:, trim:trim + usable])
        print(f"Separated chunk {index + 1}/{len(starts)}", flush=True)
    bgm = np.concatenate(chunks, axis=-1)[:, :sample_count] * compensation
    vocals = mix - bgm
    if not np.isfinite(bgm).all() or not np.isfinite(vocals).all():
        raise ValueError("Separation produced invalid audio")

    for name, wave in [("source", mix), ("bgm", bgm), ("vocals", vocals)]:
        save_audio(wave, WORK / f"friends-{name}.wav", "pcm_f32le")
        if name != "source":
            gain = min(1.0, 0.95 / max(float(np.max(np.abs(wave))), 1e-9))
            save_audio(wave * gain, args.output / f"{name}.mp3", "libmp3lame")
    vocal_mp3 = vocals * min(1.0, 0.95 / max(float(np.max(np.abs(vocals))), 1e-9))
    save_audio(vocal_mp3, args.output / "person-one.mp3", "libmp3lame", start=0.5, duration=5.0)
    save_audio(vocal_mp3, args.output / "person-two.mp3", "libmp3lame", start=6.0, duration=5.0)
    manifest = {
        "createdAt": datetime.now(timezone.utc).isoformat(),
        "source": {"filename": args.source.name, "sha256": sha256(args.source), "durationSeconds": sample_count / RATE, "providedBy": "site owner in this chat"},
        "separation": {"implementation": "UVR MDX ONNX, NumPy STFT, CPU, two-pass denoise", "model": args.model.name, "modelSha256": sha256(args.model), "uvrModelHash": model_hash, "parameters": parameters, "reference": "https://github.com/Anjok07/ultimatevocalremovergui", "modelSource": "https://github.com/TRvlvr/model_repo/releases/tag/all_public_uvr_models", "mediaUploadedToExternalService": False},
        "files": {path.name: {"sha256": sha256(path), "bytes": path.stat().st_size} for path in sorted(args.output.glob("*.mp3"))},
        "speakerCrops": {"person-one.mp3": {"startSeconds": 0.5, "endSeconds": 5.5}, "person-two.mp3": {"startSeconds": 6.0, "endSeconds": 11.0}},
        "notes": ["vocals is the estimated vocal stem; bgm is the estimated instrumental stem. Neural separation can retain residual bleed/artifacts.", "Person references are temporal crops from the separated vocal track, not a separate speaker-identification model.", "No listening or video-generation acceptance test is claimed. Site owner will manually review the generated result.", "Reference-only asset build from the user-supplied example; not presented as newly created original music."],
    }
    (args.output / "NOTICE.json").write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(json.dumps({"output": str(args.output), "files": manifest["files"], "samples": sample_count, "rms": {"mix": float(np.sqrt(np.mean(mix * mix))), "bgm": float(np.sqrt(np.mean(bgm * bgm))), "vocals": float(np.sqrt(np.mean(vocals * vocals)))}}), flush=True)


if __name__ == "__main__":
    main()
