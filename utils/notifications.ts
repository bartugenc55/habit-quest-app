import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Habit } from './sampleData';

const NOTIF_ID_KEY = '@habitquest_daily_notif_id';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function requestNotificationPermissions(): Promise<boolean> {
  if (!Device.isDevice) {
    return false;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    return false;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('habits', {
      name: 'Alışkanlık Hatırlatmaları',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  return true;
}

// ── Global daily reminder (profile-level) ──

async function cancelStoredReminder(): Promise<void> {
  try {
    const storedId = await AsyncStorage.getItem(NOTIF_ID_KEY);
    if (storedId) {
      await Notifications.cancelScheduledNotificationAsync(storedId);
      await AsyncStorage.removeItem(NOTIF_ID_KEY);
    }
  } catch {
    // Eski ID artık geçerli olmayabilir, sessizce geç
  }
}

export async function scheduleDailyReminder(hour: number, minute: number): Promise<void> {
  await cancelStoredReminder();

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Habit Quest',
      body: 'Bugünkü görevlerini tamamlamaya hazır mısın? 🔥',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
      channelId: Platform.OS === 'android' ? 'habits' : undefined,
    },
  });

  await AsyncStorage.setItem(NOTIF_ID_KEY, id);
}

export async function cancelAllNotifications(): Promise<void> {
  await cancelStoredReminder();
}

// ── Per-habit reminders ──

export async function cancelHabitReminders(notificationIds?: string[]): Promise<void> {
  if (!notificationIds || notificationIds.length === 0) return;
  for (const id of notificationIds) {
    try {
      await Notifications.cancelScheduledNotificationAsync(id);
    } catch {
      // ID artık geçerli olmayabilir
    }
  }
}

export async function scheduleHabitReminders(habit: Habit): Promise<string[]> {
  // Cancel existing reminders for this habit
  await cancelHabitReminders(habit.notificationIds);

  if (!habit.reminderEnabled || !habit.reminderTime) return [];

  const ids: string[] = [];

  for (const day of habit.scheduleDays) {
    try {
      // expo-notifications weekday: 1=Sunday..7=Saturday
      // JS getDay(): 0=Sunday..6=Saturday
      const weekday = day + 1;

      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: `${habit.icon} ${habit.name}`,
          body: 'Bugunku aliskanligini tamamlamayi unutma! 🔥',
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
    } catch {
      // Scheduling failed for this day, skip
    }
  }

  return ids;
}

export async function scheduleAllHabitReminders(habits: Habit[]): Promise<Habit[]> {
  const updated: Habit[] = [];

  for (const habit of habits) {
    if (habit.isArchived || !habit.reminderEnabled || !habit.reminderTime) {
      updated.push(habit);
      continue;
    }

    const ids = await scheduleHabitReminders(habit);
    updated.push({ ...habit, notificationIds: ids });
  }

  return updated;
}

export async function cancelAllHabitReminders(habits: Habit[]): Promise<void> {
  for (const habit of habits) {
    await cancelHabitReminders(habit.notificationIds);
  }
}
