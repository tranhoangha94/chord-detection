import type { ChordSegment, LyricBlock } from "@/lib/mock-data";

export type AnalyzeResult = {
  title: string;
  artist: string;
  key: string;
  capo: number;
  tempo: number;
  duration: number;
  source: string;
  confidence: number;
  segments: ChordSegment[];
  lyricBlocks?: LyricBlock[];
};

const API_BASE =
  process.env.NEXT_PUBLIC_CHORD_API_URL || "http://127.0.0.1:8000";

export async function analyzeSong(input: {
  link: string;
  hint?: string;
  file: File | null;
}): Promise<AnalyzeResult> {
  const form = new FormData();
  if (input.hint?.trim()) form.append("hint", input.hint.trim());
  if (input.link.trim()) form.append("link", input.link.trim());
  if (input.file) form.append("file", input.file);

  const res = await fetch(`${API_BASE}/api/analyze`, {
    method: "POST",
    body: form,
  });

  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      const data = await res.json();
      detail = data.detail || detail;
    } catch {
      /* ignore */
    }
    throw new Error(typeof detail === "string" ? detail : JSON.stringify(detail));
  }

  return res.json();
}
