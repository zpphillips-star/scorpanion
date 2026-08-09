/* eslint-disable @typescript-eslint/no-explicit-any */
// Supabase schema required before this route can persist registrations:
//
// create table push_subscriptions (
//   device_id text primary key,
//   platform text not null,
//   expo_push_token text,
//   native_device_push_token text,
//   followed_team_ids text[] not null default '{}',
//   event_types text[] not null default '{}',
//   app_version text,
//   build_number text,
//   enabled boolean not null default true,
//   updated_at timestamptz not null default now(),
//   created_at timestamptz not null default now()
// );
// alter table push_subscriptions enable row level security;
// Keep writes server-side only via SUPABASE_SERVICE_ROLE_KEY; do not expose service_role to clients.

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key || url.includes('placeholder')) return null
  return createClient(url, key, { auth: { persistSession: false } })
}

function cleanStringArray(value: unknown, max = 100) {
  if (!Array.isArray(value)) return []
  return Array.from(new Set(value.map(v => String(v).trim()).filter(Boolean))).slice(0, max)
}

export async function POST(request: Request) {
  const supabase = adminClient()
  if (!supabase) {
    return NextResponse.json(
      { error: 'Push registration backend is not configured. Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.', not_configured: true },
      { status: 503 },
    )
  }

  const body = await request.json().catch(() => null) as any
  const deviceId = String(body?.deviceId ?? '').trim()
  const expoPushToken = String(body?.expoPushToken ?? '').trim()
  const nativeDevicePushToken = String(body?.nativeDevicePushToken ?? '').trim()
  if (!deviceId || (!expoPushToken && !nativeDevicePushToken)) {
    return NextResponse.json({ error: 'deviceId and at least one push token are required' }, { status: 400 })
  }

  const row = {
    device_id: deviceId,
    platform: ['android', 'ios', 'web'].includes(body?.platform) ? body.platform : 'unknown',
    expo_push_token: expoPushToken || null,
    native_device_push_token: nativeDevicePushToken || null,
    followed_team_ids: cleanStringArray(body?.followedTeamIds),
    event_types: cleanStringArray(body?.eventTypes, 10),
    app_version: body?.appVersion ? String(body.appVersion) : null,
    build_number: body?.buildNumber ? String(body.buildNumber) : null,
    enabled: body?.enabled !== false,
    updated_at: new Date().toISOString(),
  }

  const { error } = await supabase
    .from('push_subscriptions')
    .upsert(row, { onConflict: 'device_id' })

  if (error) {
    console.error('[push/register] Supabase error:', error)
    return NextResponse.json({ error: 'Failed to persist push subscription' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
