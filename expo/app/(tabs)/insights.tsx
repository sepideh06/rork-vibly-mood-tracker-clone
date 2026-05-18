import { Sparkles, TrendingUp } from "lucide-react-native";
import React, { useEffect, useMemo, useRef } from "react";
import {
  Animated,
  Easing,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Defs, LinearGradient as SvgLG, Path, Stop } from "react-native-svg";

import Card from "@/components/Card";
import SunsetBackground from "@/components/SunsetBackground";
import {
  fonts,
  moodLabel,
  palette,
  radius,
  scoreToColor,
  spacing,
} from "@/constants/theme";
import { useDailyInsight, useVibly } from "@/providers/ViblyProvider";
import { ALL_TAGS, MoodTag } from "@/types/vibly";
import { lastNDates, shortDay } from "@/utils/date";

const RIBBON_DAYS = 14;

export default function InsightsScreen() {
  const insets = useSafeAreaInsets();
  const { state } = useVibly();
  const insight = useDailyInsight(true);

  const dates = useMemo(() => lastNDates(RIBBON_DAYS), []);
  const dayData = useMemo(
    () =>
      dates.map((d) => {
        const c = state.checkIns[d];
        if (!c) return { date: d, score: null as number | null };
        return { date: d, score: (c.emotion + c.energy + c.focus) / 3 };
      }),
    [dates, state.checkIns]
  );

  const tagBreakdown = useMemo(() => {
    const buckets: Record<MoodTag, { sum: number; count: number }> = {
      Work: { sum: 0, count: 0 },
      Sleep: { sum: 0, count: 0 },
      People: { sum: 0, count: 0 },
      Health: { sum: 0, count: 0 },
      Movement: { sum: 0, count: 0 },
      Creativity: { sum: 0, count: 0 },
    };
    Object.keys(state.tags).forEach((dateKey) => {
      const ci = state.checkIns[dateKey];
      if (!ci) return;
      const score = (ci.emotion + ci.energy + ci.focus) / 3;
      state.tags[dateKey].forEach((t) => {
        if (buckets[t]) {
          buckets[t].sum += score;
          buckets[t].count += 1;
        }
      });
    });
    return ALL_TAGS.map((t) => ({
      tag: t,
      avg: buckets[t].count > 0 ? buckets[t].sum / buckets[t].count : null,
      count: buckets[t].count,
    }));
  }, [state.tags, state.checkIns]);

  const hasTagData = tagBreakdown.some((b) => b.count > 0);

  const scoresOnly = dayData
    .map((d) => d.score)
    .filter((v): v is number => v !== null);
  const avg = scoresOnly.length
    ? scoresOnly.reduce((a, b) => a + b, 0) / scoresOnly.length
    : null;
  const best = scoresOnly.length ? Math.max(...scoresOnly) : null;
  const current = dayData[dayData.length - 1].score;

  return (
    <SunsetBackground>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 110 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.h1}>Your patterns</Text>
        <Text style={styles.h1Sub}>Last {RIBBON_DAYS} days · gentle, honest</Text>

        <Card>
          <View style={styles.statsRow}>
            <Stat label="Average" value={avg} />
            <View style={styles.statDivider} />
            <Stat label="Best day" value={best} />
            <View style={styles.statDivider} />
            <Stat label="Today" value={current} />
          </View>
        </Card>

        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>Mood ribbon</Text>
        </View>
        <Card>
          <View style={styles.ribbonRow}>
            {dayData.map((d, i) => (
              <RibbonBar key={d.date} score={d.score} index={i} />
            ))}
          </View>
          <View style={styles.ribbonLabels}>
            {dayData.map((d, i) =>
              i % 2 === 0 ? (
                <Text key={d.date} style={styles.ribbonLabel}>
                  {shortDay(d.date).slice(0, 1)}
                </Text>
              ) : (
                <View key={d.date} style={{ width: 14 }} />
              )
            )}
          </View>
        </Card>

        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>Trend</Text>
          <TrendingUp size={16} color={palette.coralDeep} />
        </View>
        <Card>
          <TrendChart data={dayData.map((d) => d.score)} />
        </Card>

        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>Creative energy insight</Text>
          <View style={styles.aiBadge}>
            <Sparkles size={11} color={palette.coralDeep} />
            <Text style={styles.aiBadgeText}>AI</Text>
          </View>
        </View>
        <Card tint="soft">
          {insight.isLoading ? (
            <Text style={styles.insightText}>Reading your day with care…</Text>
          ) : (
            <InsightBody text={insight.data ?? "Today is quietly unfolding — keep checking in."} />
          )}
        </Card>

        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>Mood by context</Text>
        </View>
        <Card>
          {hasTagData ? (
            <View style={{ gap: 10 }}>
              {tagBreakdown
                .filter((b) => b.count > 0)
                .sort((a, b) => (b.avg ?? 0) - (a.avg ?? 0))
                .map((b) => (
                  <TagRow
                    key={b.tag}
                    tag={b.tag}
                    avg={b.avg ?? 0}
                    count={b.count}
                  />
                ))}
            </View>
          ) : (
            <Text style={styles.insightText}>
              Add tags on your check-in (Work, Sleep, People…) and a warm
              breakdown will appear here — showing which contexts lift you.
            </Text>
          )}
        </Card>
      </ScrollView>
    </SunsetBackground>
  );
}

