import { Platform } from "react-native";
import * as Notifications from "expo-notifications";

const REMINDER_ID = "vibly-daily-reminder";

const FRIENDLY_BODIES: string[] = [
  "A tiny check-in keeps the warmth glowing.",
  "How is your weather inside today?",
  "One small breath, one small word. That's enough.",
  "Vibly is here whenever you're ready.",
];

/** Configure how notifications appear when the app is in the foreground. */
export function configureNotificationHandler(): void {
  if (Platform.OS === "web") return;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

async function ensureAndroidChannel(withSound: boolean): Promise<void> {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync("vibly-reminders", {
    name: "Gentle reminders",
    importance: Notifications.AndroidImportance.DEFAULT,
    sound: withSound ? "default" : null,
    vibrationPattern: [0, 120, 80, 120],
    lightColor: "#F26A4C",
  });
}

/** Asks for notification permission. Returns true if granted. */
export async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  try {
    const settings = await Notifications.getPermissionsAsync();
    if (settings.granted) return true;
    if (
      settings.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL
    ) {
      return true;
    }
    const req = await Notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowBadge: false,
        allowSound: true,
      },
    });
    return req.granted || req.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
  } catch (e) {
    console.warn("[Vibly] notification permission error", e);
    return false;
  }
}

/** Cancel any existing scheduled Vibly reminder. */
export async function cancelDailyReminder(): Promise<void> {
  if (Platform.OS === "web") return;
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    await Promise.all(
      scheduled
        .filter((s) => s.identifier === REMINDER_ID || s.content?.data?.kind === "vibly-reminder")
        .map((s) => Notifications.cancelScheduledNotificationAsync(s.identifier))
    );
  } catch (e) {
    console.warn("[Vibly] cancel reminder failed", e);
  }
}

/** Schedules (or reschedules) the daily reminder at the given local time. */
export async function scheduleDailyReminder(
  hour: number,
  minute: number,
  withSound: boolean
): Promise<boolean> {
  if (Platform.OS === "web") return false;
  try {
    await cancelDailyReminder();
    await ensureAndroidChannel(withSound);
    const body =
      FRIENDLY_BODIES[Math.floor(Math.random() * FRIENDLY_BODIES.length)];
    await Notifications.scheduleNotificationAsync({
      identifier: REMINDER_ID,
      content: {
        title: "A gentle moment for you",
        body,
        sound: withSound ? "default" : undefined,
        data: { kind: "vibly-reminder" },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
        channelId: Platform.OS === "android" ? "vibly-reminders" : undefined,
      },
    });
    return true;
  } catch (e) {
    console.warn("[Vibly] schedule reminder failed", e);
    return false;
  }
}
