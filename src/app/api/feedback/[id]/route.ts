import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const VALID_STATUSES = ['submitted', 'backlog', 'in_progress', 'live'] as const
type FeedbackStatus = (typeof VALID_STATUSES)[number]

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey || supabaseUrl.includes('placeholder')) {
    return NextResponse.json({ error: 'Not configured' }, { status: 503 })
  }

  // Verify the caller is authenticated
  const authHeader = request.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const token = authHeader.slice(7)

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const {
    data: { user },
    error: authError,
  } = await adminClient.auth.getUser(token)

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id } = await params
    const body = await request.json()
    const { status } = body as { status: FeedbackStatus }

    if (!VALID_STATUSES.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    const { data, error } = await adminClient
      .from('feedback_items')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json(data)
  } catch (err) {
    console.error('[feedback] PATCH error:', err)
    return NextResponse.json({ error: 'Failed to update status' }, { status: 500 })
  }
}
