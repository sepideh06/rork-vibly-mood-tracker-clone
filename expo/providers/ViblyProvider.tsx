import AsyncStorage from "@react-native-async-storage/async-storage";
import createContextHook from "@nkzw/create-context-hook";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";

import { todayKey } from "@/utils/date";
import {
  cancelDailyReminder,
  configureNotificationHandler,
  requestNotificationPermission,
  scheduleDailyReminder,
} from "@/utils/notifications";
import {
  CheckIn,
  JournalEntry,
  MoodTag,
  SimpleAction,
} from "@/types/vibly";

const STORAGE_KEY = "vibly.state.v1";

type State = {
  checkIns: Record<string, CheckIn>;
  /** Journal entries keyed by their unique id. Multiple entries per day allowed. */
  journals: Record<string, JournalEntry>;
  actions: Record<string, SimpleAction>;
  tags: Record<string, MoodTag[]>;
  /** "What went well today" — one bright thing per day. */
  brightThings: Record<string, string>;
  /** Recent simple-action titles, so the AI can avoid repeating itself. */
  actionHistory: string[];
  /** Active paid plan, or null when on free trial. */
  plan: "monthly" | "yearly" | null;
  remindersEnabled: boolean;
  /** When true, the gentle reminder also plays a soft chime. */
  reminderSoundEnabled: boolean;
  /** Hour of day (0-23) the daily reminder fires. */
  reminderHour: number;
  /** Minute of hour (0-59) the daily reminder fires. */
  reminderMinute: number;
  trialStartedAt: number | null;
};

export type Plan = "monthly" | "yearly";
export const PLAN_PRICES: Record<Plan, string> = {
  monthly: "\u20AC5 / month",
  yearly: "\u20AC45 / year",
};

const emptyState: State = {
  checkIns: {},
  journals: {},
  actions: {},
  tags: {},
  brightThings: {},
  actionHistory: [],
  plan: null,
  remindersEnabled: false,
  reminderSoundEnabled: false,
  reminderHour: 9,
  reminderMinute: 0,
  trialStartedAt: null,
};

export const TRIAL_DAYS = 3;
const DAY_MS = 24 * 60 * 60 * 1000;

function makeId(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

/** Migrate older state shapes (single journal entry per date) to the new keyed-by-id format. */
function migrate(raw: Partial<State> & { journals?: unknown; isPro?: unknown }): State {
  const merged: State = { ...emptyState, ...(raw as State) };
  // Legacy: previous versions stored an `isPro` boolean. Treat it as a yearly plan.
  if (typeof (raw as { isPro?: unknown }).isPro === "boolean" && (raw as { isPro: boolean }).isPro && !merged.plan) {
    merged.plan = "yearly";
  }
  const j = raw.journals as unknown;
  if (j && typeof j === "object" && !Array.isArray(j)) {
    const out: Record<string, JournalEntry> = {};
    for (const key of Object.keys(j as Record<string, unknown>)) {
      const v = (j as Record<string, any>)[key];
      if (!v || typeof v !== "object") continue;
      if (typeof v.id === "string") {
        out[v.id] = v as JournalEntry;
      } else if (typeof v.date === "string") {
        const id = `${v.date}-legacy`;
        const ts = typeof v.updatedAt === "number" ? v.updatedAt : Date.now();
        out[id] = {
          id,
          date: v.date,
          text: typeof v.text === "string" ? v.text : "",
          createdAt: ts,
          updatedAt: ts,
        };
      }
    }
    merged.journals = out;
  }
  if (!merged.brightThings || typeof merged.brightThings !== "object") {
    merged.brightThings = {};
  }
  if (!Array.isArray(merged.actionHistory)) {
    merged.actionHistory = [];
  }
  return merged;
}

async function loadState(): Promise<State> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyState;
    const parsed = JSON.parse(raw) as Partial<State>;
    return migrate(parsed);
  } catch (e) {
    console.warn("[Vibly] failed to load state", e);
    return emptyState;
  }
}

async function saveState(state: State): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn("[Vibly] failed to save state", e);
  }
}

