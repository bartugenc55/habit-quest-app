import { getSupabase } from './supabase';
import { Habit, UserProfile, DailyLogs } from './sampleData';

export interface CloudPayload {
  habits: Habit[];
  profile: UserProfile;
  dailyLogs: DailyLogs;
  lastResetDate: string | null;
  lastDailyClaim: string | null;
}

/**
 * Fetch user_data row for the given user.
 * Returns the payload, or null if no row exists yet.
 */
export async function fetchUserData(userId: string): Promise<CloudPayload | null> {
  console.log("FETCH USER ID:", userId);
  const { data, error } = await getSupabase()
    .from('user_data')
    .select('payload')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('fetchUserData error:', error.message);
    return null;
  }

  return data?.payload ?? null;
}

/**
 * Upsert user_data row (insert or update).
 * Uses the RLS policy so only the owning user can write.
 */
export async function upsertUserData(userId: string, payload: CloudPayload): Promise<boolean> {
  const { error } = await getSupabase()
    .from('user_data')
    .upsert(
      { user_id: userId, payload, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' },
    );

  if (error) {
    console.error('upsertUserData error:', error.message);
    return false;
  }
  return true;
}

/**
 * Merge cloud data with local data.
 * Strategy: if cloud has data, prefer cloud. If cloud is empty, keep local.
 */
export function mergeData(
  local: CloudPayload,
  cloud: CloudPayload | null,
): CloudPayload {
  // No cloud data → local wins entirely
  if (!cloud) return local;

  // Cloud exists → prefer cloud, but merge daily logs (union of dates)
  const mergedLogs: DailyLogs = { ...local.dailyLogs };
  for (const [date, entries] of Object.entries(cloud.dailyLogs)) {
    if (!mergedLogs[date]) {
      mergedLogs[date] = entries;
    }
    // If both have the same date, cloud wins
    else {
      mergedLogs[date] = { ...mergedLogs[date], ...entries };
    }
  }

  return {
    habits: cloud.habits,
    profile: cloud.profile,
    dailyLogs: mergedLogs,
    lastResetDate: cloud.lastResetDate ?? local.lastResetDate,
    lastDailyClaim: cloud.lastDailyClaim ?? local.lastDailyClaim,
  };
}
