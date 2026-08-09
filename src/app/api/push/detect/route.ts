/* eslint-disable @typescript-eslint/no-explicit-any */
// Serverless-safe detector tick. Schedule it externally about every 2 seconds only
// after deployment can tolerate that polling rate. Protect with SCORPANION_PUSH_CRON_SECRET.
//
// Additional Supabase table:
// create table push_game_snapshots (
//   game_id text primary key,
//   snapshot jsonb not null,
//   updated_at timestamptz not null default now()
// );

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { compareSnapshotSets, normalizeLiveGameSnapshot, type LiveGameSnapshot } from '@/lib/scoreEvents'
import { sendScoreEventNotifications, type PushTarget, type SendResult } from '@/lib/pushSender'

export const dynamic = 'force-dynamic'

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key || url.includes('placeholder')) return null
  return createClient(url, key, { auth: { persistSession: false } })
}

function authorized(request: NextRequest) {
  const secret = process.env.SCORPANION_PUSH_CRON_SECRET
  if (!secret) return false
  return request.headers.get('authorization') === `Bearer ${secret}`
}

export async function POST(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ error: 'Unauthorized detector tick' }, { status: 401 })
  }
  const supabase = adminClient()
  if (!supabase) {
    return NextResponse.json(
      { error: 'Push detector backend is not configured. Missing Supabase service role config.', not_configured: true },
      { status: 503 },
    )
  }

  const origin = request.nextUrl.origin
  const scheduleRes = await fetch(`${origin}/api/schedule?_cb=${Date.now()}`, { cache: 'no-store' })
  if (!scheduleRes.ok) return NextResponse.json({ error: `Schedule fetch failed: HTTP ${scheduleRes.status}` }, { status: 502 })
  const schedule = await scheduleRes.json()
  const rawGames = Array.isArray(schedule) ? schedule : schedule.games ?? schedule.events ?? []
  const current = rawGames
    .map(normalizeLiveGameSnapshot)
    .filter((g: LiveGameSnapshot | null): g is LiveGameSnapshot => Boolean(g))

  const { data: previousRows, error: readError } = await supabase
    .from('push_game_snapshots')
    .select('game_id, snapshot')
  if (readError) {
    console.error('[push/detect] snapshot read error:', readError)
    return NextResponse.json({ error: 'Failed to read prior snapshots' }, { status: 500 })
  }
  const previous = (previousRows ?? []).map((row: any) => row.snapshot as LiveGameSnapshot)
  const events = compareSnapshotSets(previous, current)

  if (current.length) {
    const { error: writeError } = await supabase
      .from('push_game_snapshots')
      .upsert(current.map((snapshot: LiveGameSnapshot) => ({
        game_id: snapshot.gameId,
        snapshot,
        updated_at: new Date().toISOString(),
      })), { onConflict: 'game_id' })
    if (writeError) console.error('[push/detect] snapshot write error:', writeError)
  }

  let send: SendResult = { attempted: 0, sent: 0, disabled: true }
  if (events.length) {
    const { data: targets, error: targetError } = await supabase
      .from('push_subscriptions')
      .select('expo_push_token, native_device_push_token, followed_team_ids, event_types')
      .eq('enabled', true)
    if (targetError) {
      console.error('[push/detect] target read error:', targetError)
    } else {
      send = await sendScoreEventNotifications(events, (targets ?? []) as PushTarget[])
    }
  }

  return NextResponse.json({
    ok: true,
    currentSnapshots: current.length,
    events: events.map(({ previous: _previous, current: _current, ...event }) => event),
    sending: send,
  })
}
