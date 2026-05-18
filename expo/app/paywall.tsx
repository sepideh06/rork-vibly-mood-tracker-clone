import { useQuery } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { Bell, Check, Sparkles, Tag, X } from "lucide-react-native";
import React, { useState } from "react";
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import Purchases, { type PurchasesPackage } from "react-native-purchases";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import PressableScale from "@/components/PressableScale";
import SunsetBackground from "@/components/SunsetBackground";
import { fonts, palette, radius, spacing } from "@/constants/theme";
import { Plan, useVibly } from "@/providers/ViblyProvider";
import { getCurrentOffering, hasProAccess } from "@/utils/purchases";

export default function PaywallScreen() {
  const insets = useSafeAreaInsets();
  const { subscribe, isTrial, trialActive, trialExpired, trialDaysLeft } =
    useVibly();
  const [selected, setSelected] = useState<Plan>("yearly");
  const [busy, setBusy] = useState<boolean>(false);

  const offeringQuery = useQuery({
    queryKey: ["rc-offering"],
    queryFn: getCurrentOffering,
    staleTime: 1000 * 60 * 5,
  });
  const monthlyPackage: PurchasesPackage | null =
    offeringQuery.data?.monthly ?? null;
  const yearlyPackage: PurchasesPackage | null =
    offeringQuery.data?.annual ?? null;

  const onSubscribe = async () => {
    if (busy) return;
    try {
      setBusy(true);
      const pkg = selected === "yearly" ? yearlyPackage : monthlyPackage;
      if (pkg) {
        const result = await Purchases.purchasePackage(pkg);
        if (hasProAccess(result.customerInfo)) {
          subscribe(selected);
          router.back();
          return;
        }
      } else {
        // RC package unavailable — local subscribe (demo fallback).
        subscribe(selected);
        router.back();
        return;
      }
    } catch (e: unknown) {
      const err = e as { userCancelled?: boolean; message?: string };
      if (!err?.userCancelled) {
        console.warn("[Vibly] purchase failed", e);
        Alert.alert(
          "Purchase failed",
          err?.message ?? "Something went wrong. Please try again."
        );
      }
    } finally {
      setBusy(false);
    }
  };

  const onRestore = async () => {
    if (busy) return;
    try {
      setBusy(true);
      const info = await Purchases.restorePurchases();
      if (hasProAccess(info)) {
        subscribe("monthly");
        Alert.alert("Restored", "Your subscription is active again.");
        router.back();
      } else {
        Alert.alert(
          "Nothing to restore",
          "We couldn\u2019t find an active subscription on this account."
        );
      }
    } catch (e: unknown) {
      const err = e as { message?: string };
      console.warn("[Vibly] restore failed", e);
      Alert.alert(
        "Restore failed",
        err?.message ?? "Couldn\u2019t restore right now. Please try again."
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <SunsetBackground colors={["#E07A5A", "#9A2F35", "#3A1A28"]}>
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <View />
        {!trialExpired ? (
          <PressableScale
            onPress={() => router.back()}
            style={styles.closeBtn}
            haptic={false}
          >
            <X color="#FFF7EE" size={18} />
          </PressableScale>
        ) : (
          <View style={{ width: 36 }} />
        )}
      </View>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: insets.bottom + 220 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroIcon}>
          <Sparkles size={28} color="#FFF7EE" />
        </View>
        <Text style={styles.kicker}>
          {trialExpired
            ? "YOUR FREE TRIAL HAS ENDED \u2728"
            : trialActive
              ? `FREE TRIAL \u00B7 ${trialDaysLeft} DAY${trialDaysLeft === 1 ? "" : "S"} LEFT \uD83C\uDF1F`
              : "VIBLY \u00B7 SUBSCRIBE \uD83C\uDF05"}
        </Text>
        <Text style={styles.title}>
          {trialExpired ? (
            <>Keep the{"\n"}warmth going</>
          ) : (
            <>A warmer{"\n"}companion</>
          )}
        </Text>
        <Text style={styles.subtitle}>
          {trialExpired
            ? "Your 3-day trial is complete. Pick a plan to keep every Vibly feature glowing."
            : isTrial && trialActive
              ? `You\u2019re on a free 3-day trial \u2014 ${trialDaysLeft} day${trialDaysLeft === 1 ? "" : "s"} left. Subscribe anytime to continue afterwards.`
              : "Pick the plan that feels right \u2014 every feature stays unlocked."}
        </Text>

        <View style={styles.plans}>
          <PlanOption
            selected={selected === "yearly"}
            onPress={() => setSelected("yearly")}
            badge="BEST VALUE"
            title="Yearly"
            price="€45"
            cadence="per year"
            sub="Save ~35% vs monthly"
          />
          <PlanOption
            selected={selected === "monthly"}
            onPress={() => setSelected("monthly")}
            title="Monthly"
            price="€5"
            cadence="per month"
            sub="Cancel anytime"
          />
        </View>

        <View style={styles.perks}>
          <Perk
            icon={<Sparkles size={18} color={palette.coralDeep} />}
            title="Daily check-in & Simple Action"
            body="Emoji-led emotion, energy & focus, with an AI nudge for your next 10 minutes."
          />
          <Perk
            icon={<Bell size={18} color={palette.coralDeep} />}
            title="Streaks & gentle reminders"
            body="A daily streak and a soft, friendly nudge to check in."
          />
          <Perk
            icon={<Sparkles size={18} color={palette.coralDeep} />}
            title="Creative energy insight"
            body="A daily read on your creative rhythm, peak hours and pace \u2014 refreshed every day."
          />
          <Perk
            icon={<Tag size={18} color={palette.coralDeep} />}
            title="Mood tags & patterns"
            body="Tag Work, Sleep, People & more to see what shapes your mood."
          />
        </View>
      </ScrollView>

      <LinearGradient
        colors={["rgba(46,22,32,0)", "rgba(46,22,32,0.85)", "#2E1620"]}
        style={[styles.footer, { paddingBottom: insets.bottom + 18 }]}
      >
        <PressableScale onPress={onSubscribe} style={styles.cta} disabled={busy}>
          {busy ? (
            <ActivityIndicator color="#FFF7EE" />
          ) : (
            <Text style={styles.ctaText}>
              {selected === "yearly"
                ? "Subscribe \u00B7 \u20AC45 / year"
                : "Subscribe \u00B7 \u20AC5 / month"}
            </Text>
          )}
        </PressableScale>
        <PressableScale onPress={onRestore} haptic={false} style={styles.restoreBtn}>
          <Text style={styles.restoreText}>Restore purchases</Text>
        </PressableScale>
        <Text style={styles.legal}>
          {trialActive
            ? `No charge during your free trial \u2014 ${trialDaysLeft} day${trialDaysLeft === 1 ? "" : "s"} left.`
            : "Cancel anytime from your profile."}
        </Text>
      </LinearGradient>
    </SunsetBackground>
  );
}

function PlanOption({
  selected,
  onPress,
  title,
  price,
  cadence,
  sub,
  badge,
}: {
  selected: boolean;
  onPress: () => void;
  title: string;
  price: string;
  cadence: string;
  sub: string;
  badge?: string;
}) {
  return (
    <PressableScale onPress={onPress} haptic={false} style={{ flex: 1 }}>
      <View
        style={[styles.planCard, selected && styles.planCardSelected]}
      >
        {badge ? (
          <View style={styles.planBadge}>
            <Text style={styles.planBadgeText}>{badge}</Text>
          </View>
        ) : null}
        <Text style={styles.planTitle}>{title}</Text>
        <View style={styles.planPriceRow}>
          <Text style={styles.planPrice}>{price}</Text>
          <Text style={styles.planCadence}>{cadence}</Text>
        </View>
        <Text style={styles.planSub}>{sub}</Text>
        <View
          style={[
            styles.planRadio,
            selected && styles.planRadioSelected,
          ]}
        >
          {selected ? <Check size={12} color="#FFF7EE" /> : null}
        </View>
      </View>
    </PressableScale>
  );
}

function Perk({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <View style={styles.perk}>
      <View style={styles.perkIcon}>{icon}</View>
      <View style={{ flex: 1 }}>
        <Text style={styles.perkTitle}>{title}</Text>
        <Text style={styles.perkBody}>{body}</Text>
      </View>
      <Check size={18} color={palette.success} />
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,247,238,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  scroll: { paddingHorizontal: spacing.xl, paddingTop: spacing.xl },
  heroIcon: {
    width: 60,
    height: 60,
    borderRadius: 20,
    backgroundColor: palette.coralDeep,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#5A1F12",
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 16,
    elevation: 6,
  },
  kicker: {
    marginTop: spacing.lg,
    color: "#FFE4CC",
    fontSize: 11,
    letterSpacing: 2,
    fontWeight: "800",
  },
  title: {
    fontFamily: fonts.serif,
    fontSize: 44,
    color: "#FFF7EE",
    fontWeight: "700",
    letterSpacing: -2,
    lineHeight: 48,
    marginTop: 6,
  },
  subtitle: {
    color: "rgba(255,247,238,0.85)",
    fontSize: 15,
    lineHeight: 22,
    marginTop: spacing.md,
    maxWidth: 320,
  },

  plans: {
    flexDirection: "row",
    gap: 12,
    marginTop: spacing.xl,
  },
  planCard: {
    backgroundColor: "rgba(255,247,238,0.10)",
    borderRadius: radius.lg,
    padding: 14,
    borderWidth: 1.5,
    borderColor: "rgba(255,247,238,0.18)",
    minHeight: 130,
  },
  planCardSelected: {
    backgroundColor: "rgba(255,247,238,0.95)",
    borderColor: "#FFF7EE",
  },
  planBadge: {
    position: "absolute",
    top: -10,
    left: 12,
    backgroundColor: "#FFD27A",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  planBadgeText: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1,
    color: "#5A2E12",
  },
  planTitle: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.4,
    color: "#FFE4CC",
  },
  planPriceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
    marginTop: 6,
  },
  planPrice: {
    fontFamily: fonts.serif,
    fontSize: 30,
    fontWeight: "700",
    color: "#FFF7EE",
    letterSpacing: -1,
  },
  planCadence: {
    fontSize: 13,
    color: "rgba(255,247,238,0.75)",
  },
  planSub: {
    fontSize: 12,
    color: "rgba(255,247,238,0.8)",
    marginTop: 6,
    lineHeight: 17,
  },
  planRadio: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: "rgba(255,247,238,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  planRadioSelected: {
    backgroundColor: palette.coralDeep,
    borderColor: palette.coralDeep,
  },

  perks: {
    marginTop: spacing.xl,
    gap: 12,
    backgroundColor: "rgba(255,247,238,0.85)",
    borderRadius: radius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: palette.borderWarm,
  },
  perk: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 4,
  },
  perkIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(242,106,76,0.14)",
    alignItems: "center",
    justifyContent: "center",
  },
  perkTitle: { color: palette.plum, fontWeight: "700", fontSize: 15 },
  perkBody: { color: palette.plumSoft, fontSize: 13, marginTop: 2 },

  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    gap: 10,
    alignItems: "center",
  },
  cta: {
    width: "100%",
    paddingVertical: 16,
    borderRadius: radius.pill,
    backgroundColor: palette.coralDeep,
    alignItems: "center",
  },
  ctaText: {
    color: "#FFF7EE",
    fontWeight: "700",
    fontSize: 16,
    fontFamily: fonts.sans,
  },
  legal: { color: "rgba(255,247,238,0.7)", fontSize: 12, textAlign: "center" },
  restoreBtn: { paddingVertical: 6 },
  restoreText: {
    color: "#FFE4CC",
    fontSize: 13,
    fontWeight: "600",
    textDecorationLine: "underline",
  },
});
