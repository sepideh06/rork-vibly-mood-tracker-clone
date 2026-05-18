import { Platform } from "react-native";
import Purchases, {
  type CustomerInfo,
  type PurchasesOffering,
} from "react-native-purchases";

/** Entitlement identifier configured in RevenueCat. */
export const PRO_ENTITLEMENT = "pro";

function getRCToken(): string | undefined {
  if (__DEV__ || Platform.OS === "web") {
    return process.env.EXPO_PUBLIC_REVENUECAT_TEST_API_KEY;
  }
  return Platform.select({
    ios: process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY,
    android: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY,
    default: process.env.EXPO_PUBLIC_REVENUECAT_TEST_API_KEY,
  });
}

let configured = false;

/** Configure RevenueCat once at the top of the app. Safe to call multiple times. */
export function configurePurchases(): void {
  if (configured) return;
  const apiKey = getRCToken();
  if (!apiKey) {
    console.warn("[Vibly] RevenueCat API key missing for this platform");
    return;
  }
  try {
    Purchases.configure({ apiKey });
    configured = true;
  } catch (e) {
    console.warn("[Vibly] RevenueCat configure failed", e);
  }
}

/** Returns true if the user currently has the Vibly Pro entitlement. */
export function hasProAccess(info: CustomerInfo | null | undefined): boolean {
  if (!info) return false;
  const ent = info.entitlements.active[PRO_ENTITLEMENT];
  return ent != null;
}

export async function getCurrentOffering(): Promise<PurchasesOffering | null> {
  const offerings = await Purchases.getOfferings();
  return offerings.current ?? null;
}

configurePurchases();