export const [ViblyProvider, useVibly] = createContextHook(() => {
  const [state, setState] = useState<State>(emptyState);
  const [hydrated, setHydrated] = useState<boolean>(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    configureNotificationHandler();
    let alive = true;
    loadState().then((s) => {
      if (!alive) return;
      const next: State =
        s.trialStartedAt == null && !s.plan
          ? { ...s, trialStartedAt: Date.now() }
          : s;
      setState(next);
      setHydrated(true);
    });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (hydrated) {
      saveState(state);
    }
  }, [state, hydrated]);

  const saveCheckIn = useCallback(
    (partial: Omit<CheckIn, "date" | "createdAt">) => {
      const date = todayKey();
      setState((prev) => ({
        ...prev,
        checkIns: {
          ...prev.checkIns,
          [date]: { ...partial, date, createdAt: Date.now() },
        },
      }));
    },
    []
  );

  const addJournal = useCallback((text: string): JournalEntry => {
    const date = todayKey();
    const id = makeId();
    const now = Date.now();
    const entry: JournalEntry = {
      id,
      date,
      text,
      createdAt: now,
      updatedAt: now,
    };
    setState((prev) => ({
      ...prev,
      journals: { ...prev.journals, [id]: entry },
    }));
    return entry;
  }, []);

  const updateJournal = useCallback((id: string, text: string) => {
    setState((prev) => {
      const existing = prev.journals[id];
      if (!existing) return prev;
      return {
        ...prev,
        journals: {
          ...prev.journals,
          [id]: { ...existing, text, updatedAt: Date.now() },
        },
      };
    });
  }, []);

  const deleteJournal = useCallback((id: string) => {
    setState((prev) => {
      if (!prev.journals[id]) return prev;
      const next = { ...prev.journals };
      delete next[id];
      return { ...prev, journals: next };
    });
  }, []);

  const setBrightThing = useCallback((date: string, text: string) => {
    setState((prev) => {
      const next = { ...prev.brightThings };
      if (text.trim().length === 0) {
        delete next[date];
      } else {
        next[date] = text;
      }
      return { ...prev, brightThings: next };
    });
  }, []);

  const setTags = useCallback((dateKey: string, tags: MoodTag[]) => {
    setState((prev) => ({
      ...prev,
      tags: { ...prev.tags, [dateKey]: tags },
    }));
  }, []);

  const setAction = useCallback((action: SimpleAction) => {
    setState((prev) => ({
      ...prev,
      actions: { ...prev.actions, [action.date]: action },
    }));
  }, []);

  const toggleActionDone = useCallback(() => {
    const date = todayKey();
    setState((prev) => {
      const a = prev.actions[date];
      if (!a) return prev;
      return {
        ...prev,
        actions: { ...prev.actions, [date]: { ...a, done: !a.done } },
      };
    });
  }, []);

  /** Clear today's action and remember the previous title so the AI can offer something different. */
  const refreshAction = useCallback(() => {
    const date = todayKey();
    setState((prev) => {
      const prevAction = prev.actions[date];
      const nextActions = { ...prev.actions };
      delete nextActions[date];
      const nextHistory = prevAction
        ? [prevAction.title, ...prev.actionHistory.filter((t) => t !== prevAction.title)].slice(0, 12)
        : prev.actionHistory;
      return {
        ...prev,
        actions: nextActions,
        actionHistory: nextHistory,
      };
    });
    queryClient.invalidateQueries({ queryKey: ["simple-action"] });
  }, [queryClient]);

  const subscribe = useCallback((plan: Plan) => {
    setState((prev) => ({ ...prev, plan }));
  }, []);

  const cancelSubscription = useCallback(() => {
    setState((prev) => ({ ...prev, plan: null }));
  }, []);

  const resetTrial = useCallback(() => {
    setState((prev) => ({ ...prev, trialStartedAt: Date.now() }));
  }, []);

  const setReminders = useCallback(async (v: boolean): Promise<boolean> => {
    if (v) {
      const granted = await requestNotificationPermission();
      if (!granted) {
        return false;
      }
      let scheduled = false;
      setState((prev) => {
        scheduleDailyReminder(
          prev.reminderHour,
          prev.reminderMinute,
          prev.reminderSoundEnabled
        ).then((ok) => {
          scheduled = ok;
        });
        return { ...prev, remindersEnabled: true };
      });
      return scheduled || true;
    }
    await cancelDailyReminder();
    setState((prev) => ({
      ...prev,
      remindersEnabled: false,
      reminderSoundEnabled: false,
    }));
    return true;
  }, []);

  const setReminderSound = useCallback((v: boolean) => {
    setState((prev) => {
      if (prev.remindersEnabled) {
        void scheduleDailyReminder(prev.reminderHour, prev.reminderMinute, v);
      }
      return { ...prev, reminderSoundEnabled: v };
    });
  }, []);

  const setReminderTime = useCallback((hour: number, minute: number) => {
    setState((prev) => {
      if (prev.remindersEnabled) {
        void scheduleDailyReminder(hour, minute, prev.reminderSoundEnabled);
      }
      return { ...prev, reminderHour: hour, reminderMinute: minute };
    });
  }, []);

  const today = state.checkIns[todayKey()];
  const todayAction = state.actions[todayKey()];

  const todaysJournals = useMemo<JournalEntry[]>(() => {
    const today = todayKey();
    return Object.values(state.journals)
      .filter((j) => j.date === today)
      .sort((a, b) => a.createdAt - b.createdAt);
  }, [state.journals]);

  const pastJournals = useMemo<JournalEntry[]>(() => {
    const today = todayKey();
    return Object.values(state.journals)
      .filter((j) => j.date !== today && j.text.trim().length > 0)
      .sort((a, b) =>
        a.date === b.date ? b.createdAt - a.createdAt : a.date < b.date ? 1 : -1
      );
  }, [state.journals]);

  /** Latest non-empty journal entry for today — used by the Today screen shortcut. */
  const todayJournal = useMemo<JournalEntry | undefined>(() => {
    return [...todaysJournals]
      .reverse()
      .find((j) => j.text.trim().length > 0);
  }, [todaysJournals]);

  const trial = useMemo(() => {
    const startedAt = state.trialStartedAt;
    if (state.plan != null || startedAt == null) {
      return {
        isTrial: false,
        trialActive: false,
        trialExpired: false,
        trialDaysLeft: 0,
      };
    }
    const elapsedDays = (Date.now() - startedAt) / DAY_MS;
    const daysLeft = Math.max(0, Math.ceil(TRIAL_DAYS - elapsedDays));
    const active = elapsedDays < TRIAL_DAYS;
    return {
      isTrial: true,
      trialActive: active,
      trialExpired: !active,
      trialDaysLeft: daysLeft,
    };
  }, [state.trialStartedAt, state.plan]);

  const isSubscribed = state.plan != null;
  const hasAccess = isSubscribed || trial.trialActive;

  /** Current streak of consecutive days with a check-in, ending today or yesterday. */
  const streak = useMemo<number>(() => {
    let count = 0;
    const d = new Date();
    if (!state.checkIns[todayKey(d)]) {
      d.setDate(d.getDate() - 1);
    }
    while (state.checkIns[todayKey(d)]) {
      count += 1;
      d.setDate(d.getDate() - 1);
    }
    return count;
  }, [state.checkIns]);

  return {
    state,
    hydrated,
    today,
    todayJournal,
    todaysJournals,
    pastJournals,
    todayAction,
    streak,
    hasAccess,
    isSubscribed,
    plan: state.plan,
    isTrial: trial.isTrial,
    trialActive: trial.trialActive,
    trialExpired: trial.trialExpired,
    trialDaysLeft: trial.trialDaysLeft,
    saveCheckIn,
    addJournal,
    updateJournal,
    deleteJournal,
    setBrightThing,
    setTags,
    setAction,
    toggleActionDone,
    refreshAction,
    subscribe,
    cancelSubscription,
    setReminders,
    setReminderSound,
    setReminderTime,
    resetTrial,
  };
});

