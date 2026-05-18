export type CheckIn = {
  date: string; // YYYY-MM-DD
  emotion: number; // 1-10
  energy: number; // 1-10
  focus: number; // 1-10
  createdAt: number;
};

export type JournalEntry = {
  id: string;
  date: string;
  text: string;
  createdAt: number;
  updatedAt: number;
};

export type SimpleAction = {
  date: string;
  kind: "exercise" | "mindset" | "rest";
  title: string;
  body: string;
  duration: string;
  done: boolean;
};

export type MoodTag =
  | "Work"
  | "Sleep"
  | "People"
  | "Health"
  | "Movement"
  | "Creativity";

export const ALL_TAGS: MoodTag[] = [
  "Work",
  "Sleep",
  "People",
  "Health",
  "Movement",
  "Creativity",
];

export type EmotionOption = {
  emoji: string;
  label: string;
  score: number; // 1-10
};

export const EMOTION_OPTIONS: EmotionOption[] = [
  { emoji: "😢", label: "Awful", score: 1 },
  { emoji: "😔", label: "Low", score: 3 },
  { emoji: "😐", label: "Meh", score: 5 },
  { emoji: "🙂", label: "Okay", score: 7 },
  { emoji: "😄", label: "Great", score: 9 },
  { emoji: "🤩", label: "Amazing", score: 10 },
];

/** Pick the emotion option whose score is closest to a given value. */
export function emotionFromScore(score: number): EmotionOption {
  let best = EMOTION_OPTIONS[0];
  let bestDiff = Math.abs(EMOTION_OPTIONS[0].score - score);
  for (const opt of EMOTION_OPTIONS) {
    const d = Math.abs(opt.score - score);
    if (d < bestDiff) {
      best = opt;
      bestDiff = d;
    }
  }
  return best;
}
