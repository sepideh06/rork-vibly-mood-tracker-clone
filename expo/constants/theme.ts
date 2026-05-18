import { Platform } from "react-native";

export const palette = {
  peachLight: "#FFE4CC",
  peach: "#FFD0A8",
  coral: "#FF8A6B",
  coralDeep: "#F26A4C",
  amber: "#F5A65B",
  amberDeep: "#E48542",
  cream: "#FFF7EE",
  creamSoft: "#FFEFE0",
  plum: "#2E1620",
  plumSoft: "#5A3441",
  muted: "#8C6470",
  border: "rgba(46, 22, 32, 0.08)",
  borderWarm: "rgba(242, 106, 76, 0.18)",
  white: "#FFFFFF",
  black: "#000000",
  success: "#6BBF8A",
  shadow: "rgba(80, 30, 20, 0.10)",
} as const;

export const sunsetGradient: readonly [string, string, string, string] = [
  "#F0875E",
  "#C5482C",
  "#6E1F2F",
  "#2E1620",
];

export const sunsetSoft: readonly [string, string] = ["#E07A5A", "#7A2A35"];

export const fonts = {
  serif: Platform.select({
    ios: "Georgia",
    android: "serif",
    default: "Georgia",
  }) as string,
  sans: Platform.select({
    ios: "System",
    android: "sans-serif",
    default: "System",
  }) as string,
};

export const radius = {
  sm: 10,
  md: 16,
  lg: 22,
  xl: 28,
  pill: 999,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  xxxl: 40,
} as const;

export const shadow = {
  card: {
    shadowColor: "#5A1F12",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 18,
    elevation: 6,
  },
  soft: {
    shadowColor: "#5A1F12",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
} as const;

/** Map a 1–10 score to a warm color along the sunset spectrum. */
export function scoreToColor(score: number): string {
  const t = Math.max(0, Math.min(1, (score - 1) / 9));
  // interpolate cream -> peach -> coral -> amberDeep
  const stops = [
    { p: 0.0, c: [255, 220, 200] },
    { p: 0.5, c: [255, 158, 124] },
    { p: 1.0, c: [228, 100, 70] },
  ];
  let a = stops[0];
  let b = stops[stops.length - 1];
  for (let i = 0; i < stops.length - 1; i++) {
    if (t >= stops[i].p && t <= stops[i + 1].p) {
      a = stops[i];
      b = stops[i + 1];
      break;
    }
  }
  const lt = (t - a.p) / (b.p - a.p || 1);
  const r = Math.round(a.c[0] + (b.c[0] - a.c[0]) * lt);
  const g = Math.round(a.c[1] + (b.c[1] - a.c[1]) * lt);
  const bl = Math.round(a.c[2] + (b.c[2] - a.c[2]) * lt);
  return `rgb(${r}, ${g}, ${bl})`;
}

export const moodLabel = (score: number): string => {
  if (score <= 2) return "Heavy";
  if (score <= 4) return "Low";
  if (score <= 6) return "Steady";
  if (score <= 8) return "Bright";
  return "Radiant";
};
