"use client";

import { LOADING_STAGES } from "@/lib/mock-data";

type AgentLoadingProps = {
  stageIndex: number;
  sourceLabel: string;
};

const DRIFT_CHORDS = [
  "Fmaj7#11",
  "Bm7b5",
  "G/B",
  "Cadd9",
  "Am9",
  "D13",
  "E7#9",
  "A/C#",
  "G6/9",
  "Dm9",
  "Bbmaj7",
  "F#m7",
];

export function AgentLoading({ stageIndex, sourceLabel }: AgentLoadingProps) {
  return (
    <section className="mx-auto w-full max-w-2xl animate-rise px-1">
      <div className="mb-8 overflow-hidden border-y border-ink/15 py-3">
        <div className="flex w-max gap-8 animate-chord-drift font-chord text-sm tracking-wide text-ink/35">
          {[...DRIFT_CHORDS, ...DRIFT_CHORDS].map((chord, i) => (
            <span key={`${chord}-${i}`}>{chord}</span>
          ))}
        </div>
      </div>

      <div className="flex items-start gap-4">
        <div
          className="mt-1 h-10 w-10 shrink-0 border-2 border-ink border-t-pick animate-spin-pick"
          aria-hidden
        />
        <div>
          <p className="font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
            Agent đang phân tích
          </p>
          <p className="mt-2 max-w-md text-base text-mute">
            Nguồn: <span className="text-ink-soft">{sourceLabel}</span>
          </p>
        </div>
      </div>

      <ol className="mt-10 space-y-0">
        {LOADING_STAGES.map((stage, index) => {
          const done = index < stageIndex;
          const active = index === stageIndex;
          return (
            <li
              key={stage.id}
              className={`relative border-l-2 py-4 pl-6 transition-colors ${
                active
                  ? "border-pick"
                  : done
                    ? "border-ink"
                    : "border-ink/15"
              }`}
            >
              <span
                className={`absolute -left-[7px] top-5 h-3 w-3 rounded-none ${
                  active
                    ? "bg-pick animate-stage-glow"
                    : done
                      ? "bg-ink"
                      : "bg-mist border border-ink/25"
                }`}
              />
              <p
                className={`font-display text-lg font-semibold ${
                  active || done ? "text-ink" : "text-mute"
                }`}
              >
                {stage.label}
              </p>
              <p
                className={`mt-1 text-sm ${
                  active ? "text-ink-soft" : "text-mute"
                }`}
              >
                {stage.detail}
              </p>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
