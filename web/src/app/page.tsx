"use client";

import { useEffect, useMemo, useState } from "react";
import { AgentLoading } from "@/components/AgentLoading";
import { ChordResult } from "@/components/ChordResult";
import { SongInput } from "@/components/SongInput";
import { analyzeSong, type AnalyzeResult } from "@/lib/api";
import { LOADING_STAGES } from "@/lib/mock-data";

type AppPhase = "idle" | "analyzing" | "result" | "error";

export default function Home() {
  const [phase, setPhase] = useState<AppPhase>("idle");
  const [stageIndex, setStageIndex] = useState(0);
  const [sourceLabel, setSourceLabel] = useState("");
  const [result, setResult] = useState<AnalyzeResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  useEffect(() => {
    if (phase !== "analyzing") return;

    setStageIndex(0);
    const timers: ReturnType<typeof setTimeout>[] = [];
    // Soft progress while waiting for the real agent (does not finish the UI)
    LOADING_STAGES.forEach((_, i) => {
      if (i === 0) return;
      timers.push(setTimeout(() => setStageIndex(i), i * 2200));
    });

    return () => timers.forEach(clearTimeout);
  }, [phase]);

  const heroVisible = phase === "idle" || phase === "error";

  const handleSubmit = async ({
    link,
    hint,
    file,
  }: {
    link: string;
    hint: string;
    file: File | null;
  }) => {
    const label =
      hint ||
      (file
        ? file.name
        : link.length > 64
          ? `${link.slice(0, 64)}…`
          : link || "Nguồn không xác định");
    setSourceLabel(label);
    setError(null);
    setResult(null);
    setPhase("analyzing");

    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
    const nextAudioUrl = file ? URL.createObjectURL(file) : null;
    if (nextAudioUrl) setAudioUrl(nextAudioUrl);

    try {
      const data = await analyzeSong({ link, hint, file });
      setResult(data);
      setStageIndex(LOADING_STAGES.length - 1);
      setPhase("result");
    } catch (err) {
      if (nextAudioUrl) {
        URL.revokeObjectURL(nextAudioUrl);
        setAudioUrl(null);
      }
      const message =
        err instanceof Error ? err.message : "Không phân tích được bài hát";
      setError(message);
      setPhase("error");
    }
  };

  const fretLines = useMemo(() => Array.from({ length: 6 }, (_, i) => i), []);

  return (
    <div className="relative flex flex-1 flex-col">
      <div
        className="pointer-events-none absolute inset-x-0 top-[18vh] hidden opacity-40 md:block"
        aria-hidden
      >
        {fretLines.map((i) => (
          <div
            key={i}
            className="mx-auto h-px max-w-5xl origin-center bg-ink/30 animate-fret-pulse"
            style={{
              marginTop: i === 0 ? 0 : 28,
              animationDelay: `${i * 0.18}s`,
              width: `${92 - i * 2}%`,
            }}
          />
        ))}
      </div>

      <header className="relative z-10 flex items-center justify-between px-5 py-5 sm:px-10">
        <p className="font-display text-lg font-extrabold tracking-tight text-ink">
          ReChord
        </p>
        <p className="hidden text-sm text-mute sm:block">
          Guitar chords · Agent transcription
        </p>
      </header>

      <main className="relative z-10 flex flex-1 flex-col px-5 pb-16 sm:px-10">
        {heroVisible && (
          <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center py-10 sm:py-16">
            <p className="animate-rise font-display text-[clamp(3.5rem,14vw,8.5rem)] font-extrabold leading-[0.9] tracking-tight text-ink">
              ReChord
            </p>
            <h1 className="animate-rise-delay-1 mt-6 max-w-xl font-display text-2xl font-semibold leading-snug tracking-tight text-ink-soft sm:text-3xl">
              Hợp âm guitar theo đúng bài — voicing nâng cao, không rút gọn.
            </h1>
            <p className="animate-rise-delay-2 mt-4 max-w-lg text-base leading-relaxed text-mute sm:text-lg">
              Dán link hoặc thả audio/video. Agent ưu tiên nhạc Việt, tìm nguồn hợp âm
              rồi dựng voicing guitar nâng cao.
            </p>

            <div className="animate-rise-delay-2 mt-10">
              <SongInput onSubmit={handleSubmit} />
            </div>

            {phase === "error" && error && (
              <p className="mt-4 text-sm text-copper" role="alert">
                {error}
              </p>
            )}
          </div>
        )}

        {phase === "analyzing" && (
          <div className="mx-auto flex w-full flex-1 flex-col justify-center py-12">
            <AgentLoading stageIndex={stageIndex} sourceLabel={sourceLabel} />
          </div>
        )}

        {phase === "result" && result && (
          <div className="mx-auto w-full py-8 sm:py-12">
            <ChordResult
              result={result}
              audioUrl={audioUrl}
              onReset={() => {
                if (audioUrl) URL.revokeObjectURL(audioUrl);
                setAudioUrl(null);
                setPhase("idle");
                setStageIndex(0);
                setSourceLabel("");
                setResult(null);
                setError(null);
              }}
            />
          </div>
        )}
      </main>

      <footer className="relative z-10 border-t border-ink/10 px-5 py-4 text-xs text-mute sm:px-10">
        Agent: OpenAI + Tavily · API {process.env.NEXT_PUBLIC_CHORD_API_URL || "http://127.0.0.1:8000"}
      </footer>
    </div>
  );
}
