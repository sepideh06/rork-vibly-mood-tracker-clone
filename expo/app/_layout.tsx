import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ViblyProvider, useVibly } from "@/providers/ViblyProvider";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false },
  },
});

function TrialGate() {
  const { hydrated, trialExpired, isSubscribed } = useVibly();
  useEffect(() => {
    if (!hydrated) return;
    if (trialExpired && !isSubscribed) {
      const t = setTimeout(() => {
        router.push("/paywall");
      }, 400);
      return () => clearTimeout(t);
    }
  }, [hydrated, trialExpired, isSubscribed]);
  return null;
}

function RootLayoutNav() {
  return (
    <Stack
      screenOptions={{
        headerBackTitle: "Back",
        contentStyle: { backgroundColor: "#2E1620" },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="check-in"
        options={{
          presentation: "modal",
          headerShown: false,
          animation: "slide_from_bottom",
        }}
      />
      <Stack.Screen
        name="paywall"
        options={{
          presentation: "modal",
          headerShown: false,
          animation: "slide_from_bottom",
        }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ViblyProvider>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <StatusBar style="light" />
          <ErrorBoundary>
            <TrialGate />
            <RootLayoutNav />
          </ErrorBoundary>
        </GestureHandlerRootView>
      </ViblyProvider>
    </QueryClientProvider>
  );
}
