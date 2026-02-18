import { getSupabase } from './supabase';

// ── Module-level userId so scheduling code doesn't need to pass it ──
let _userId: string | null = null;

/**
 * Set the current user ID for analytics logging.
 * Call once when user logs in; pass null on logout.
 */
export function setAnalyticsUserId(userId: string | null): void {
  _userId = userId;
}

/**
 * Log a notification lifecycle event to Supabase.
 *
 * Events:
 *   - 'scheduled': a local notification was scheduled
 *   - 'opened':    user tapped a notification
 *   - 'sent':      server sent a push (logged by Edge Function)
 *
 * Silent failures: analytics must never crash the app.
 */
export async function logNotificationEvent(
  event: 'scheduled' | 'opened' | 'sent',
  tag: string,
  userId?: string,
): Promise<void> {
  const uid = userId ?? _userId;
  if (!uid) return;

  try {
    await getSupabase()
      .from('notification_events')
      .insert({ user_id: uid, event, tag });
  } catch {
    // Analytics failure must never affect UX
  }
}