/** Convenience: average mood over last N days. */
export function useMoodAverage(days: number = 14): number | null {
  const { state } = useVibly();
  const keys = Object.keys(state.checkIns);
  if (keys.length === 0) return null;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutKey = todayKey(cutoff);
  const recent = keys
    .filter((k) => k >= cutKey)
    .map((k) => state.checkIns[k]);
  if (recent.length === 0) return null;
  const total = recent.reduce(
    (acc, c) => acc + (c.emotion + c.energy + c.focus) / 3,
    0
  );
  return total / recent.length;
}

/** Fetch (or reuse cached) AI-generated Simple Action for today. */
export function useTodaysAction(enabled: boolean = true) {
  const { today, todayAction, setAction, state } = useVibly();
  const key = todayKey();
  const seed = today
    ? `${today.emotion}-${today.energy}-${today.focus}`
    : "default";
  const historyKey = state.actionHistory.slice(0, 6).join("|");

  return useQuery<SimpleAction>({
    queryKey: ["simple-action", key, seed, !!todayAction, historyKey],
    queryFn: async () => {
      if (todayAction) return todayAction;
      const action = await generateSimpleAction(today, state.actionHistory);
      setAction(action);
      return action;
    },
    enabled,
    staleTime: 1000 * 60 * 60 * 12,
    retry: 1,
  });
}

