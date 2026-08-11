"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  formatTime,
  type SongResult,
} from "@/lib/mock-data";

type ChordResultProps = {
  result: SongResult;
  audioUrl?: string | null;
  onReset: () => void;
};

export function ChordResult({ result, audioUrl, onReset }: ChordResultProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(result.duration);

  const active = result.segments[activeIndex];
  const hasAudio = Boolean(audioUrl);

  const sections = useMemo(() => {
    const map = new Map<string, number>();
    result.segments.forEach((seg, i) => {
      if (seg.section && !map.has(seg.section)) map.set(seg.section, i);
    });
    return [...map.entries()];
  }, [result.segments]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !audioUrl) return;

    const onTime = () => {
      const t = audio.currentTime;
      setCurrentTime(t);
      const idx = result.segments.findIndex(
        (seg) => t >= seg.start && t < seg.end,
      );
      if (idx >= 0) setActiveIndex(idx);
    };
    const onMeta = () => {
      if (Number.isFinite(audio.duration) && audio.duration > 0) {
        setDuration(audio.duration);
      }
    };
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onEnded = () => setPlaying(false);

    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onMeta);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("ended", onEnded);

    return () => {
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("loadedmetadata", onMeta);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("ended", onEnded);
    };
  }, [audioUrl, result.segments]);

  const seekTo = (seconds: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = Math.max(0, Math.min(seconds, duration || seconds));
    setCurrentTime(audio.currentTime);
  };

  const togglePlay = async () => {
    const audio = audioRef.current;
    if (!audio || !hasAudio) return;
    if (audio.paused) {
      try {
        await audio.play();
      } catch {
        setPlaying(false);
      }
    } else {
      audio.pause();
    }
  };

  const selectSegment = (index: number) => {
    setActiveIndex(index);
    const start = result.segments[index]?.start ?? 0;
    if (hasAudio) seekTo(start);
  };

  const progressPct =
    duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;

  return (
    <section className="mx-auto w-full max-w-4xl animate-rise">
      {audioUrl && (
        <audio ref={audioRef} src={audioUrl} preload="metadata" />
      )}

      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-ink/15 pb-6">
        <div>
          <p className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-mute">
            Kết quả · Guitar chart
          </p>
          <h2 className="mt-2 font-display text-3xl font-extrabold tracking-tight text-ink sm:text-5xl">
            {result.title}
          </h2>
          <p className="mt-2 text-lg text-ink-soft">
            {result.artist}
            <span className="mx-2 text-mute">·</span>
            Key {result.key}
            {result.capo > 0 ? ` · Capo ${result.capo}` : ""}
            <span className="mx-2 text-mute">·</span>
            {result.tempo} BPM
          </p>
          <p className="mt-1 text-sm text-mute">
            {result.source} · độ tin cậy {Math.round(result.confidence * 100)}%
          </p>
        </div>
        <button
          type="button"
          onClick={onReset}
          className="h-11 border border-ink/25 bg-paper/80 px-5 text-sm font-medium text-ink transition hover:border-ink hover:bg-pick/40"
        >
          Phân tích bài khác
        </button>
      </div>

      <div className="relative mt-8 overflow-hidden border border-ink/15 bg-ink px-6 py-10 text-paper sm:px-10">
        <div className="pointer-events-none absolute inset-x-0 top-4 flex justify-between px-6 font-chord text-[10px] tracking-[0.35em] text-pick/50 sm:px-10">
          {["E", "A", "D", "G", "B", "e"].map((string) => (
            <span key={string}>{string}</span>
          ))}
        </div>
        <p className="font-chord text-xs uppercase tracking-[0.25em] text-pick">
          {active?.section ?? "—"} · {formatTime(active?.start ?? 0)} –{" "}
          {formatTime(active?.end ?? 0)}
        </p>
        <p className="mt-3 font-display text-5xl font-extrabold leading-none tracking-tight text-pick sm:text-7xl">
          {active?.chord ?? "—"}
        </p>
        <p className="mt-4 max-w-lg text-sm text-paper/70">
          Voicing guitar nâng cao — slash, extension, chuyển đoạn. Không rút gọn
          kiểu chỉ maj/min.
        </p>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {sections.map(([name, index]) => (
          <button
            key={name}
            type="button"
            onClick={() => selectSegment(index)}
            className={`px-3 py-1.5 font-chord text-xs tracking-wide transition ${
              result.segments[activeIndex]?.section === name
                ? "bg-ink text-pick"
                : "bg-paper text-ink-soft hover:bg-pick/50"
            }`}
          >
            {name}
          </button>
        ))}
      </div>

      <div className="mt-6 overflow-x-auto pb-2">
        <div className="flex min-w-max gap-1">
          {result.segments.map((seg, index) => {
            const selected = index === activeIndex;
            return (
              <button
                key={`${seg.chord}-${seg.start}-${index}`}
                type="button"
                onClick={() => selectSegment(index)}
                className={`group flex w-28 flex-col border px-3 py-3 text-left transition ${
                  selected
                    ? "border-ink bg-pick"
                    : "border-ink/15 bg-paper/80 hover:border-ink/40"
                }`}
              >
                <span className="font-chord text-[10px] text-mute">
                  {formatTime(seg.start)}
                </span>
                <span
                  className={`mt-1 font-chord text-sm font-semibold leading-tight ${
                    selected ? "text-ink" : "text-ink-soft"
                  }`}
                >
                  {seg.chord}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {(result.lyricBlocks?.length ?? 0) > 0 && (
        <div className="mt-10 border border-ink/15 bg-paper/80">
          <div className="flex items-baseline justify-between gap-3 border-b border-ink/10 px-5 py-4 sm:px-6">
            <div>
              <p className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-mute">
                Lời · Hợp âm
              </p>
              <p className="mt-1 text-sm text-ink-soft">
                Hợp âm căn trên lời — đọc như sheet guitar.
              </p>
            </div>
          </div>
          <div className="space-y-8 px-5 py-6 sm:px-6">
            {result.lyricBlocks!.map((block, bi) => {
              const activeSection =
                result.segments[activeIndex]?.section === block.section;
              return (
                <div key={`${block.section}-${bi}`}>
                  <button
                    type="button"
                    onClick={() => {
                      const idx = result.segments.findIndex(
                        (s) => s.section === block.section,
                      );
                      if (idx >= 0) selectSegment(idx);
                    }}
                    className={`mb-3 font-display text-sm font-bold tracking-wide ${
                      activeSection ? "text-copper" : "text-ink"
                    }`}
                  >
                    {block.section}
                  </button>
                  <div className="space-y-3 overflow-x-auto">
                    {block.lines.map((line, li) => (
                      <div
                        key={`${bi}-${li}`}
                        className="min-w-0 font-chord text-[13px] leading-snug sm:text-sm"
                      >
                        {line.chords.trim() && (
                          <pre className="m-0 whitespace-pre font-chord font-semibold text-copper">
                            {line.chords}
                          </pre>
                        )}
                        {line.lyrics.trim() ? (
                          <pre className="m-0 whitespace-pre font-sans text-ink-soft">
                            {line.lyrics}
                          </pre>
                        ) : (
                          <pre className="m-0 whitespace-pre font-sans text-mute/50">
                            {" "}
                          </pre>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {(result.lyricBlocks?.length ?? 0) === 0 && (
        <p className="mt-8 text-sm text-mute">
          Chưa có lời kèm hợp âm — phân tích lại bài để Agent lấy lyric sheet.
        </p>
      )}

      <div className="mt-8 border border-ink/15 bg-paper/60 p-4 sm:p-5">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={togglePlay}
            disabled={!hasAudio}
            className="flex h-11 w-11 items-center justify-center bg-ink text-pick disabled:cursor-not-allowed disabled:opacity-40"
            aria-label={playing ? "Tạm dừng" : "Phát"}
          >
            <span className="text-lg leading-none">
              {playing ? "❚❚" : "▶"}
            </span>
          </button>
          <div className="flex-1">
            <button
              type="button"
              disabled={!hasAudio}
              className="relative block h-1.5 w-full bg-ink/15 disabled:cursor-not-allowed"
              aria-label="Tua bài"
              onClick={(e) => {
                if (!hasAudio || duration <= 0) return;
                const rect = e.currentTarget.getBoundingClientRect();
                const ratio = (e.clientX - rect.left) / rect.width;
                seekTo(ratio * duration);
              }}
            >
              <div
                className="absolute inset-y-0 left-0 bg-copper"
                style={{ width: `${progressPct}%` }}
              />
              <div
                className="absolute top-1/2 h-3 w-3 -translate-y-1/2 bg-ink"
                style={{ left: `calc(${progressPct}% - 6px)` }}
              />
            </button>
            <div className="mt-2 flex justify-between font-chord text-[11px] text-mute">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>
        </div>
        <p className="mt-3 text-xs text-mute">
          {hasAudio
            ? "Đang phát file bạn đã upload · hợp âm đổi theo thời gian."
            : "Chưa có file audio để phát — upload MP3/WAV/MP4 rồi phân tích lại (link-only chưa tải nhạc)."}
        </p>
      </div>
    </section>
  );
}
