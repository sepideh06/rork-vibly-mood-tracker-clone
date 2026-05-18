import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useMemo, useRef } from "react";
import {
  Animated,
  Easing,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from "react-native";

import { sunsetGradient } from "@/constants/theme";

type Props = {
  intensity?: number; // 0..1
  children?: React.ReactNode;
  style?: ViewStyle;
  colors?: readonly [string, string, ...string[]];
  showEmojis?: boolean;
};

const EMOJI_SET = [
  "✨",
  "🌅",
  "🌙",
  "🌸",
  "🍃",
  "💗",
  "☁️",
  "🔥",
  "🌿",
  "⭐️",
  "🫧",
  "🌻",
];

type Floater = {
  emoji: string;
  top: string;
  left: string;
  size: number;
  drift: number;
  duration: number;
  delay: number;
  rotate: number;
  opacity: number;
};

function buildFloaters(): Floater[] {
  const positions: Array<[string, string]> = [
    ["8%", "10%"],
    ["14%", "78%"],
    ["28%", "42%"],
    ["38%", "8%"],
    ["46%", "82%"],
    ["58%", "30%"],
    ["66%", "70%"],
    ["74%", "12%"],
    ["82%", "48%"],
    ["90%", "82%"],
    ["20%", "60%"],
    ["54%", "55%"],
  ];
  return positions.map(([top, left], i) => ({
    emoji: EMOJI_SET[i % EMOJI_SET.length],
    top,
    left,
    size: 18 + ((i * 7) % 14),
    drift: 8 + ((i * 5) % 14),
    duration: 5200 + ((i * 1300) % 4200),
    delay: (i * 380) % 2200,
    rotate: ((i * 23) % 30) - 15,
    opacity: 0.55 + ((i % 4) * 0.08),
  }));
}

export default function SunsetBackground({
  children,
  style,
  colors,
  intensity = 1,
  showEmojis = true,
}: Props) {
  const orb1 = useRef(new Animated.Value(0)).current;
  const orb2 = useRef(new Animated.Value(0)).current;
  const orb3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = (val: Animated.Value, duration: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(val, {
            toValue: 1,
            duration,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(val, {
            toValue: 0,
            duration,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ])
      ).start();

    loop(orb1, 8000);
    loop(orb2, 11000);
    loop(orb3, 14000);
  }, [orb1, orb2, orb3]);

  const translate = (v: Animated.Value, range: number) =>
    v.interpolate({ inputRange: [0, 1], outputRange: [-range, range] });

  const floaters = useMemo<Floater[]>(
    () => (showEmojis ? buildFloaters() : []),
    [showEmojis]
  );

  return (
    <View style={[styles.root, style]}>
      <LinearGradient
        colors={colors ?? sunsetGradient}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <Animated.View
        pointerEvents="none"
        style={[
          styles.orb,
          {
            top: -40,
            left: -60,
            backgroundColor: "rgba(255, 200, 160, 0.35)",
            opacity: 0.5 * intensity,
            transform: [
              { translateX: translate(orb1, 30) },
              { translateY: translate(orb2, 20) },
            ],
          },
        ]}
      />
      <Animated.View
        pointerEvents="none"
        style={[
          styles.orb,
          {
            top: 120,
            right: -80,
            width: 260,
            height: 260,
            backgroundColor: "rgba(220, 90, 60, 0.4)",
            opacity: 0.5 * intensity,
            transform: [
              { translateX: translate(orb2, 40) },
              { translateY: translate(orb3, 30) },
            ],
          },
        ]}
      />
      <Animated.View
        pointerEvents="none"
        style={[
          styles.orb,
          {
            bottom: -100,
            left: 40,
            width: 320,
            height: 320,
            backgroundColor: "rgba(90, 25, 50, 0.45)",
            opacity: 0.55 * intensity,
            transform: [
              { translateX: translate(orb3, 30) },
              { translateY: translate(orb1, 25) },
            ],
          },
        ]}
      />

      {floaters.map((f, i) => (
        <FloatingEmoji key={`${f.emoji}-${i}`} {...f} />
      ))}

      {children}
    </View>
  );
}

function FloatingEmoji(f: Floater) {
  const v = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(v, {
          toValue: 1,
          duration: f.duration,
          delay: f.delay,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(v, {
          toValue: 0,
          duration: f.duration,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [v, f.duration, f.delay]);

  const translateY = v.interpolate({
    inputRange: [0, 1],
    outputRange: [-f.drift, f.drift],
  });
  const translateX = v.interpolate({
    inputRange: [0, 1],
    outputRange: [-f.drift / 2, f.drift / 2],
  });
  const opacity = v.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [f.opacity * 0.6, f.opacity, f.opacity * 0.7],
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.floater,
        {
          top: f.top as unknown as number,
          left: f.left as unknown as number,
          opacity,
          transform: [
            { translateX },
            { translateY },
            { rotate: `${f.rotate}deg` },
          ],
        },
      ]}
    >
      <Text style={{ fontSize: f.size }}>{f.emoji}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, overflow: "hidden" },
  orb: {
    position: "absolute",
    width: 220,
    height: 220,
    borderRadius: 999,
  },
  floater: {
    position: "absolute",
  },
});
