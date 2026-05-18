import * as Haptics from "expo-haptics";
import React, { useCallback, useRef, useState } from "react";
import {
  Animated,
  GestureResponderEvent,
  LayoutChangeEvent,
  Platform,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { fonts, palette, radius, scoreToColor } from "@/constants/theme";

type Props = {
  label: string;
  icon?: React.ReactNode;
  value: number; // 1..10
  onChange: (v: number) => void;
};

const STEPS = 10;

export default function MoodSlider({ label, icon, value, onChange }: Props) {
  const [width, setWidth] = useState<number>(0);
  const lastHaptic = useRef<number>(value);
  const widthRef = useRef<number>(0);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const ratio = (value - 1) / (STEPS - 1);

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    widthRef.current = e.nativeEvent.layout.width;
    setWidth(e.nativeEvent.layout.width);
  }, []);

  const updateFromLocationX = useCallback((x: number) => {
    const w = widthRef.current;
    if (w <= 0) return;
    const clamped = Math.max(0, Math.min(w, x));
    const r = clamped / w;
    const v = Math.round(1 + r * (STEPS - 1));
    if (v !== lastHaptic.current) {
      lastHaptic.current = v;
      if (Platform.OS !== "web") {
        Haptics.selectionAsync().catch(() => {});
      }
      onChangeRef.current(v);
    }
  }, []);

  // The View responder system works reliably with both touch and mouse
  // (including web pointer events) when we drive position from locationX.
  const handleGrant = useCallback(
    (e: GestureResponderEvent) => updateFromLocationX(e.nativeEvent.locationX),
    [updateFromLocationX]
  );
  const handleMove = useCallback(
    (e: GestureResponderEvent) => updateFromLocationX(e.nativeEvent.locationX),
    [updateFromLocationX]
  );

  const fillColor = scoreToColor(value);
  const thumbLeft = Math.max(0, ratio * width - 16);

  return (
    <View style={styles.wrap}>
      <View style={styles.headerRow}>
        <View style={styles.labelRow}>
          {icon}
          <Text style={styles.label}>{label}</Text>
        </View>
        <Animated.Text style={[styles.value, { color: fillColor }]}>
          {value}
        </Animated.Text>
      </View>
      <View
        style={styles.track}
        onLayout={onLayout}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderTerminationRequest={() => false}
        onResponderGrant={handleGrant}
        onResponderMove={handleMove}
      >
        <View
          style={[
            styles.fill,
            { width: `${ratio * 100}%`, backgroundColor: fillColor },
          ]}
        />
        <View style={[styles.thumb, { left: thumbLeft, borderColor: fillColor }]} />
        <View style={styles.ticksRow} pointerEvents="none">
          {Array.from({ length: STEPS }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.tick,
                i + 1 <= value ? { backgroundColor: "rgba(255,255,255,0.7)" } : null,
              ]}
            />
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 12 },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  labelRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  label: {
    fontSize: 16,
    color: palette.plumSoft,
    fontFamily: fonts.sans,
    fontWeight: "600",
  },
  value: {
    fontFamily: fonts.serif,
    fontSize: 28,
    fontWeight: "700",
    letterSpacing: -1,
  },
  track: {
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: "rgba(46, 22, 32, 0.06)",
    justifyContent: "center",
    overflow: "visible",
  },
  fill: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: radius.pill,
  },
  thumb: {
    position: "absolute",
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: palette.cream,
    borderWidth: 3,
    top: 6,
    shadowColor: "#5A1F12",
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 4,
  },
  ticksRow: {
    position: "absolute",
    left: 12,
    right: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  tick: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: "rgba(46,22,32,0.18)",
  },
});