async function generateSimpleAction(
  ci: CheckIn | undefined,
  avoid: string[]
): Promise<SimpleAction> {
  const date = todayKey();
  const toolkitUrl = process.env.EXPO_PUBLIC_TOOLKIT_URL;
  const secret = process.env.EXPO_PUBLIC_RORK_TOOLKIT_SECRET_KEY;

  const context = ci
    ? `Today the user feels — emotion ${ci.emotion}/10, energy ${ci.energy}/10, focus ${ci.focus}/10.`
    : "The user has not checked in today yet.";

  const avoidLine =
    avoid.length > 0
      ? ` Do NOT repeat or paraphrase any of these recent suggestions: ${avoid
          .slice(0, 8)
          .map((t) => `"${t}"`)
          .join(", ")}. Offer something genuinely different in kind, framing, or activity.`
      : "";

  const variety = `Vary your suggestion. Examples of different directions to draw from: a 60-second breathwork pattern, a sensory grounding cue (5-4-3-2-1), stepping outside for sunlight, drinking a glass of water mindfully, a short tidy-up of one surface, texting one person a thank-you, doodling for 3 minutes, a posture reset, a body scan, a short walk to a window, listening to one favourite song, writing down one worry on paper, naming three small wins, a stretch sequence, eating a snack with full attention, a 4-7-8 breath. Pick one not used recently and make it specific.`;

  const system = `You are Vibly, a warm wellbeing companion. Suggest ONE tiny, doable Simple Action for the next 10 minutes to help the user feel better today. Choose ONE kind that fits their state: "exercise" (gentle movement), "mindset" (a reframe or reflection), or "rest" (a calming pause). ${variety}${avoidLine} Reply ONLY with strict JSON: {"kind":"exercise|mindset|rest","title":"...","body":"...","duration":"..."}. The title is 3-6 words and specific (not generic). The body is 1-2 short sentences, kind and concrete. Duration is a short phrase like "5 minutes" or "2 minutes".`;

  try {
    if (!toolkitUrl || !secret) throw new Error("missing env");
    const res = await fetch(`${toolkitUrl}/v2/vercel/v1/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "anthropic/claude-haiku-4.5",
        messages: [
          { role: "system", content: system },
          { role: "user", content: context },
        ],
        response_format: { type: "json_object" },
        temperature: 1.0,
      }),
    });
    if (!res.ok) throw new Error(`AI ${res.status}`);
    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = data.choices?.[0]?.message?.content ?? "";
    const parsed = JSON.parse(content) as {
      kind: SimpleAction["kind"];
      title: string;
      body: string;
      duration: string;
    };
    return {
      date,
      kind: parsed.kind,
      title: parsed.title,
      body: parsed.body,
      duration: parsed.duration,
      done: false,
    };
  } catch (e) {
    console.warn("[Vibly] simple action fallback", e);
    return fallbackAction(ci, date, avoid);
  }
}

const FALLBACK_POOL: Omit<SimpleAction, "date" | "done">[] = [
  { kind: "rest", title: "Two-minute slow breath", body: "Inhale for four, exhale for six. Let your shoulders soften with each breath out.", duration: "2 minutes" },
  { kind: "rest", title: "5-4-3-2-1 grounding", body: "Name five things you can see, four you can feel, three you can hear, two you can smell, one you can taste.", duration: "3 minutes" },
  { kind: "exercise", title: "Stretch toward a window", body: "Stand up, reach overhead, then twist gently side to side. Find the brightest window in the room.", duration: "3 minutes" },
  { kind: "exercise", title: "Five-minute walk outside", body: "Step outside, no phone, and let your eyes travel further than usual. Notice one new detail.", duration: "5 minutes" },
  { kind: "mindset", title: "Name three small wins", body: "Write down three tiny things that went better than expected today — even small ones count.", duration: "3 minutes" },
  { kind: "mindset", title: "Text one warm hello", body: "Send a short, kind message to someone you appreciate. No agenda — just warmth.", duration: "2 minutes" },
  { kind: "rest", title: "A mindful glass of water", body: "Pour a glass of water and drink it slowly, paying attention to temperature and taste.", duration: "2 minutes" },
  { kind: "exercise", title: "Reset your posture", body: "Roll your shoulders back, lengthen your spine, soften your jaw. Hold the new shape for five slow breaths.", duration: "1 minute" },
  { kind: "mindset", title: "One worry on paper", body: "Write down the worry that's loudest right now. Seeing it on paper often makes it smaller.", duration: "3 minutes" },
  { kind: "rest", title: "Box-breathing for a minute", body: "Inhale 4, hold 4, exhale 4, hold 4. Repeat for one full minute.", duration: "1 minute" },
  { kind: "exercise", title: "Tidy one surface", body: "Pick one small surface and clear it completely. The space outside often quiets the space inside.", duration: "5 minutes" },
  { kind: "mindset", title: "A thank-you note", body: "Write three lines to someone who's been kind to you lately — even if you don't send it.", duration: "4 minutes" },
];

function fallbackAction(
  ci: CheckIn | undefined,
  date: string,
  avoid: string[]
): SimpleAction {
  const energy = ci?.energy ?? 5;
  const emotion = ci?.emotion ?? 5;
  const avoidSet = new Set(avoid);
  let pool = FALLBACK_POOL.filter((a) => !avoidSet.has(a.title));
  if (pool.length === 0) pool = FALLBACK_POOL;
  if (energy <= 4 && emotion <= 5) {
    pool = pool.filter((a) => a.kind !== "exercise").length > 0
      ? pool.filter((a) => a.kind !== "exercise")
      : pool;
  } else if (energy >= 7) {
    pool = pool.filter((a) => a.kind !== "rest").length > 0
      ? pool.filter((a) => a.kind !== "rest")
      : pool;
  }
  const pick = pool[Math.floor(Math.random() * pool.length)];
  return { ...pick, date, done: false };
}

/** AI daily insight for Pro users — regenerated each day. */
export function useDailyInsight(enabled: boolean) {
  const { state } = useVibly();
  const today = todayKey();
  const recentKeys = Object.keys(state.checkIns).sort().slice(-7);
  const todayCi = state.checkIns[today];
  const recent = recentKeys
    .map((k) => {
      const c = state.checkIns[k];
      return `${k}${k === today ? " (today)" : ""}: emotion ${c.emotion}, energy ${c.energy}, focus ${c.focus}`;
    })
    .join("\n");
  const todayTags = state.tags[today] ?? [];
  const todayBright = state.brightThings[today];

  // Pull hour-of-day check-in patterns so the AI can surface peak creative windows.
  const hourlyBuckets: { hour: number; score: number }[] = [];
  Object.values(state.checkIns).forEach((c) => {
    if (!c.createdAt) return;
    const hour = new Date(c.createdAt).getHours();
    const score = (c.emotion + c.energy + c.focus) / 3;
    hourlyBuckets.push({ hour, score });
  });
  const hourSummary = (() => {
    if (hourlyBuckets.length < 3) return "";
    const byBlock: Record<string, { sum: number; n: number }> = {
      morning: { sum: 0, n: 0 },
      midday: { sum: 0, n: 0 },
      afternoon: { sum: 0, n: 0 },
      evening: { sum: 0, n: 0 },
    };
    hourlyBuckets.forEach(({ hour, score }) => {
      const k =
        hour < 11 ? "morning" : hour < 14 ? "midday" : hour < 18 ? "afternoon" : "evening";
      byBlock[k].sum += score;
      byBlock[k].n += 1;
    });
    const parts = Object.entries(byBlock)
      .filter(([, v]) => v.n > 0)
      .map(([k, v]) => `${k} avg ${(v.sum / v.n).toFixed(1)}/10 (n=${v.n})`);
    return parts.length ? `\nTime-of-day patterns: ${parts.join("; ")}.` : "";
  })();

  const context = todayCi
    ? `Today's check-in — emotion ${todayCi.emotion}/10, energy ${todayCi.energy}/10, focus ${todayCi.focus}/10.${todayTags.length ? ` Tags: ${todayTags.join(", ")}.` : ""}${todayBright ? ` One bright thing they noted: "${todayBright}".` : ""}\n\nRecent days:\n${recent}${hourSummary}`
    : `No check-in yet for today. Recent days:\n${recent || "(no recent data)"}${hourSummary}`;

  return useQuery<string>({
    queryKey: [
      "daily-insight",
      today,
      todayCi ? `${todayCi.emotion}-${todayCi.energy}-${todayCi.focus}` : "none",
      todayTags.join(","),
    ],
    queryFn: async () => {
      const toolkitUrl = process.env.EXPO_PUBLIC_TOOLKIT_URL;
      const secret = process.env.EXPO_PUBLIC_RORK_TOOLKIT_SECRET_KEY;
      if (!toolkitUrl || !secret) throw new Error("missing env");
      const res = await fetch(
        `${toolkitUrl}/v2/vercel/v1/chat/completions`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${secret}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "anthropic/claude-sonnet-4.5",
            messages: [
              {
                role: "system",
                content:
                  "You are Vibly, a warm companion for creative working people (founders, makers, writers, designers, builders). You MUST format your reply in TWO parts separated by a single blank line. Do not skip Part 1.\n\nPART 1 — Status line (REQUIRED, exactly one line): start with ONE emoji that matches today's state, then a short single sentence (max ~16 words) naming the vibe AND the realistic productivity level for today. Choose the emoji + framing from their data:\n• 🌱 creativity is low — go gentle, simple tasks only\n• 🔥 burnout risk — protect rest, no heavy lifts\n• ⚖️ output vs rest — balance focused work with breaks\n• ☀️ creative peak — tackle the hard, generative work\n• 🌊 steady flow — keep a calm execution pace\n• 🌙 low energy — rest is the productive choice\nExamples: '🌱 Creativity feels low — keep today small and forgiving.' or '☀️ You're in a creative peak — protect a deep, generative block.'\n\nPART 2 — Reflection (REQUIRED, 5-7 warm sentences, ~90-130 words): fuse their mood with creative work life. You MUST include all of:\n1) Read their current state out loud (what the emotion/energy/focus numbers actually feel like).\n2) Recommend a concrete CATEGORY of work that fits today — be specific. Low energy/focus (≤4) → admin, light email, organising notes, low-stakes editing, watching reference, a single tiny decision. Mid energy/focus (5-6) → execution work, polishing, planning, structured tasks with clear scope. High energy/focus (≥7) → the hard creative generative work: new ideas, writing the messy first draft, big design moves, the hairy problem you've been avoiding.\n3) Name ONE concrete stress-management or recovery action if emotion or energy is low (e.g. a 10-minute walk in daylight, box breathing for 90 seconds, closing one tab and one task, eating something warm).\n4) If you can see a time-of-day pattern in the data, mention their likely peak window today.\n5) End with ONE short reflective question that ties mood to a real work decision (e.g. 'What's the smallest version of today's most important task?').\n\nSpeak in second person, warm and grounded, like a thoughtful friend. No lists, no bullets, no headings, no markdown. The status line is the ONLY place an emoji appears. Always include both parts.",
              },
              { role: "user", content: context },
            ],
            temperature: 0.85,
            max_tokens: 700,
          }),
        }
      );
      const data = (await res.json()) as {
        choices?: { message?: { content?: string } }[];
      };
      return (
        data.choices?.[0]?.message?.content ??
        "Today is quietly unfolding — keep checking in."
      );
    },
    enabled: enabled && recentKeys.length > 0,
    staleTime: 1000 * 60 * 60 * 6,
    retry: 1,
  });
}