function InsightBody({ text }: { text: string }) {
  // The model is asked to return a status line, a blank line, then the reflection.
  // We robustly extract the status line so the mood/productivity read always shows,
  // even when the model skips the blank-line separator.
  const trimmed = text.trim();
  let status = "";
  let body = trimmed;

  const parts = trimmed.split(/\n\s*\n/);
  if (parts.length >= 2) {
    status = parts[0].trim();
    body = parts.slice(1).join("\n\n").trim();
  } else {
    const firstLine = trimmed.split("\n")[0] ?? "";
    // If the first line starts with an emoji, treat it as the status line.
    if (/^\p{Extended_Pictographic}/u.test(firstLine)) {
      status = firstLine.trim();
      body = trimmed.slice(firstLine.length).trim();
    } else {
      // Otherwise pull the first sentence containing an emoji as the status.
      const sentenceMatch = trimmed.match(/^(.*?\p{Extended_Pictographic}.*?[.!?])\s+/u);
      if (sentenceMatch) {
        status = sentenceMatch[1].trim();
        body = trimmed.slice(sentenceMatch[0].length).trim();
      }
    }
  }

  // Pull the leading emoji out of the status line so we can render it large.
  const emojiMatch = status.match(/^(\p{Extended_Pictographic}\uFE0F?)\s*(.*)$/u);
  const emoji = emojiMatch?.[1] ?? "";
  const statusText = emojiMatch?.[2] ?? status;

  return (
    <View style={{ gap: 12 }}>
      {status.length > 0 ? (
        <View style={styles.statusRow}>
          {emoji ? <Text style={styles.statusEmoji}>{emoji}</Text> : null}
          <Text style={styles.statusText}>{statusText}</Text>
        </View>
      ) : null}
      {body.length > 0 ? <Text style={styles.insightText}>{body}</Text> : null}
    </View>
  );
}

function Stat({ label, value }: { label: string; value: number | null }) {
  const display = value !== null ? value.toFixed(1) : "—";
  const color = value !== null ? scoreToColor(value) : palette.muted;
  const sub = value !== null ? moodLabel(value) : "no data";
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, { color }]}>{display}</Text>
      <Text style={styles.statSub}>{sub}</Text>
    </View>
  );
}

