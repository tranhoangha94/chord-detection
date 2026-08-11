"use client";

import { useCallback, useRef, useState } from "react";

type SongInputProps = {
  disabled?: boolean;
  onSubmit: (payload: {
    link: string;
    hint: string;
    file: File | null;
  }) => void;
};

const ACCEPT =
  "audio/*,video/*,.mp3,.wav,.flac,.m4a,.aac,.ogg,.mp4,.webm,.mkv,.mov";

export function SongInput({ disabled, onSubmit }: SongInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [link, setLink] = useState("");
  const [hint, setHint] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasInput =
    link.trim().length > 0 || hint.trim().length > 0 || file !== null;

  const takeFile = useCallback((next: File | null) => {
    if (!next) return;
    const isMedia =
      next.type.startsWith("audio/") ||
      next.type.startsWith("video/") ||
      /\.(mp3|wav|flac|m4a|aac|ogg|mp4|webm|mkv|mov)$/i.test(next.name);

    if (!isMedia) {
      setError("Chỉ nhận audio hoặc video có nhạc.");
      return;
    }

    setError(null);
    setFile(next);
  }, []);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (disabled) return;
    const dropped = e.dataTransfer.files?.[0] ?? null;
    takeFile(dropped);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasInput) {
      setError("Nhập tên bài, dán link, hoặc thả file audio/video.");
      return;
    }
    if (file && !hint.trim() && !link.trim()) {
      setError(
        "Upload file thì nên ghi tên bài (vd: Nàng Thơ - Hoàng Dũng) — Agent chưa nghe được audio.",
      );
      return;
    }
    setError(null);
    onSubmit({ link: link.trim(), hint: hint.trim(), file });
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-2xl">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={`relative overflow-hidden rounded-sm border transition-colors ${
          dragging
            ? "border-ink bg-pick/30"
            : "border-ink/20 bg-paper/70 hover:border-ink/40"
        } ${disabled ? "opacity-60 pointer-events-none" : ""}`}
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-pick to-transparent" />

        <label className="sr-only" htmlFor="song-hint">
          Tên bài hát
        </label>
        <input
          id="song-hint"
          type="text"
          placeholder="Tên bài · ca sĩ — vd: Nàng Thơ - Hoàng Dũng"
          value={hint}
          disabled={disabled}
          onChange={(e) => {
            setHint(e.target.value);
            setError(null);
          }}
          className="w-full border-0 border-b border-ink/10 bg-transparent px-5 py-4 text-base text-ink placeholder:text-mute/70 focus:outline-none sm:text-lg"
        />

        <label className="sr-only" htmlFor="song-link">
          Link bài hát
        </label>
        <input
          id="song-link"
          type="text"
          inputMode="url"
          placeholder="Hoặc link Spotify / YouTube (tuỳ chọn)"
          value={link}
          disabled={disabled}
          onChange={(e) => {
            setLink(e.target.value);
            setError(null);
          }}
          className="w-full border-0 bg-transparent px-5 py-3 text-sm text-ink placeholder:text-mute/70 focus:outline-none sm:text-base"
        />

        <div className="flex flex-col gap-3 border-t border-ink/10 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            disabled={disabled}
            onClick={() => inputRef.current?.click()}
            className="group flex items-center gap-3 text-left text-sm text-ink-soft"
          >
            <span className="flex h-9 w-9 items-center justify-center border border-dashed border-ink/30 bg-mist/60 font-display text-lg transition group-hover:border-ink group-hover:bg-pick/40">
              +
            </span>
            <span>
              <span className="block font-medium text-ink">
                {file ? file.name : "Thả audio / video vào đây"}
              </span>
              <span className="block text-mute">
                MP3, WAV, FLAC, MP4… · nhớ ghi tên bài phía trên
              </span>
            </span>
          </button>

          <input
            ref={inputRef}
            type="file"
            accept={ACCEPT}
            className="hidden"
            onChange={(e) => takeFile(e.target.files?.[0] ?? null)}
          />

          <button
            type="submit"
            disabled={disabled || !hasInput}
            className="inline-flex h-12 items-center justify-center bg-ink px-7 font-display text-sm font-bold tracking-wide text-pick transition hover:bg-ink-soft disabled:cursor-not-allowed disabled:opacity-40"
          >
            Phân tích
          </button>
        </div>
      </div>

      {file && !disabled && (
        <div className="mt-3 flex items-center justify-between gap-3 text-sm text-mute">
          <span>
            File đã chọn: <span className="text-ink">{file.name}</span>
          </span>
          <button
            type="button"
            className="underline decoration-ink/30 underline-offset-4 hover:text-ink"
            onClick={() => setFile(null)}
          >
            Gỡ file
          </button>
        </div>
      )}

      {error && (
        <p className="mt-3 text-sm text-copper" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
