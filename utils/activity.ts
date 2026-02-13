import { AppState, AppStateStatus } from 'react-native';
import { useEffect } from 'react';
import { supabase } from './supabase';

// ── Debounce: at most one upsert per 60 seconds ──
const MIN_INTERVAL_MS = 60_000;
let _lastReportedAt = 0;

/**
 * Upsert the user's last_seen_at timestamp in Supabase.
 * Debounced to avoid spamming the DB on rapid foreground toggles.
 */
export async function reportUserActive(userId: string): Promise<void> {
  const now = Date.now();
  if (now - _lastReportedAt < MIN_INTERVAL_MS) return;
  _lastReportedAt = now;

  try {
    const ts = new Date().toISOString();
    await supabase.from('user_activity').upsert(
      { user_id: userId, last_seen_at: ts, updated_at: ts },
      { onConflict: 'user_id' },
    );
  } catch {
    // Network error — silently ignore, will retry on next foreground
  }
}

/**
 * React hook: reports activity on mount and every time the app
 * returns to foreground. Safe to call with undefined userId (no-op).
 */
export function useActivityTracker(userId: string | undefined): void {
  useEffect(() => {
    if (!userId) return;

    // Report immediately on mount / login
    reportUserActive(userId);

    const handleChange = (state: AppStateStatus) => {
      if (state === 'active') reportUserActive(userId);
    };

    const sub = AppState.addEventListener('change', handleChange);
    return () => sub.remove();
  }, [userId]);
}
