import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Habit } from './sampleData';
import { getSupabase } from './supabase';
import { logNotificationEvent } from './notificationAnalytics';

// ── Notification tags for idempotent identification ──
const TAG_PREFIX = 'hq-';
const TAG_DAILY = 'hq-daily';
const habitTag = (habitId: string) => `hq-habit-${habitId}`;

// ── Sound configuration ──
// 'default' = iOS system default.
// Ozel ses icin: 'notification.wav' gibi bir dosya adi yaz ve
// app.json > expo-notifications plugin > sounds dizisine ekle.
const NOTIFICATION_SOUND: string = 'default';

// Legacy key (will be cleaned up on first run)
const LEGACY_DAILY_KEY = '@habitquest_daily_notif_id';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// ── Permission ──

export async function requestNotificationPermissions(): Promise<boolean> {
  if (!Device.isDevice) return false;

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync({
      ios: { allowAlert: true, allowSound: true, allowBadge: false },
    });
    finalStatus = status;
  }

  if (finalStatus !== 'granted') return false;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('habits', {
      name: 'Alışkanlık Hatırlatmaları',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      sound: 'default',
    });
  }

  return true;
}

// ── Internal helpers ──

/** Cancel all scheduled notifications whose data.tag starts with the given prefix. */
async function cancelByTagPrefix(prefix: string): Promise<void> {
  const all = await Notifications.getAllScheduledNotificationsAsync();
  for (const n of all) {
    const tag = (n.content.data as Record<string, unknown>)?.tag;
    if (typeof tag === 'string' && tag.startsWith(prefix)) {
      try {
        await Notifications.cancelScheduledNotificationAsync(n.identifier);
      } catch {
        // One cancel failing must not prevent canceling the rest
      }
    }
  }
}

/** Cancel all scheduled notifications whose data.tag exactly matches. */
async function cancelByTag(tag: string): Promise<void> {
  const all = await Notifications.getAllScheduledNotificationsAsync();
  for (const n of all) {
    if ((n.content.data as Record<string, unknown>)?.tag === tag) {
      try {
        await Notifications.cancelScheduledNotificationAsync(n.identifier);
      } catch {
        // One cancel failing must not prevent canceling the rest
      }
    }
  }
}

// ── Public API ──

/**
 * Cancel ALL reminders scheduled by our app (daily + per-habit).
 * Also cleans up legacy stored IDs. Idempotent.
 */
export async function cancelOurReminders(): Promise<void> {
  await cancelByTagPrefix(TAG_PREFIX);

  // Clean up legacy stored daily notification ID
  try {
    const legacyId = await AsyncStorage.getItem(LEGACY_DAILY_KEY);
    if (legacyId) {
      await Notifications.cancelScheduledNotificationAsync(legacyId).catch(() => {});
      await AsyncStorage.removeItem(LEGACY_DAILY_KEY);
    }
  } catch {
    // Ignore
  }
}

/**
 * Schedule the global daily reminder. Cancels any existing daily reminder first.
 * Idempotent: safe to call multiple times — always results in exactly one daily notification.
 */
export async function scheduleDailyReminder(hour: number, minute: number): Promise<void> {
  await cancelByTag(TAG_DAILY);

  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Habit Quest',
      body: 'Bugünkü görevlerini tamamlamaya hazır mısın? 🔥',
      sound: NOTIFICATION_SOUND,
      data: { tag: TAG_DAILY },
      // iOS 15+: Focus/DND modunda bile sesli bildirim goster
      interruptionLevel: 'timeSensitive',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
      channelId: Platform.OS === 'android' ? 'habits' : undefined,
    },
  });

  logNotificationEvent('scheduled', TAG_DAILY).catch(() => {});
}

/**
 * Cancel per-habit reminders for a specific habit (by tag).
 */
export async function cancelHabitReminders(habitId: string): Promise<void> {
  await cancelByTag(habitTag(habitId));
}

/**
 * Schedule per-habit weekly reminders. Cancels existing ones for this habit first.
 * Returns the scheduled notification IDs.
 */
