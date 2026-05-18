import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import {
  ArrowRight,
  BookHeart,
  Check,
  Coffee,
  Flame,
  Heart,
  Leaf,
  RefreshCw,
  Sparkles,
  Sun,
  Wind,
} from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Card from "@/components/Card";
import PressableScale from "@/components/PressableScale";
import SunsetBackground from "@/components/SunsetBackground";
import {
  fonts,
  moodLabel,
  palette,
  radius,
  scoreToColor,
  spacing,
} from "@/constants/theme";
import { useDailyInsight, useTodaysAction, useVibly } from "@/providers/ViblyProvider";
import { emotionFromScore } from "@/types/vibly";
import { greeting, prettyDate, todayKey } from "@/utils/date";

export default function TodayScreen() {
  const insets = useSafeAreaInsets();
  const {
    today,
    todayJournal,
    streak,
    state,
    toggleActionDone,
    refreshAction,
    setBrightThing,
  } = useVibly();
  const action = useTodaysAction(true);
  const todayKeyStr = todayKey();
  const hasBright = (state.brightThings[todayKeyStr] ?? "").trim().length > 0;
  const dayComplete = !!today && hasBright && !!todayJournal;
  const insight = useDailyInsight(dayComplete);

  const avgToday = today
    ? (today.emotion + today.energy + today.focus) / 3
    : null;
  const todayEmoji = today ? emotionFromScore(today.emotion).emoji : null;

  const dateKey = todayKey();
  const savedBright = state.brightThings[dateKey] ?? "";
  const [bright, setBright] = useState<string>(savedBright);

  useEffect(() => {
    setBright(state.brightThings[dateKey] ?? "");
  }, [state.brightThings, dateKey]);

  const persistBright = () => {
    if (bright !== savedBright) {
      setBrightThing(dateKey, bright);
    }
  };

  return (
    <SunsetBackground>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 110 },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={styles.greet}>{greeting()}</Text>
          <Text style={styles.date}>{prettyDate(todayKey())}</Text>
        </View>

        {today ? (
          <Card>
            <View style={styles.summaryRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.kicker}>Today you feel</Text>
                <View style={styles.moodLine}>
                  {todayEmoji ? (
                    <Text style={styles.moodEmoji}>{todayEmoji}</Text>
                  ) : null}
                  <Text
                    style={[
                      styles.moodTitle,
                      { color: scoreToColor(avgToday ?? 5) },
                    ]}
                  >
                    {moodLabel(avgToday ?? 5)}
                  </Text>
                </View>
              </View>
              <View style={styles.scorePill}>
                <Text style={styles.scorePillText}>
                  {avgToday?.toFixed(1)}
                </Text>
                <Text style={styles.scorePillSub}>/ 10</Text>
              </View>
            </View>
            <View style={styles.metricsRow}>
              <Metric
                label="Emotion"
                value={today.emotion}
                icon={<Heart size={14} color={palette.coralDeep} />}
              />
              <Metric
                label="Energy"
                value={today.energy}
                icon={<Flame size={14} color={palette.amberDeep} />}
              />
              <Metric
                label="Focus"
                value={today.focus}
                icon={<Sun size={14} color={palette.coralDeep} />}
              />
            </View>
            <PressableScale
              style={styles.editBtn}
              onPress={() => router.push("/check-in")}
            >
              <Text style={styles.editBtnText}>Update today’s check-in</Text>
              <ArrowRight size={16} color={palette.plum} />
            </PressableScale>
          </Card>
        ) : (
          <PressableScale onPress={() => router.push("/check-in")}>
            <LinearGradient
              colors={["#FFFFFF", "#FFEAD6"]}
              style={styles.checkInCta}
            >
              <View style={styles.ctaIcon}>
                <Sparkles size={22} color={palette.coralDeep} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.ctaTitle}>How are you, today?</Text>
                <Text style={styles.ctaBody}>
                  A 30-second check-in to set the tone of your day.
                </Text>
              </View>
              <ArrowRight size={20} color={palette.plum} />
            </LinearGradient>
          </PressableScale>
        )}

        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>Today’s Simple Action</Text>
          <View style={styles.aiBadge}>
            <Sparkles size={11} color={palette.coralDeep} />
            <Text style={styles.aiBadgeText}>AI</Text>
          </View>
        </View>

        <ActionCard
          loading={action.isLoading || action.isFetching}
          error={!!action.error}
          kind={action.data?.kind}
          title={action.data?.title ?? "Sketching a gentle idea..."}
          body={
            action.data?.body ??
            "Vibly is thinking of something tiny and helpful for your next few minutes."
          }
          duration={action.data?.duration ?? "moments"}
          done={state.actions[todayKey()]?.done ?? false}
          onToggle={toggleActionDone}
          onRefresh={refreshAction}
          refreshing={action.isFetching && !action.data}
        />

        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>One bright thing</Text>
          <Sparkles size={16} color={palette.amberDeep} />
        </View>
        <Card>
          <Text style={styles.brightHint}>
            What has gone well for you today? Even something small counts.
          </Text>
          <TextInput
            value={bright}
            onChangeText={setBright}
            onBlur={persistBright}
            placeholder="A tiny win, a kind moment, a good cup of coffee…"
            placeholderTextColor={palette.muted}
            multiline
            style={styles.brightInput}
            textAlignVertical="top"
          />
          <View style={styles.brightFooterRow}>
            <Text style={styles.brightStatus}>
              {savedBright.trim().length > 0
                ? "Saved · returns tomorrow as a memory"
                : "Auto-saves when you tap away"}
            </Text>
            {bright !== savedBright && bright.trim().length > 0 ? (
              <PressableScale
                onPress={persistBright}
                style={styles.brightSaveBtn}
                haptic={false}
              >
                <Text style={styles.brightSaveText}>Save</Text>
              </PressableScale>
            ) : null}
          </View>
        </Card>

        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>Reflections</Text>
        </View>
        <PressableScale onPress={() => router.push("/(tabs)/journal")}>
          <Card tint="soft">
            <View style={styles.journalRow}>
              <View style={styles.journalIcon}>
                <BookHeart size={18} color={palette.coralDeep} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.journalTitle}>
                  {todayJournal
                    ? "Continue in your journal"
                    : "Open your journal"}
                </Text>
                <Text style={styles.journalBody} numberOfLines={2}>
                  {todayJournal?.text?.trim() ||
                    "Add as many short notes as you like — each one with a tap of +."}
                </Text>
              </View>
              <ArrowRight size={18} color={palette.plumSoft} />
            </View>
          </Card>
        </PressableScale>

        {dayComplete ? (
          <>
            <View style={styles.sectionHead}>
              <Text style={styles.sectionTitle}>Creative energy insight</Text>
              <View style={styles.aiBadge}>
                <Sparkles size={11} color={palette.coralDeep} />
                <Text style={styles.aiBadgeText}>AI</Text>
              </View>
            </View>
            <Card tint="soft">
              <Text style={styles.insightText}>
                {insight.isLoading
                  ? "Reading your day with care\u2026"
                  : (insight.data ??
                    "Today is quietly unfolding \u2014 keep checking in.")}
              </Text>
            </Card>
          </>
        ) : null}

        {streak > 0 ? (
          <View style={styles.streakWrap}>
            <Flame size={16} color={palette.coralDeep} />
            <Text style={styles.streakText}>
              {streak}-day streak — keep the warmth going
            </Text>
          </View>
        ) : null}
      </ScrollView>
    </SunsetBackground>
  );
}

