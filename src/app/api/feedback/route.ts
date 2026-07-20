// ── Supabase schema ───────────────────────────────────────────────────────────
// Run this once in your Supabase SQL editor to enable feedback:
//
// create table feedback_items (
//   id uuid default gen_random_uuid() primary key,
//   title text not null,
//   description text,
//   name text,
//   status text not null default 'submitted',
//   created_at timestamptz default now(),
//   updated_at timestamptz default now()
// );
// alter table feedback_items enable row level security;
// create policy "Public read"   on feedback_items for select using (true);
// create policy "Public insert" on feedback_items for insert with check (true);
// ─────────────────────────────────────────────────────────────────────────────

import { NextResponse } from 'next/server'

function isConfigured() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  return Boolean(url && key && !url.includes('placeholder') && url.startsWith('http'))
}

export async function GET() {
  if (!isConfigured()) {
    return NextResponse.json([])
  }
  try {
    const { createServerSupabase } = await import('@/lib/supabase-server')
    const supabase = await createServerSupabase()
    const { data, error } = await supabase
      .from('feedback_items')
      .select('id, title, description, name, status, created_at')
      .order('created_at', { ascending: false })
    if (error) throw error
    return NextResponse.json(data ?? [])
  } catch (err) {
    console.error('[feedback] GET error:', err)
    return NextResponse.json([])
  }
}

export async function POST(request: Request) {
  if (!isConfigured()) {
    return NextResponse.json(
      { error: 'Feedback tracking coming soon', not_configured: true },
      { status: 503 }
    )
  }
  try {
    const body = await request.json()
    const { title, description, name } = body as {
      title?: string
      description?: string
      name?: string
    }
    if (!title?.trim()) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }
    const { createServerSupabase } = await import('@/lib/supabase-server')
    const supabase = await createServerSupabase()
    const { data, error } = await supabase
      .from('feedback_items')
      .insert({
        title: title.trim(),
        description: description?.trim() || null,
        name: name?.trim() || null,
        status: 'submitted',
      })
      .select()
      .single()
    if (error) throw error
    return NextResponse.json(data, { status: 201 })
  } catch (err) {
    console.error('[feedback] POST error:', err)
    return NextResponse.json({ error: 'Failed to submit feedback' }, { status: 500 })
  }
}
