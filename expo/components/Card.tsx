import React from "react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";

import { palette, radius, shadow } from "@/constants/theme";

type Props = {
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
  tint?: "cream" | "soft" | "white";
};

export default function Card({ style, children, tint = "cream" }: Props) {
  const bg =
    tint === "white"
      ? palette.white
      : tint === "soft"
        ? palette.creamSoft
        : palette.cream;
  return (
    <View
      style={[
        styles.card,
        shadow.card,
        { backgroundColor: bg },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    padding: 18,
    borderWidth: 1,
    borderColor: palette.borderWarm,
  },
});