export async function scheduleHabitReminders(habit: Habit): Promise<string[]> {
  await cancelByTag(habitTag(habit.id));

  if (!habit.reminderEnabled || !habit.reminderTime) return [];

  const ids: string[] = [];
  const tag = habitTag(habit.id);

  for (const day of habit.scheduleDays) {
    try {
      // expo-notifications weekday: 1=Sunday..7=Saturday
      // JS getDay(): 0=Sunday..6=Saturday
      const weekday = day + 1;

      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: `${habit.icon} ${habit.name}`,
          body: 'Bugunku aliskanligini tamamlamayi unutma! 🔥',
          sound: NOTIFICATION_SOUND,
          data: { tag },
          interruptionLevel: 'timeSensitive',
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
          weekday,
          hour: habit.reminderTime.hour,
          minute: habit.reminderTime.minute,
          channelId: Platform.OS === 'android' ? 'habits' : undefined,
        },
      });

      ids.push(id);
      logNotificationEvent('scheduled', tag).catch(() => {});
    } catch {
      // Scheduling failed for this day, skip
    }
  }

  return ids;
}

/**
 * Schedule reminders for all active habits. Returns updated habits with notificationIds.
 */
export async function scheduleAllHabitReminders(habits: Habit[]): Promise<Habit[]> {
  const updated: Habit[] = [];

  for (const habit of habits) {
    if (habit.isArchived || !habit.reminderEnabled || !habit.reminderTime) {
      updated.push({ ...habit, notificationIds: [] });
      continue;
    }

    const ids = await scheduleHabitReminders(habit);
    updated.push({ ...habit, notificationIds: ids });
  }

  return updated;
}

/**
 * Cancel all per-habit reminders.
 */
export async function cancelAllHabitReminders(habits: Habit[]): Promise<void> {
  for (const habit of habits) {
    await cancelByTag(habitTag(habit.id));
  }
}

// ── Scheduling mutex ──
// StrictMode veya concurrent cagrilarda ayni anda iki scheduling
// baslamasini engeller. Ikinci cagri birincinin sonucunu alir.
let _schedulingPromise: Promise<Habit[]> | null = null;

/**
 * Single entry point: ensure all reminders match current settings.
 * Cancels everything first, then schedules fresh. Fully idempotent.
 *
 * Concurrent calls are deduplicated — if already scheduling,
 * the second call returns the same promise (no duplicate work).
 */
export async function ensureRemindersScheduled(
  settings: { notificationsEnabled: boolean; notificationHour: number; notificationMinute: number },
  habits: Habit[],
): Promise<Habit[]> {
  // Deduplicate concurrent calls (StrictMode, double-mount, etc.)
  if (_schedulingPromise) return _schedulingPromise;

  _schedulingPromise = (async () => {
    try {
      // Wipe all our notifications for a clean slate
      await cancelOurReminders();

      if (!settings.notificationsEnabled) {
        return habits.map((h) => ({ ...h, notificationIds: [] }));
      }

      // Schedule daily reminder
      await scheduleDailyReminder(settings.notificationHour, settings.notificationMinute);

      // Schedule per-habit reminders
      return await scheduleAllHabitReminders(habits);
    } finally {
      _schedulingPromise = null;
    }
  })();

  return _schedulingPromise;
}

// ── Push token (remote notifications) ──

export async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (!Device.isDevice) {
    Alert.alert(
      'Fiziksel Cihaz Gerekli',
      'Push bildirimleri yalnizca fiziksel cihazlarda calisir. Simulatorde kullanilamaz.',
    );
    return null;
  }

  const granted = await requestNotificationPermissions();
  if (!granted) return null;

  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  const { data: token } = await Notifications.getExpoPushTokenAsync({
    ...(projectId ? { projectId } : {}),
  });

  return token;
}

export async function savePushTokenToSupabase(userId: string, token: string): Promise<boolean> {
  const { error } = await getSupabase()
    .from('profiles')
    .upsert(
      { id: userId, expo_push_token: token },
      { onConflict: 'id' },
    );

  if (error) {
    console.error('savePushToken error:', error.message);
    return false;
  }
  return true;
}
