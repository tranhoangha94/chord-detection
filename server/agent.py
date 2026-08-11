"""ReChord Agent: Tavily search + OpenAI guitar chord chart + lyrics."""

from __future__ import annotations

import json
import os
import re
from typing import Any

from openai import OpenAI
from tavily import TavilyClient

AGENT_MODEL = os.getenv("AGENT_MODEL", "gpt-4o-mini")

SYSTEM_PROMPT = """You are a professional guitar arranger and transcription agent for ReChord,
specialized in Vietnamese (V-Pop / nhạc Việt) songs for guitarists in Vietnam.
Return ONLY valid JSON (no markdown) matching this schema:
{
  "title": string,
  "artist": string,
  "key": string,
  "capo": number,
  "tempo": number,
  "duration": number,
  "source": string,
  "confidence": number,
  "segments": [
    {"start": number, "end": number, "chord": string, "section": string}
  ],
  "lyricBlocks": [
    {
      "section": string,
      "lines": [
        {"chords": string, "lyrics": string}
      ]
    }
  ]
}

Rules:
- PRIORITY: Vietnamese music. Prefer Vietnamese title/artist spelling; section labels may be
  Intro / Verse / Điệp khúc / Bridge / Outro.
- lyricBlocks: classic chord-over-lyrics sheet. Each line has:
  - "chords": chord symbols spaced to align above syllables (e.g. "Dm7        Am7     Cmaj7")
  - "lyrics": the lyric text in Vietnamese when the song is Vietnamese
  Include Intro (chords-only lines ok with empty lyrics), Verse, Điệp khúc, etc.
  Prefer real lyrics from sources; if partial, fill best-effort and lower confidence slightly.
- Prefer Vietnamese chord/lyric sources but UPGRADE voicings — avoid hopamchuan-style plain maj/min only.
- Target intermediate/advanced guitarists: maj7, m7, m9, add9, sus2/4, 6/9, slash, #11, b5, 7sus4, etc.
- HARD RULE: ≥70% of segment chords and chord-sheet chords should use extensions/sus/slash.
- Segments contiguous in seconds; duration ≈ last end.
- If VN vs international conflict, prefer Vietnamese match.
"""


def _client_openai() -> OpenAI:
    key = os.getenv("OPENAI_API_KEY")
    if not key:
        raise RuntimeError("OPENAI_API_KEY is missing")
    return OpenAI(api_key=key)


def _client_tavily() -> TavilyClient:
    key = os.getenv("TAVILY_API_KEY")
    if not key:
        raise RuntimeError("TAVILY_API_KEY is missing")
    return TavilyClient(api_key=key)


def search_web(query: str, max_results: int = 6) -> list[dict[str, Any]]:
    tv = _client_tavily()
    raw = tv.search(
        query=query,
        search_depth="advanced",
        max_results=max_results,
        include_answer=True,
    )
    results = []
    if raw.get("answer"):
        results.append({"title": "Tavily answer", "url": "", "content": raw["answer"]})
    for item in raw.get("results", []):
        results.append(
            {
                "title": item.get("title") or "",
                "url": item.get("url") or "",
                "content": (item.get("content") or "")[:1400],
            }
        )
    return results


def identify_query(
    link: str | None, filename: str | None, hint: str | None = None
) -> str:
    parts = []
    if hint:
        parts.append(f"USER_CONFIRMED_TITLE: {hint}")
    if link:
        parts.append(link)
    if filename:
        parts.append(f"uploaded_file:{filename}")
    blob = " ".join(parts).strip()
    if not blob:
        raise ValueError("Cần tên bài, link, hoặc file audio/video")
    return blob


def _normalize_lyric_blocks(raw: Any) -> list[dict[str, Any]]:
    if not isinstance(raw, list):
        return []
    blocks: list[dict[str, Any]] = []
    for block in raw:
        if not isinstance(block, dict):
            continue
        lines_in = block.get("lines") or []
        lines: list[dict[str, str]] = []
        for line in lines_in:
            if not isinstance(line, dict):
                continue
            chords = str(line.get("chords") or "")
            lyrics = str(line.get("lyrics") or "")
            if not chords.strip() and not lyrics.strip():
                continue
            lines.append({"chords": chords, "lyrics": lyrics})
        if not lines:
            continue
        blocks.append(
            {
                "section": str(block.get("section") or "Song"),
                "lines": lines,
            }
        )
    return blocks


