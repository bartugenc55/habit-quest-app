// Supabase Edge Function: send-inactive-push
// Sends push notifications to users inactive for 5+ days.
//
// Deployment:
//   supabase functions deploy send-inactive-push --project-ref xffqvpvqzxlgnuqpleyr
//
// Set secret (one-time):
//   supabase secrets set EXPO_ACCESS_TOKEN=<your-expo-token>
//
// Test manually:
//   curl -X POST https://xffqvpvqzxlgnuqpleyr.supabase.co/functions/v1/send-inactive-push \
//     -H "Authorization: Bearer <SERVICE_ROLE_KEY>" \
//     -H "Content-Type: application/json"

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const INACTIVITY_DAYS = 5;
const DEDUP_DAYS = 5; // Don't re-send if we sent within this window
const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const TAG_INACTIVE = 'hq-inactive-push';

Deno.serve(async (req) => {
  try {
    // Verify this is a POST request
    if (req.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // 1. Find users inactive for 5+ days
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - INACTIVITY_DAYS);

    const { data: inactiveUsers, error: queryError } = await supabase
      .from('user_activity')
      .select('user_id, last_seen_at')
      .lt('last_seen_at', cutoff.toISOString());

    if (queryError) {
      console.error('Query error:', queryError.message);
      return new Response(JSON.stringify({ error: queryError.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!inactiveUsers || inactiveUsers.length === 0) {
      return new Response(JSON.stringify({ sent: 0, message: 'No inactive users' }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const userIds = inactiveUsers.map((u) => u.user_id);

    // 2. Dedup: exclude users we already sent to in the last DEDUP_DAYS days
    const dedupCutoff = new Date();
    dedupCutoff.setDate(dedupCutoff.getDate() - DEDUP_DAYS);

    const { data: recentlySent } = await supabase
      .from('notification_events')
      .select('user_id')
      .eq('event', 'sent')
      .eq('tag', TAG_INACTIVE)
      .gte('created_at', dedupCutoff.toISOString())
      .in('user_id', userIds);

    const recentlySentIds = new Set((recentlySent ?? []).map((r) => r.user_id));
    const eligibleUserIds = userIds.filter((id) => !recentlySentIds.has(id));

    if (eligibleUserIds.length === 0) {
      return new Response(JSON.stringify({ sent: 0, message: 'All inactive users already notified' }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 3. Get push tokens for eligible users
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, expo_push_token')
      .in('id', eligibleUserIds)
      .not('expo_push_token', 'is', null);

    if (!profiles || profiles.length === 0) {
      return new Response(JSON.stringify({ sent: 0, message: 'No push tokens found' }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 4. Send push notifications via Expo Push API
    const messages = profiles
      .filter((p) => p.expo_push_token)
      .map((p) => ({
        to: p.expo_push_token,
        title: 'Habit Quest',
        body: 'Seni özledik! Alışkanlıklarını sürdürmeye devam et 💪',
        sound: 'default',
        data: { tag: TAG_INACTIVE },
        priority: 'high' as const,
      }));

    if (messages.length === 0) {
      return new Response(JSON.stringify({ sent: 0, message: 'No valid tokens' }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Expo supports batches of up to 100
    const BATCH_SIZE = 100;
    let totalSent = 0;

    for (let i = 0; i < messages.length; i += BATCH_SIZE) {
      const batch = messages.slice(i, i + BATCH_SIZE);

      const pushResponse = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(Deno.env.get('EXPO_ACCESS_TOKEN')
            ? { Authorization: `Bearer ${Deno.env.get('EXPO_ACCESS_TOKEN')}` }
            : {}),
        },
        body: JSON.stringify(batch),
      });

      if (pushResponse.ok) {
        totalSent += batch.length;
      } else {
        console.error('Expo push error:', await pushResponse.text());
      }
    }

    // 5. Log 'sent' events for dedup (service_role bypasses RLS)
    const sentEvents = profiles
      .filter((p) => p.expo_push_token)
      .map((p) => ({
        user_id: p.id,
        event: 'sent' as const,
        tag: TAG_INACTIVE,
      }));

    if (sentEvents.length > 0) {
      const { error: insertError } = await supabase
        .from('notification_events')
        .insert(sentEvents);

      if (insertError) {
        console.error('Failed to log sent events:', insertError.message);
      }
    }

    return new Response(
      JSON.stringify({
        sent: totalSent,
        eligible: eligibleUserIds.length,
        tokensFound: profiles.length,
      }),
      { headers: { 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('Edge Function error:', err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