function RibbonBar({ score, index }: { score: number | null; index: number }) {
  const h = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(h, {
      toValue: 1,
      delay: 60 + index * 30,
      duration: 500,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [h, index]);

  const filled = score !== null;
  const ratio = filled ? (score - 1) / 9 : 0;
  const height = h.interpolate({
    inputRange: [0, 1],
    outputRange: [6, Math.max(8, ratio * 110)],
  });
  return (
    <View style={styles.ribbonCol}>
      <Animated.View
        style={[
          styles.ribbonBar,
          {
            height,
            backgroundColor: filled
              ? scoreToColor(score!)
              : "rgba(46,22,32,0.08)",
          },
        ]}
      />
    </View>
  );
}

function TrendChart({ data }: { data: (number | null)[] }) {
  const w = 300;
  const h = 140;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const score = v ?? 5;
    const y = h - ((score - 1) / 9) * h;
    return { x, y, present: v !== null };
  });

  const linePath = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(" ");
  const areaPath = `${linePath} L ${w} ${h} L 0 ${h} Z`;

  return (
    <View style={{ alignItems: "center" }}>
      <Svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`}>
        <Defs>
          <SvgLG id="warm" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={palette.coral} stopOpacity={0.55} />
            <Stop offset="1" stopColor={palette.coral} stopOpacity={0.05} />
          </SvgLG>
        </Defs>
        <Path d={areaPath} fill="url(#warm)" />
        <Path
          d={linePath}
          stroke={palette.coralDeep}
          strokeWidth={3}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </Svg>
      <Text style={styles.chartCaption}>
        Higher means warmer days. Each point is your daily average.
      </Text>
    </View>
  );
}

function TagRow({
  tag,
  avg,
  count,
}: {
  tag: MoodTag;
  avg: number;
  count: number;
}) {
  const ratio = Math.max(0, Math.min(1, (avg - 1) / 9));
  return (
    <View style={styles.tagRow}>
      <Text style={styles.tagRowName}>{tag}</Text>
      <View style={styles.tagBarTrack}>
        <View
          style={[
            styles.tagBarFill,
            {
              width: `${Math.max(6, ratio * 100)}%`,
              backgroundColor: scoreToColor(avg),
            },
          ]}
        />
      </View>
      <Text style={styles.tagRowValue}>{avg.toFixed(1)}</Text>
      <Text style={styles.tagRowCount}>· {count}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: spacing.lg, gap: spacing.lg },
  h1: {
    fontFamily: fonts.serif,
    fontSize: 34,
    color: palette.plum,
    fontWeight: "700",
    letterSpacing: -1,
  },
  h1Sub: { color: palette.plumSoft, fontSize: 14, marginTop: -4 },

  statsRow: { flexDirection: "row", alignItems: "center" },
  statDivider: {
    width: 1,
    height: 36,
    backgroundColor: "rgba(46,22,32,0.08)",
  },
  stat: { flex: 1, alignItems: "center", gap: 2 },
  statLabel: { fontSize: 11, color: palette.muted, fontWeight: "700", letterSpacing: 1 },
  statValue: { fontFamily: fonts.serif, fontSize: 28, fontWeight: "700", letterSpacing: -1 },
  statSub: { fontSize: 11, color: palette.plumSoft },

  sectionHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 4,
    marginTop: spacing.xs,
  },
  sectionTitle: {
    fontFamily: fonts.serif,
    fontSize: 22,
    color: palette.plum,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  aiBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(242,106,76,0.12)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  aiBadgeText: {
    fontSize: 10,
    color: palette.coralDeep,
    fontWeight: "700",
    letterSpacing: 1,
  },

  ribbonRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    height: 130,
    paddingHorizontal: 2,
  },
  ribbonCol: { width: 14, alignItems: "center" },
  ribbonBar: { width: 12, borderRadius: 8 },
  ribbonLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  ribbonLabel: { width: 14, textAlign: "center", color: palette.muted, fontSize: 11 },
  chartCaption: {
    marginTop: 8,
    color: palette.muted,
    fontSize: 11,
    textAlign: "center",
  },

  insightText: { color: palette.plumSoft, fontSize: 14, lineHeight: 22 },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(46,22,32,0.08)",
  },
  statusEmoji: { fontSize: 30 },
  statusText: {
    flex: 1,
    fontFamily: fonts.serif,
    fontSize: 17,
    lineHeight: 23,
    color: palette.plum,
    fontWeight: "700",
    letterSpacing: -0.3,
  },

  lockRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  lockIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "rgba(242,106,76,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  lockTitle: {
    fontFamily: fonts.sans,
    fontWeight: "700",
    color: palette.plum,
    fontSize: 15,
  },
  lockBody: { color: palette.plumSoft, fontSize: 13, marginTop: 2 },
  tryPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: palette.plum,
    borderRadius: radius.pill,
  },
  tryPillText: { color: "#FFF7EE", fontSize: 11, fontWeight: "700" },

  tagRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  tagRowName: {
    width: 84,
    fontSize: 13,
    fontWeight: "700",
    color: palette.plum,
  },
  tagBarTrack: {
    flex: 1,
    height: 10,
    borderRadius: radius.pill,
    backgroundColor: "rgba(46,22,32,0.07)",
    overflow: "hidden",
  },
  tagBarFill: { height: 10, borderRadius: radius.pill },
  tagRowValue: {
    fontFamily: fonts.serif,
    fontSize: 14,
    fontWeight: "700",
    color: palette.plum,
    width: 30,
    textAlign: "right",
  },
  tagRowCount: { fontSize: 11, color: palette.muted, width: 24 },
});
