"""Extract audio from uploads and transcribe with OpenAI Whisper."""

from __future__ import annotations

import os
import shutil
import subprocess
import uuid
from pathlib import Path

from openai import OpenAI

FFMPEG = os.getenv("FFMPEG_PATH", "ffmpeg")
# Whisper API hard limit ~25MB; keep ID clip short + compressed
MAX_WHISPER_SECONDS = int(os.getenv("WHISPER_MAX_SECONDS", "120"))


def _ffmpeg_available() -> bool:
    return shutil.which(FFMPEG) is not None


def prepare_audio_for_whisper(source: Path, work_dir: Path) -> Path:
    """Convert audio/video → mono mp3 clip for Whisper."""
    work_dir.mkdir(parents=True, exist_ok=True)
    out = work_dir / f"{uuid.uuid4().hex}.mp3"

    if not _ffmpeg_available():
        # Fallback: pass original if already small-ish audio
        if source.suffix.lower() in {".mp3", ".wav", ".m4a", ".ogg", ".flac"}:
            return source
        raise RuntimeError(
            "Server thiếu ffmpeg — không tách được audio từ video. "
            "Cần cài ffmpeg trên môi trường deploy."
        )

    cmd = [
        FFMPEG,
        "-y",
        "-i",
        str(source),
        "-vn",
        "-ac",
        "1",
        "-ar",
        "16000",
        "-b:a",
        "64k",
        "-t",
        str(MAX_WHISPER_SECONDS),
        str(out),
    ]
    proc = subprocess.run(cmd, capture_output=True, text=True)
    if proc.returncode != 0 or not out.exists() or out.stat().st_size == 0:
        raise RuntimeError(
            f"ffmpeg tách audio thất bại: {(proc.stderr or proc.stdout)[-800:]}"
        )
    return out


def transcribe_audio(audio_path: Path, language: str = "vi") -> str:
    """Speech-to-text via Whisper — used to identify Vietnamese songs from singing."""
    key = os.getenv("OPENAI_API_KEY")
    if not key:
        raise RuntimeError("OPENAI_API_KEY is missing")

    client = OpenAI(api_key=key)
    with audio_path.open("rb") as f:
        result = client.audio.transcriptions.create(
            model=os.getenv("WHISPER_MODEL", "whisper-1"),
            file=f,
            language=language,
            response_format="text",
        )

    # SDK may return str or object with .text
    if isinstance(result, str):
        text = result
    else:
        text = getattr(result, "text", None) or str(result)

    text = (text or "").strip()
    if not text:
        raise RuntimeError("Whisper không nhận được lời/hát từ file")
    return text


def listen_to_media(source: Path, work_dir: Path) -> str:
    """Full pipeline: media file → audio clip → transcript."""
    clip = prepare_audio_for_whisper(source, work_dir)
    try:
        return transcribe_audio(clip)
    finally:
        if clip != source and clip.exists():
            try:
                clip.unlink()
            except OSError:
                pass