function Metric({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <View style={styles.metric}>
      <View style={styles.metricHead}>
        {icon}
        <Text style={styles.metricLabel}>{label}</Text>
      </View>
      <Text style={[styles.metricValue, { color: scoreToColor(value) }]}>
        {value}
      </Text>
      <View style={styles.metricBarBg}>
        <View
          style={[
            styles.metricBarFill,
            {
              width: `${(value / 10) * 100}%`,
              backgroundColor: scoreToColor(value),
            },
          ]}
        />
      </View>
    </View>
  );
}

function ActionCard({
  loading,
  error,
  kind,
  title,
  body,
  duration,
  done,
  onToggle,
  onRefresh,
  refreshing,
}: {
  loading: boolean;
  error: boolean;
  kind?: "exercise" | "mindset" | "rest";
  title: string;
  body: string;
  duration: string;
  done: boolean;
  onToggle: () => void;
  onRefresh: () => void;
  refreshing: boolean;
}) {
  const Icon = kind === "exercise" ? Wind : kind === "rest" ? Coffee : Leaf;
  const tint =
    kind === "exercise"
      ? palette.amberDeep
      : kind === "rest"
        ? palette.plumSoft
        : palette.coralDeep;
  return (
    <Card>
      <View style={styles.actionHead}>
        <View style={[styles.actionIcon, { backgroundColor: `${tint}1A` }]}>
          <Icon size={20} color={tint} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.actionKind}>
            {kind ? kind.toUpperCase() : "WARMING UP"} · {duration}
          </Text>
          <Text style={styles.actionTitle}>{title}</Text>
        </View>
      </View>
      {loading && !title ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator color={palette.coralDeep} />
          <Text style={styles.actionBody}>Tuning into your day…</Text>
        </View>
      ) : (
        <Text style={styles.actionBody}>
          {error
            ? "We couldn’t reach Vibly’s helper just now. Try a slow breath instead."
            : body}
        </Text>
      )}
      <View style={styles.actionFooterRow}>
        <PressableScale
          onPress={onRefresh}
          style={styles.refreshBtn}
          haptic={Platform.OS !== "web"}
        >
          {refreshing ? (
            <ActivityIndicator size="small" color={palette.coralDeep} />
          ) : (
            <RefreshCw size={14} color={palette.coralDeep} />
          )}
          <Text style={styles.refreshText}>Refresh</Text>
        </PressableScale>
        <PressableScale
          onPress={onToggle}
          style={[styles.doneBtn, done && { backgroundColor: palette.success }]}
        >
          {done ? (
            <>
              <Check size={16} color="#fff" />
              <Text style={[styles.doneText, { color: "#fff" }]}>Done — nice</Text>
            </>
          ) : (
            <Text style={styles.doneText}>I did it</Text>
          )}
        </PressableScale>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: spacing.lg, gap: spacing.lg },
  header: { gap: 4, paddingHorizontal: 4 },
  greet: {
    fontFamily: fonts.serif,
    fontSize: 34,
    color: palette.plum,
    fontWeight: "700",
    letterSpacing: -1,
  },
  date: { fontFamily: fonts.sans, color: palette.plumSoft, fontSize: 14 },

  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  kicker: {
    color: palette.muted,
    fontSize: 12,
    letterSpacing: 1.5,
    fontWeight: "700",
  },
  moodLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 2,
  },
  moodEmoji: { fontSize: 34 },
  moodTitle: {
    fontFamily: fonts.serif,
    fontSize: 38,
    fontWeight: "700",
    letterSpacing: -1.5,
  },
  scorePill: {
    flexDirection: "row",
    alignItems: "baseline",
    backgroundColor: "rgba(46,22,32,0.06)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
    gap: 2,
  },
  scorePillText: {
    fontFamily: fonts.serif,
    fontSize: 22,
    color: palette.plum,
    fontWeight: "700",
  },
  scorePillSub: { color: palette.muted, fontSize: 12 },

  metricsRow: { flexDirection: "row", gap: 10, marginTop: spacing.lg },
  metric: { flex: 1, gap: 6 },
  metricHead: { flexDirection: "row", alignItems: "center", gap: 4 },
  metricLabel: { fontSize: 11, color: palette.muted, fontWeight: "600" },
  metricValue: {
    fontFamily: fonts.serif,
    fontSize: 22,
    fontWeight: "700",
  },
  metricBarBg: {
    height: 4,
    borderRadius: 4,
    backgroundColor: "rgba(46,22,32,0.08)",
    overflow: "hidden",
  },
  metricBarFill: { height: 4, borderRadius: 4 },

  editBtn: {
    marginTop: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: radius.pill,
    backgroundColor: "rgba(46,22,32,0.05)",
  },
  editBtnText: { color: palette.plum, fontWeight: "600", fontSize: 14 },

  checkInCta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 18,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: palette.borderWarm,
  },
  ctaIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FFE4CC",
    alignItems: "center",
    justifyContent: "center",
  },
  ctaTitle: {
    fontFamily: fonts.serif,
    fontSize: 20,
    color: palette.plum,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  ctaBody: { color: palette.plumSoft, fontSize: 13, marginTop: 2 },

  sectionHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.xs,
    paddingHorizontal: 4,
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

  actionHead: { flexDirection: "row", alignItems: "center", gap: 12 },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  actionKind: {
    fontSize: 10,
    letterSpacing: 1.5,
    color: palette.muted,
    fontWeight: "700",
  },
  actionTitle: {
    fontFamily: fonts.serif,
    fontSize: 20,
    color: palette.plum,
    fontWeight: "700",
    letterSpacing: -0.5,
    marginTop: 2,
  },
  actionBody: {
    color: palette.plumSoft,
    fontSize: 14,
    lineHeight: 21,
    marginTop: spacing.md,
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: spacing.md,
  },
  actionFooterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: spacing.lg,
  },
  refreshBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderRadius: radius.md,
    backgroundColor: "rgba(242,106,76,0.14)",
    borderWidth: 1,
    borderColor: "rgba(242,106,76,0.28)",
  },
  refreshText: {
    color: palette.coralDeep,
    fontWeight: "700",
    fontSize: 13,
  },
  doneBtn: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: radius.md,
    backgroundColor: palette.plum,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  doneText: { color: "#FFF7EE", fontWeight: "700", fontSize: 15 },
  insightText: { color: palette.plumSoft, fontSize: 14, lineHeight: 22 },

  brightHint: {
    color: palette.plumSoft,
    fontSize: 13,
    marginBottom: spacing.sm,
  },
  brightInput: {
    minHeight: 80,
    fontSize: 15,
    color: palette.plum,
    fontFamily: fonts.serif,
    lineHeight: 22,
    padding: 12,
    backgroundColor: "rgba(46,22,32,0.04)",
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "rgba(46,22,32,0.06)",
  },
  brightFooterRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.sm,
  },
  brightStatus: { fontSize: 11, color: palette.muted, flex: 1 },
  brightSaveBtn: {
    backgroundColor: palette.plum,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: radius.pill,
  },
  brightSaveText: { color: "#FFF7EE", fontWeight: "700", fontSize: 12 },

  journalRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  journalIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "rgba(242,106,76,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  journalTitle: {
    fontFamily: fonts.sans,
    fontWeight: "700",
    color: palette.plum,
    fontSize: 15,
  },
  journalBody: { color: palette.plumSoft, fontSize: 13, marginTop: 2 },

  streakWrap: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 8,
  },
  streakText: { color: palette.plumSoft, fontWeight: "600" },
});
