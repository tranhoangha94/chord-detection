"""ReChord FastAPI backend — Agent chord analysis."""

from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

ROOT = Path(__file__).resolve().parents[1]
load_dotenv(ROOT / ".env")
load_dotenv(ROOT / "web" / ".env.local")

from server.agent import run_agent  # noqa: E402

app = FastAPI(title="ReChord Agent API", version="0.1.0")

def _cors_origins() -> list[str]:
    raw = os.getenv("CORS_ORIGINS", "")
    extras = [o.strip() for o in raw.split(",") if o.strip()]
    defaults = [
        os.getenv("NEXT_PUBLIC_APP_URL", "http://localhost:3000"),
        "http://127.0.0.1:3000",
        "http://localhost:3000",
    ]
    # Preserve order, drop empties/dupes
    seen: set[str] = set()
    out: list[str] = []
    for o in extras + defaults:
        if o and o not in seen:
            seen.add(o)
            out.append(o)
    return out


app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ChordSegment(BaseModel):
    start: float
    end: float
    chord: str
    section: str | None = None


class LyricLine(BaseModel):
    chords: str = ""
    lyrics: str = ""


class LyricBlock(BaseModel):
    section: str = "Song"
    lines: list[LyricLine]


class AnalyzeResponse(BaseModel):
    title: str
    artist: str
    key: str
    capo: int = 0
    tempo: int = 120
    duration: float
    source: str
    confidence: float
    segments: list[ChordSegment]
    lyricBlocks: list[LyricBlock] = Field(default_factory=list)


class AnalyzeLinkBody(BaseModel):
    link: str = Field(..., min_length=3)


@app.get("/health")
def health():
    return {
        "ok": True,
        "openai": bool(os.getenv("OPENAI_API_KEY")),
        "tavily": bool(os.getenv("TAVILY_API_KEY")),
        "model": os.getenv("AGENT_MODEL", "gpt-4o-mini"),
    }


@app.post("/api/analyze", response_model=AnalyzeResponse)
async def analyze(
    link: str | None = Form(default=None),
    hint: str | None = Form(default=None),
    file: UploadFile | None = File(default=None),
):
    """Accept song hint, link and/or uploaded audio/video."""
    if not link and not hint and not file:
        raise HTTPException(400, "Cần tên bài, link, hoặc file audio/video")

    if not os.getenv("OPENAI_API_KEY") or not os.getenv("TAVILY_API_KEY"):
        raise HTTPException(
            503,
            "Thiếu OPENAI_API_KEY hoặc TAVILY_API_KEY trong .env",
        )

    filename = file.filename if file else None
    if file and file.filename:
        upload_dir = ROOT / os.getenv("UPLOAD_DIR", "data/uploads")
        upload_dir.mkdir(parents=True, exist_ok=True)
        dest = upload_dir / file.filename
        content = await file.read()
        dest.write_bytes(content)

    try:
        result = run_agent(
            link=link or None,
            filename=filename,
            hint=hint or None,
        )
        return AnalyzeResponse(**result)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(500, f"Agent lỗi: {exc}") from exc


@app.post("/api/analyze/json", response_model=AnalyzeResponse)
async def analyze_json(body: AnalyzeLinkBody):
    if not os.getenv("OPENAI_API_KEY") or not os.getenv("TAVILY_API_KEY"):
        raise HTTPException(
            503,
            "Thiếu OPENAI_API_KEY hoặc TAVILY_API_KEY trong .env",
        )
    try:
        result = run_agent(link=body.link, filename=None, hint=None)
        return AnalyzeResponse(**result)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(500, f"Agent lỗi: {exc}") from exc
