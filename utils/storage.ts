import AsyncStorage from '@react-native-async-storage/async-storage';
import { Habit, UserProfile, DailyLogs } from './sampleData';

const KEYS = {
  HABITS: '@habitquest_habits',
  PROFILE: '@habitquest_profile',
  LAST_RESET_DATE: '@habitquest_last_reset',
  DAILY_LOGS: '@habitquest_daily_logs',
  LAST_DAILY_CLAIM: '@habitquest_last_daily_claim',
  LAST_SHIELD_GRANT: '@habitquest_last_shield_grant',
};

export async function saveHabits(habits: Habit[]): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS.HABITS, JSON.stringify(habits));
  } catch (e) {
    console.error('saveHabits failed:', e);
  }
}

export async function loadHabits(): Promise<Habit[] | null> {
  try {
    const data = await AsyncStorage.getItem(KEYS.HABITS);
    return data ? JSON.parse(data) : null;
  } catch (e) {
    console.error('loadHabits failed:', e);
    return null;
  }
}

export async function saveProfile(profile: UserProfile): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS.PROFILE, JSON.stringify(profile));
  } catch (e) {
    console.error('saveProfile failed:', e);
  }
}

export async function loadProfile(): Promise<UserProfile | null> {
  try {
    const data = await AsyncStorage.getItem(KEYS.PROFILE);
    return data ? JSON.parse(data) : null;
  } catch (e) {
    console.error('loadProfile failed:', e);
    return null;
  }
}

export async function getLastResetDate(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(KEYS.LAST_RESET_DATE);
  } catch (e) {
    console.error('getLastResetDate failed:', e);
    return null;
  }
}

export async function setLastResetDate(date: string): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS.LAST_RESET_DATE, date);
  } catch (e) {
    console.error('setLastResetDate failed:', e);
  }
}

export async function saveDailyLogs(logs: DailyLogs): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS.DAILY_LOGS, JSON.stringify(logs));
  } catch (e) {
    console.error('saveDailyLogs failed:', e);
  }
}

export async function loadDailyLogs(): Promise<DailyLogs | null> {
  try {
    const data = await AsyncStorage.getItem(KEYS.DAILY_LOGS);
    return data ? JSON.parse(data) : null;
  } catch (e) {
    console.error('loadDailyLogs failed:', e);
    return null;
  }
}

export async function getLastDailyClaimDate(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(KEYS.LAST_DAILY_CLAIM);
  } catch (e) {
    console.error('getLastDailyClaimDate failed:', e);
    return null;
  }
}

export async function setLastDailyClaimDate(date: string): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS.LAST_DAILY_CLAIM, date);
  } catch (e) {
    console.error('setLastDailyClaimDate failed:', e);
  }
}

export async function getLastShieldGrantDate(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(KEYS.LAST_SHIELD_GRANT);
  } catch (e) {
    console.error('getLastShieldGrantDate failed:', e);
    return null;
  }
}

export async function setLastShieldGrantDate(date: string): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS.LAST_SHIELD_GRANT, date);
  } catch (e) {
    console.error('setLastShieldGrantDate failed:', e);
  }
}

export async function clearAllData(): Promise<void> {
  try {
    await AsyncStorage.multiRemove([KEYS.HABITS, KEYS.PROFILE, KEYS.LAST_RESET_DATE, KEYS.DAILY_LOGS, KEYS.LAST_DAILY_CLAIM, KEYS.LAST_SHIELD_GRANT]);
  } catch (e) {
    console.error('clearAllData failed:', e);
  }
}
