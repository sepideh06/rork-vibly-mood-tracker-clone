import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { Flame, Sparkles, Sun, X } from "lucide-react-native";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import MoodSlider from "@/components/MoodSlider";
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
import { useVibly } from "@/providers/ViblyProvider";
import {
  ALL_TAGS,
  EMOTION_OPTIONS,
  EmotionOption,
  MoodTag,
  emotionFromScore,
} from "@/types/vibly";
import { todayKey } from "@/utils/date";

export default function CheckInScreen() {
  const insets = useSafeAreaInsets();
  const { today, saveCheckIn, state, setTags, hasAccess } = useVibly();

  const initialEmotion = emotionFromScore(today?.emotion ?? 6);
  const [emotion, setEmotion] = useState<EmotionOption>(initialEmotion);
  const [energy, setEnergy] = useState<number>(today?.energy ?? 6);
  const [focus, setFocus] = useState<number>(today?.focus ?? 6);
  const [selectedTags, setSelectedTags] = useState<MoodTag[]>(
    state.tags[todayKey()] ?? []
  );
  const [celebrating, setCelebrating] = useState<boolean>(false);

  const burst = useRef(new Animated.Value(0)).current;

  const avg = (emotion.score + energy + focus) / 3;
  const overlayColor = scoreToColor(avg);

  useEffect(() => {
    if (!celebrating) return;
    burst.setValue(0);
    Animated.timing(burst, {
      toValue: 1,
      duration: 900,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      setTimeout(() => router.back(), 250);
    });
  }, [celebrating, burst]);

  const pickEmotion = (opt: EmotionOption) => {
    if (Platform.OS !== "web") {
      Haptics.selectionAsync().catch(() => {});
    }
    setEmotion(opt);
  };

  const toggleTag = (t: MoodTag) => {
    if (!hasAccess) {
      router.push("/paywall");
      return;
    }
    if (Platform.OS !== "web") {
      Haptics.selectionAsync().catch(() => {});
    }
    setSelectedTags((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]
    );
  };

  const onSave = () => {
    saveCheckIn({ emotion: emotion.score, energy, focus });
    if (hasAccess) {
      setTags(todayKey(), selectedTags);
    }
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
        () => {}
      );
    }
    setCelebrating(true);
  };

  const burstScale = burst.interpolate({
    inputRange: [0, 1],
    outputRange: [0.4, 6],
  });
  const burstOpacity = burst.interpolate({
    inputRange: [0, 0.4, 1],
    outputRange: [0.9, 0.4, 0],
  });

  return (
    <SunsetBackground>
      <View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFillObject,
          { backgroundColor: overlayColor, opacity: 0.18 },
        ]}
      />
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <PressableScale
          onPress={() => router.back()}
          style={styles.closeBtn}
          haptic={false}
        >
          <X color={palette.plum} size={18} />
        </PressableScale>
        <Text style={styles.topTitle}>Daily check-in</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.kicker}>How are you?</Text>
        <Text style={styles.title}>{moodLabel(avg)}</Text>
        <Text style={styles.sub}>
          Pick the emoji that feels closest — then tune energy and focus.
        </Text>

        <View style={styles.emotionCard}>
          <Text style={styles.emotionLabel}>Emotion</Text>
          <View style={styles.emotionRow}>
            {EMOTION_OPTIONS.map((opt) => {
              const active = opt.score === emotion.score;
              return (
                <PressableScale
                  key={opt.score}
                  onPress={() => pickEmotion(opt)}
                  haptic={false}
                  style={[styles.emojiBtn, active && styles.emojiBtnActive]}
                >
                  <Text style={styles.emoji}>{opt.emoji}</Text>
                </PressableScale>
              );
            })}
          </View>
          <Text
            style={[styles.emotionPicked, { color: scoreToColor(emotion.score) }]}
          >
            {emotion.label}
          </Text>
        </View>

        <View style={styles.slidersCard}>
          <MoodSlider
            label="Energy"
            icon={<Flame size={16} color={palette.amberDeep} />}
            value={energy}
            onChange={setEnergy}
          />
          <View style={styles.divider} />
          <MoodSlider
            label="Focus"
            icon={<Sun size={16} color={palette.coralDeep} />}
            value={focus}
            onChange={setFocus}
          />
        </View>

        <View style={styles.tagsHead}>
          <Text style={styles.tagsTitle}>What shaped today?</Text>
        </View>
        <Text style={styles.tagsSub}>
          Tap any that apply — we’ll learn what lifts you.
        </Text>
        <View style={styles.tagsWrap}>
          {ALL_TAGS.map((t) => {
            const active = selectedTags.includes(t);
            return (
              <PressableScale
                key={t}
                onPress={() => toggleTag(t)}
                haptic={false}
                style={[
                  styles.tagChip,
                  active && styles.tagChipActive,
                ]}
              >
                <Text
                  style={[
                    styles.tagText,
                    active && styles.tagTextActive,
                  ]}
                >
                  {t}
                </Text>
              </PressableScale>
            );
          })}
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <PressableScale onPress={onSave} style={styles.saveBtn}>
          <Sparkles size={18} color="#FFF7EE" />
          <Text style={styles.saveText}>Save my check-in</Text>
        </PressableScale>
      </View>

      {celebrating ? (
        <View pointerEvents="none" style={styles.burstWrap}>
          <Animated.View
            style={[
              styles.burst,
              {
                opacity: burstOpacity,
                transform: [{ scale: burstScale }],
                backgroundColor: overlayColor,
              },
            ]}
          />
        </View>
      ) : null}
    </SunsetBackground>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,247,238,0.85)",
    alignItems: "center",
    justifyContent: "center",
  },
  topTitle: { fontFamily: fonts.sans, fontWeight: "700", color: palette.plum },
  body: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xl,
  },
  kicker: {
    color: palette.plumSoft,
    fontSize: 13,
    letterSpacing: 1.5,
    fontWeight: "700",
  },
  title: {
    fontFamily: fonts.serif,
    fontSize: 48,
    color: palette.plum,
    fontWeight: "700",
    letterSpacing: -2,
    marginTop: 4,
  },
  sub: { color: palette.plumSoft, fontSize: 14, marginTop: 6, maxWidth: 300 },

  emotionCard: {
    marginTop: spacing.xxl,
    backgroundColor: palette.cream,
    borderRadius: radius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: palette.borderWarm,
    shadowColor: "#5A1F12",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 18,
    elevation: 6,
  },
  emotionLabel: {
    fontSize: 16,
    color: palette.plumSoft,
    fontFamily: fonts.sans,
    fontWeight: "600",
    marginBottom: 10,
  },
  emotionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  emojiBtn: {
    width: 46,
    height: 54,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(46,22,32,0.04)",
    borderWidth: 2,
    borderColor: "transparent",
  },
  emojiBtnActive: {
    backgroundColor: "rgba(242,106,76,0.16)",
    borderColor: palette.coralDeep,
    transform: [{ scale: 1.06 }],
  },
  emoji: { fontSize: 28 },
  emotionPicked: {
    marginTop: 10,
    textAlign: "center",
    fontFamily: fonts.serif,
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: -0.5,
  },

  slidersCard: {
    marginTop: spacing.lg,
    backgroundColor: palette.cream,
    borderRadius: radius.xl,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: palette.borderWarm,
    gap: spacing.lg,
    shadowColor: "#5A1F12",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 18,
    elevation: 6,
  },
  divider: { height: 1, backgroundColor: "rgba(46,22,32,0.06)" },

  tagsHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: spacing.xl,
  },
  tagsTitle: {
    fontFamily: fonts.serif,
    fontSize: 20,
    fontWeight: "700",
    color: palette.plum,
    letterSpacing: -0.5,
  },
  tagsSub: {
    color: palette.plumSoft,
    fontSize: 13,
    marginTop: 4,
    marginBottom: spacing.md,
  },
  tagsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tagChip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: radius.pill,
    backgroundColor: "rgba(255,247,238,0.85)",
    borderWidth: 1,
    borderColor: palette.borderWarm,
  },
  tagChipActive: {
    backgroundColor: palette.coralDeep,
    borderColor: palette.coralDeep,
  },
  tagText: {
    color: palette.plum,
    fontWeight: "700",
    fontSize: 13,
  },
  tagTextActive: { color: "#FFF7EE" },

  proPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "rgba(242,106,76,0.14)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  proPillText: {
    fontSize: 10,
    color: palette.coralDeep,
    fontWeight: "700",
    letterSpacing: 1,
  },

  footer: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
    borderRadius: radius.pill,
    backgroundColor: palette.plum,
  },
  saveText: {
    color: "#FFF7EE",
    fontWeight: "700",
    fontSize: 16,
    fontFamily: fonts.sans,
  },

  burstWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  burst: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
});