def run_agent(
    link: str | None = None,
    filename: str | None = None,
    hint: str | None = None,
) -> dict[str, Any]:
    seed = identify_query(link, filename, hint)
    openai = _client_openai()
    user_hint = (hint or "").strip()

    # Stage 1 — identify song (ưu tiên nhạc Việt; hint = ground truth)
    if user_hint:
        id_hits = search_web(
            f"{user_hint} nhạc Việt hợp âm lời bài hát ca sĩ",
            max_results=6,
        )
        id_hits += search_web(
            f"{user_hint} hợp âm guitar đệm",
            max_results=4,
        )
    else:
        id_hits = search_web(
            f"nhạc Việt bài hát tên ca sĩ nhận diện: {seed}",
            max_results=5,
        )
        id_hits += search_web(
            f"Vietnamese V-Pop song identify (NOT English pop hits): {seed}",
            max_results=4,
        )
    id_context = json.dumps(id_hits, ensure_ascii=False)

    identify_system = (
        "Identify the song for a Vietnamese guitar app. "
        "HARD RULES: "
        "1) If USER_CONFIRMED_TITLE is present, treat it as ground truth — do NOT replace with a different song "
        "(especially not random English hits like Blinding Lights). "
        "2) Prefer nhạc Việt / V-Pop when ambiguous. "
        "3) Never invent a famous Western chart-topper without clear evidence in the seed/sources. "
        "4) Keep Vietnamese spelling for title/artist. "
        'Return JSON: {"title":"...","artist":"...","query_hint":"cụm tìm hợp âm + lời",'
        '"is_vietnamese": true/false}'
    )

    identify = openai.chat.completions.create(
        model=AGENT_MODEL,
        temperature=0.1,
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": identify_system},
            {
                "role": "user",
                "content": f"User input: {seed}\n\nWeb snippets:\n{id_context}",
            },
        ],
    )
    identity = json.loads(identify.choices[0].message.content or "{}")

    if user_hint:
        # Parse "Title - Artist" if provided
        if " - " in user_hint:
            t, a = user_hint.split(" - ", 1)
            title = t.strip() or identity.get("title") or user_hint
            artist = a.strip() or identity.get("artist") or "Unknown"
        else:
            title = identity.get("title") or user_hint
            artist = identity.get("artist") or "Unknown"
            # If model drifted away from hint title, force hint as title
            if user_hint.lower() not in f"{title} {artist}".lower() and title.lower() not in user_hint.lower():
                title = user_hint
        is_vn = True
        hint_q = f"{title} {artist} hợp âm lời bài hát"
    else:
        title = identity.get("title") or "Unknown"
        artist = identity.get("artist") or "Unknown"
        hint_q = identity.get("query_hint") or f"{title} {artist} hợp âm guitar"
        is_vn = bool(identity.get("is_vietnamese", True))

    # Stage 2 — search chords + lyrics
    chord_hits = search_web(f"{hint_q} hợp âm guitar capo tone", max_results=6)
    chord_hits += search_web(f"{title} {artist} hợp âm guitar lời bài hát", max_results=6)
    if is_vn:
        chord_hits += search_web(
            f"{title} {artist} lời bài hát hợp âm đệm guitar điệp khúc",
            max_results=6,
        )
    else:
        chord_hits += search_web(
            f"{title} {artist} lyrics guitar chords tabs",
            max_results=5,
        )
    chord_context = json.dumps(chord_hits, ensure_ascii=False)[:16000]

    chart = openai.chat.completions.create(
        model=AGENT_MODEL,
        temperature=0.35,
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {
                "role": "user",
                "content": (
                    f"Song: {title} — {artist}\n"
                    f"Vietnamese priority: {is_vn}\n"
                    f"User seed: {seed}\n"
                    f"IMPORTANT: Analyze THIS song only ({title} / {artist}), not another track.\n"
                    f"Build timeline segments AND lyricBlocks (chords above lyrics) "
                    f"from these sources:\n{chord_context}"
                ),
            },
        ],
    )
    data = json.loads(chart.choices[0].message.content or "{}")

    data.setdefault("title", title)
    data.setdefault("artist", artist)
    # Keep user-facing identity stable when hint given
    if user_hint:
        data["title"] = title
        data["artist"] = artist
    data.setdefault("key", "C")
    data.setdefault("capo", 0)
    data.setdefault("tempo", 120)
    data.setdefault("source", "OpenAI + Tavily · ưu tiên nhạc Việt")
    data.setdefault("confidence", 0.7)
    segments = data.get("segments") or []
    if not segments:
        raise RuntimeError("Agent không tạo được segments hợp âm")
    for seg in segments:
        seg.setdefault("section", "Song")
        seg["start"] = float(seg.get("start", 0))
        seg["end"] = float(seg.get("end", seg["start"] + 8))
        seg["chord"] = str(seg.get("chord", "N"))
    last_end = max(float(s["end"]) for s in segments)
    data["duration"] = float(data.get("duration") or last_end)
    data["segments"] = segments
    data["lyricBlocks"] = _normalize_lyric_blocks(data.get("lyricBlocks"))
    data["confidence"] = float(data["confidence"])
    data["capo"] = int(data.get("capo") or 0)
    data["tempo"] = int(data.get("tempo") or 120)
    return data


def extract_urls_from_text(text: str) -> list[str]:
    return re.findall(r"https?://\S+", text)
