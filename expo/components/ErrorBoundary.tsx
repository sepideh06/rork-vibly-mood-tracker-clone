import React, { Component } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { fonts, palette, radius, spacing } from "@/constants/theme";

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.warn("[Vibly] ErrorBoundary caught:", error.message, info.componentStack);
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <View style={styles.root}>
          <View style={styles.card}>
            <Text style={styles.emoji}>🌅</Text>
            <Text style={styles.title}>Something flickered</Text>
            <Text style={styles.body}>
              Vibly hit a small bump. Nothing is lost — your check-ins and journal
              are safe.
            </Text>
            <TouchableOpacity
              style={styles.button}
              onPress={this.handleReset}
              activeOpacity={0.8}
            >
              <Text style={styles.buttonText}>Try again</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#2E1620",
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
  },
  card: {
    backgroundColor: palette.cream,
    borderRadius: radius.xl,
    padding: spacing.xxl,
    alignItems: "center",
    gap: spacing.md,
    maxWidth: 320,
    width: "100%",
    borderWidth: 1,
    borderColor: palette.borderWarm,
  },
  emoji: {
    fontSize: 48,
    marginBottom: spacing.sm,
  },
  title: {
    fontFamily: fonts.serif,
    fontSize: 24,
    color: palette.plum,
    fontWeight: "700",
    letterSpacing: -0.5,
    textAlign: "center",
  },
  body: {
    fontFamily: fonts.sans,
    fontSize: 15,
    color: palette.plumSoft,
    textAlign: "center",
    lineHeight: 22,
  },
  button: {
    marginTop: spacing.md,
    backgroundColor: palette.coralDeep,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: radius.pill,
  },
  buttonText: {
    color: "#FFF7EE",
    fontWeight: "700",
    fontSize: 15,
    fontFamily: fonts.sans,
  },
});
