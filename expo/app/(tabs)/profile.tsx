import { router } from "expo-router";
import {
  Bell,
  ChevronRight,
  Clock,
  Flame,
  Heart,
  Info,
  Sparkles,
  Volume2,
} from "lucide-react-native";
import React from "react";
import {
  Alert,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Card from "@/components/Card";
import PressableScale from "@/components/PressableScale";
import SunsetBackground from "@/components/SunsetBackground";
import { fonts, palette, radius, spacing } from "@/constants/theme";
import { PLAN_PRICES, useVibly } from "@/providers/ViblyProvider";

const TIME_PRESETS: { label: string; hour: number; minute: number }[] = [
  { label: "Morning", hour: 9, minute: 0 },
  { label: "Midday", hour: 13, minute: 0 },
  { label: "Evening", hour: 20, minute: 0 },
  { label: "Night", hour: 22, minute: 0 },
];

function formatTime(hour: number, minute: number): string {
  const h = hour.toString().padStart(2, "0");
  const m = minute.toString().padStart(2, "0");
  return `${h}:${m}`;
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const {
    state,
    streak,
    setReminders,
    setReminderSound,
    setReminderTime,
    cancelSubscription,
    isSubscribed,
    plan,
    trialActive,
    trialDaysLeft,
    trialExpired,
  } = useVibly();

  const statusLabel = isSubscribed
    ? plan === "yearly"
      ? "Subscribed \u00B7 Yearly"
      : "Subscribed \u00B7 Monthly"
    : trialActive
      ? `Free trial \u00B7 ${trialDaysLeft} day${trialDaysLeft === 1 ? "" : "s"} left`
      : "Trial ended";

  const statusSub = isSubscribed
    ? `Your plan: ${plan ? PLAN_PRICES[plan] : ""}. Thanks for keeping Vibly warm.`
    : trialActive
      ? "Every feature is unlocked during your 3-day trial."
      : "Pick a plan to keep using Vibly.";

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
        <Text style={styles.h1}>You</Text>
        <Text style={styles.h1Sub}>Your warm corner of Vibly</Text>

        <Card tint="cream">
          <View style={styles.streakRow}>
            <View style={styles.streakIcon}>
              <Flame size={22} color={palette.coralDeep} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.streakLabel}>CURRENT STREAK</Text>
              <Text style={styles.streakNumber}>
                {streak} day{streak === 1 ? "" : "s"}
              </Text>
              <Text style={styles.streakSub}>
                Every check-in keeps the warmth glowing.
              </Text>
            </View>
          </View>
        </Card>

        <Card>
          <View style={styles.row}>
            <View style={styles.rowIcon}>
              <Bell size={18} color={palette.coralDeep} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>Gentle reminders</Text>
              <Text style={styles.rowSub}>
                A soft daily nudge to check in — silent by default.
              </Text>
            </View>
            <Switch
              value={state.remindersEnabled}
              onValueChange={async (v) => {
                if (Platform.OS === "web") {
                  Alert.alert(
                    "Not available on web",
                    "Reminders work on the iOS and Android app."
                  );
                  return;
                }
                const ok = await setReminders(v);
                if (v && !ok) {
                  Alert.alert(
                    "Notifications are off",
                    "Allow notifications in Settings to receive your daily nudge.",
                    [
                      { text: "Not now", style: "cancel" },
                      { text: "Open Settings", onPress: () => Linking.openSettings() },
                    ]
                  );
                }
              }}
              trackColor={{
                false: "rgba(46,22,32,0.12)",
                true: palette.coralDeep,
              }}
              thumbColor="#FFF7EE"
            />
          </View>

          {state.remindersEnabled ? (
            <>
              <View style={[styles.row, styles.subRow]}>
                <View style={styles.rowIcon}>
                  <Clock size={18} color={palette.coralDeep} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>Reminder time</Text>
                  <Text style={styles.rowSub}>
                    When should the daily nudge arrive?
                  </Text>
                  <View style={styles.timeRow}>
                    {TIME_PRESETS.map((t) => {
                      const selected =
                        state.reminderHour === t.hour &&
                        state.reminderMinute === t.minute;
                      return (
                        <Pressable
                          key={t.label}
                          onPress={() => setReminderTime(t.hour, t.minute)}
                          style={[
                            styles.timeChip,
                            selected && styles.timeChipActive,
                          ]}
                          testID={`reminder-time-${t.label}`}
                        >
                          <Text
                            style={[
                              styles.timeChipText,
                              selected && styles.timeChipTextActive,
                            ]}
                          >
                            {t.label}
                          </Text>
                          <Text
                            style={[
                              styles.timeChipSub,
                              selected && styles.timeChipTextActive,
                            ]}
                          >
                            {formatTime(t.hour, t.minute)}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              </View>

              <View style={[styles.row, styles.subRow]}>
                <View style={styles.rowIcon}>
                  <Volume2 size={18} color={palette.coralDeep} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>Soft chime</Text>
                  <Text style={styles.rowSub}>
                    Play a gentle sound with the reminder. Off keeps it silent.
                  </Text>
                </View>
                <Switch
                  value={state.reminderSoundEnabled}
                  onValueChange={(v) => setReminderSound(v)}
                  trackColor={{
                    false: "rgba(46,22,32,0.12)",
                    true: palette.coralDeep,
                  }}
                  thumbColor="#FFF7EE"
                />
              </View>
            </>
          ) : null}
        </Card>

        {isSubscribed ? (
          <PressableScale onPress={() => cancelSubscription()}>
            <Card>
              <View style={styles.row}>
                <View style={styles.rowIcon}>
                  <Heart size={18} color={palette.coralDeep} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>{statusLabel}</Text>
                  <Text style={styles.rowSub}>{statusSub}</Text>
                  <Text style={[styles.rowSub, { marginTop: 4, color: palette.muted }]}>
                    Tap to cancel (demo).
                  </Text>
                </View>
              </View>
            </Card>
          </PressableScale>
        ) : (
          <PressableScale onPress={() => router.push("/paywall")}>
            <Card tint="soft">
              <View style={styles.proRow}>
                <View style={styles.proIcon}>
                  <Sparkles size={20} color="#FFF7EE" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.proTitle}>
                    {trialExpired ? "Subscribe to continue" : "Subscribe to Vibly"} ✨
                  </Text>
                  <Text style={styles.proSub}>{statusLabel}</Text>
                  <Text style={[styles.proSub, { marginTop: 2 }]}>
                    €5 / month · €45 / year
                  </Text>
                </View>
                <ChevronRight size={20} color={palette.plum} />
              </View>
            </Card>
          </PressableScale>
        )}

        <Card>
          <View style={styles.row}>
            <View style={styles.rowIcon}>
              <Info size={18} color={palette.coralDeep} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>About Vibly</Text>
              <Text style={styles.rowSub}>
                A small, warm space for daily check-ins, reflections and tiny
                actions that lift your day.
              </Text>
            </View>
          </View>
        </Card>
      </ScrollView>
    </SunsetBackground>
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

  streakRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  streakIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: "rgba(242,106,76,0.14)",
    alignItems: "center",
    justifyContent: "center",
  },
  streakLabel: {
    color: palette.muted,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.2,
  },
  streakNumber: {
    fontFamily: fonts.serif,
    fontSize: 28,
    color: palette.plum,
    fontWeight: "700",
    letterSpacing: -1,
    marginTop: 2,
  },
  streakSub: { color: palette.plumSoft, fontSize: 13, marginTop: 2 },

  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(242,106,76,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  subRow: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(46,22,32,0.10)",
  },
  rowTitle: { color: palette.plum, fontWeight: "700", fontSize: 15 },
  rowSub: { color: palette.plumSoft, fontSize: 13, marginTop: 2 },

  timeRow: { flexDirection: "row", gap: 8, marginTop: 10, flexWrap: "wrap" },
  timeChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: "rgba(46,22,32,0.06)",
    alignItems: "center",
    minWidth: 78,
  },
  timeChipActive: { backgroundColor: palette.coralDeep },
  timeChipText: { color: palette.plum, fontWeight: "700", fontSize: 13 },
  timeChipSub: { color: palette.plumSoft, fontSize: 11, marginTop: 1 },
  timeChipTextActive: { color: "#FFF7EE" },

  proRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  proIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: palette.coralDeep,
    alignItems: "center",
    justifyContent: "center",
  },
  proTitle: {
    fontFamily: fonts.serif,
    fontSize: 20,
    color: palette.plum,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  proSub: { color: palette.plumSoft, fontSize: 13, marginTop: 2 },
});
