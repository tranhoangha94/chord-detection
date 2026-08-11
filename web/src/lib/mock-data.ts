export type ChordSegment = {
  start: number;
  end: number;
  chord: string;
  section?: string;
};

export type LyricLine = {
  chords: string;
  lyrics: string;
};

export type LyricBlock = {
  section: string;
  lines: LyricLine[];
};

export type SongResult = {
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

/** @deprecated use SongResult */
export type MockSongResult = SongResult;

/** Mock advanced guitar voicings — UI preview until agent/backend lands */
export const MOCK_RESULT: MockSongResult = {
  title: "With or Without You",
  artist: "U2",
  key: "D",
  capo: 0,
  tempo: 110,
  duration: 296,
  source: "Official audio · matched via web search",
  confidence: 0.91,
  segments: [
    { start: 0, end: 8, chord: "Dsus2", section: "Intro" },
    { start: 8, end: 16, chord: "A/C#", section: "Intro" },
    { start: 16, end: 24, chord: "Bm7", section: "Intro" },
    { start: 24, end: 32, chord: "G6/9", section: "Intro" },
    { start: 32, end: 40, chord: "Dmaj9", section: "Verse" },
    { start: 40, end: 48, chord: "A13", section: "Verse" },
    { start: 48, end: 56, chord: "Bm9", section: "Verse" },
    { start: 56, end: 64, chord: "Gmaj7#11", section: "Verse" },
    { start: 64, end: 72, chord: "D/F#", section: "Pre" },
    { start: 72, end: 80, chord: "Em7", section: "Pre" },
    { start: 80, end: 88, chord: "Asus4", section: "Pre" },
    { start: 88, end: 96, chord: "A7sus4", section: "Pre" },
    { start: 96, end: 104, chord: "Dadd9", section: "Chorus" },
    { start: 104, end: 112, chord: "A/C#", section: "Chorus" },
    { start: 112, end: 120, chord: "Bm7b5", section: "Chorus" },
    { start: 120, end: 128, chord: "G/B → G6", section: "Chorus" },
  ],
};

export const LOADING_STAGES = [
  {
    id: "identify",
    label: "Nhận diện bài hát",
    detail: "Ưu tiên nhạc Việt — đối chiếu tên bài / ca sĩ.",
  },
  {
    id: "search",
    label: "Tìm nguồn trên web",
    detail: "Tìm hợp âm guitar tiếng Việt và nguồn đáng tin.",
  },
  {
    id: "transcribe",
    label: "Phân tích hợp âm guitar",
    detail: "Voicing nâng cao, slash, chuyển đoạn — không rút gọn kiểu hopamchuan.",
  },
  {
    id: "arrange",
    label: "Sắp xếp timeline & lời",
    detail: "Gom Intro / Verse / Điệp khúc + sheet lời kèm hợp âm.",
  },
] as const;

export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}
