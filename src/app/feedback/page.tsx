'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'

type FeedbackStatus = 'submitted' | 'backlog' | 'in_progress' | 'live'

interface FeedbackItem {
  id: string
  title: string
  description?: string | null
  name?: string | null
  status: FeedbackStatus
  created_at: string
}

const COLUMNS: { id: FeedbackStatus; label: string; color: string; bg: string }[] = [
  { id: 'submitted',   label: 'Submitted',   color: '#71717a', bg: 'rgba(113,113,122,0.12)' },
  { id: 'backlog',     label: 'Backlog',      color: '#3b82f6', bg: 'rgba(0,48,135,0.18)'   },
  { id: 'in_progress', label: 'In Progress',  color: '#D95C17', bg: 'rgba(217,92,23,0.12)'  },
  { id: 'live',        label: 'Live',         color: '#22c55e', bg: 'rgba(34,197,94,0.1)'   },
]

const STATUS_OPTIONS: { value: FeedbackStatus; label: string }[] = [
  { value: 'submitted',   label: 'Submitted'   },
  { value: 'backlog',     label: 'Backlog'      },
  { value: 'in_progress', label: 'In Progress'  },
  { value: 'live',        label: 'Live'         },
]

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  } catch {
    return ''
  }
}

export default function FeedbackPage() {
  const [items, setItems] = useState<FeedbackItem[]>([])
  const [notConfigured, setNotConfigured] = useState(false)
  const [user, setUser] = useState<{ email?: string } | null>(null)

  // Form
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [name, setName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [justSubmitted, setJustSubmitted] = useState(false)

  // Auth check
  useEffect(() => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    if (!supabaseUrl || supabaseUrl.includes('placeholder') || !supabaseUrl.startsWith('http')) return
    import('@/lib/supabase').then(({ createClient }) => {
      const supabase = createClient()
      supabase.auth.getUser().then(({ data }) => {
        setUser(data.user ? { email: data.user.email } : null)
      })
    })
  }, [])

  const fetchItems = useCallback(async () => {
    try {
      const res = await fetch('/api/feedback')
      if (!res.ok) return
      const data = await res.json()
      if (Array.isArray(data)) setItems(data)
    } catch {
      // silently ignore
    }
  }, [])

  useEffect(() => {
    fetchItems()
    const iv = setInterval(fetchItems, 30_000)
    return () => clearInterval(iv)
  }, [fetchItems])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (notConfigured) return
    setSubmitting(true)
    setSubmitError(null)
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), description: description.trim(), name: name.trim() }),
      })
      const data = await res.json()
      if (!res.ok) {
        if (data.not_configured) setNotConfigured(true)
        setSubmitError(data.error ?? 'Failed to submit feedback')
        return
      }
      setJustSubmitted(true)
      setTitle('')
      setDescription('')
      setName('')
      setTimeout(() => setJustSubmitted(false), 4000)
      fetchItems()
    } catch {
      setSubmitError('Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleStatusChange(id: string, status: FeedbackStatus) {
    // Optimistic update
    setItems(prev => prev.map(item => item.id === id ? { ...item, status } : item))
    try {
      const { createClient } = await import('@/lib/supabase')
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      const res = await fetch(`/api/feedback/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) fetchItems() // revert on failure
    } catch {
      fetchItems()
    }
  }

  const inputBase: React.CSSProperties = {
    width: '100%',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 10,
    color: 'white',
    fontSize: 15,
    outline: 'none',
    padding: '12px 16px',
    fontFamily: 'var(--font-inter), Inter, system-ui, sans-serif',
  }

  function onFocus(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) {
    e.currentTarget.style.borderColor = '#00d4ff'
    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(0,212,255,0.12)'
  }
  function onBlur(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) {
    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'
    e.currentTarget.style.boxShadow = 'none'
  }

  return (
    <div style={{ minHeight: '100dvh', background: '#0c1b31', color: 'white' }}>

      {/* ── Header ── */}
      <div
        className="sticky top-0 z-20 flex items-center gap-3 px-4 py-3"
        style={{ background: 'rgba(12,27,49,0.95)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        <Link
          href="/home"
          className="flex items-center justify-center w-8 h-8 rounded-full transition-colors"
          style={{ color: '#a1a1aa', background: 'rgba(255,255,255,0.05)' }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 3L5 8L10 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
        <div style={{ overflow: 'hidden', height: 44, display: 'flex', alignItems: 'center' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/scorpanion-logo-new.png"
            alt="Scorpanion"
            style={{ height: 62, width: 'auto', objectFit: 'contain' }}
            onError={(e) => { (e.target as HTMLImageElement).src = '/scorpanion-full.png' }}
          />
        </div>
        <span
          className="font-display uppercase tracking-widest"
          style={{ fontSize: 13, fontWeight: 700, color: '#5F6773', marginLeft: 4 }}
        >
          Feedback
        </span>
      </div>

      <div className="px-4 py-6" style={{ maxWidth: 780, margin: '0 auto' }}>

        {/* ── Submit section ── */}
        <div
          className="mb-8 rounded-2xl p-5"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
        >
          <h2
            className="font-display uppercase tracking-widest mb-4"
            style={{ fontSize: 18, fontWeight: 700, color: '#F2E6CF' }}
          >
            Submit Feedback
          </h2>

          {justSubmitted && (
            <div
              className="mb-4 px-4 py-3 rounded-xl text-sm"
              style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)', color: '#86efac' }}
            >
              ✓ Thanks! Your feedback has been submitted.
            </div>
          )}

          {submitError && !notConfigured && (
            <div
              className="mb-4 px-4 py-3 rounded-xl text-sm"
              style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#f87171' }}
            >
              {submitError}
            </div>
          )}

          {notConfigured ? (
            <div
              className="px-4 py-3 rounded-xl text-sm"
              style={{ background: 'rgba(217,92,23,0.08)', border: '1px solid rgba(217,92,23,0.2)', color: '#D95C17' }}
            >
              Feedback tracking coming soon — we&apos;re setting things up.
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                required
                rows={4}
                placeholder="What would you like to see improved or added?"
                className="w-full resize-none placeholder-zinc-600"
                style={{ ...inputBase, padding: '12px 16px' }}
                onFocus={onFocus}
                onBlur={onBlur}
              />
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                required
                placeholder="Summary (short title)"
                className="placeholder-zinc-600"
                style={{ ...inputBase, height: 48 }}
                onFocus={onFocus}
                onBlur={onBlur}
              />
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Your name (optional)"
                className="placeholder-zinc-600"
                style={{ ...inputBase, height: 48 }}
                onFocus={onFocus}
                onBlur={onBlur}
              />
              <button
                type="submit"
                disabled={submitting}
                className="w-full font-display uppercase tracking-widest transition-opacity disabled:opacity-50"
                style={{
                  height: 48,
                  background: '#D95C17',
                  color: 'white',
                  borderRadius: 10,
                  fontSize: 14,
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                }}
              >
                {submitting ? 'Submitting…' : 'Submit Feedback'}
              </button>
            </form>
          )}
        </div>

        {/* ── Roadmap kanban ── */}
        <div className="mb-4">
          <h2
            className="font-display uppercase tracking-widest mb-4"
            style={{ fontSize: 18, fontWeight: 700, color: '#F2E6CF' }}
          >
            Public Roadmap
          </h2>
        </div>

        {/* Kanban grid — horizontal scroll on mobile */}
        <div
          className="flex gap-3 overflow-x-auto pb-6 no-scrollbar"
          style={{ alignItems: 'flex-start' }}
        >
          {COLUMNS.map(col => {
            const colItems = items.filter(i => i.status === col.id)
            return (
              <div
                key={col.id}
                className="flex-shrink-0 flex flex-col rounded-xl overflow-hidden"
                style={{ width: 220, minWidth: 220, background: col.bg, border: `1px solid ${col.color}33` }}
              >
                {/* Column header */}
                <div
                  className="flex items-center justify-between px-3 py-2"
                  style={{ borderBottom: `1px solid ${col.color}33` }}
                >
                  <span
                    className="font-display uppercase tracking-widest text-[12px] font-bold"
                    style={{ color: col.color }}
                  >
                    {col.label}
                  </span>
                  <span
                    className="rounded-full px-2 py-0.5 text-[11px] font-bold"
                    style={{ background: `${col.color}22`, color: col.color }}
                  >
                    {colItems.length}
                  </span>
                </div>

                {/* Cards */}
                <div className="flex flex-col gap-2 p-2">
                  {colItems.length === 0 && (
                    <div
                      className="text-center py-4 text-[12px]"
                      style={{ color: '#3f4b5a' }}
                    >
                      No items
                    </div>
                  )}
                  {colItems.map(item => (
                    <div
                      key={item.id}
                      className="rounded-lg p-3"
                      style={{ background: 'rgba(12,27,49,0.7)', border: '1px solid rgba(255,255,255,0.06)' }}
                    >
                      <p className="font-semibold text-[14px] leading-snug mb-1" style={{ color: '#F2E6CF' }}>
                        {item.title}
                      </p>
                      {item.description && (
                        <p className="text-[12px] leading-snug mb-2" style={{ color: '#71717a' }}>
                          {item.description}
                        </p>
                      )}
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[11px]" style={{ color: '#3f4b5a' }}>
                          {item.name ? `${item.name} · ` : ''}{formatDate(item.created_at)}
                        </span>
                      </div>

                      {/* Admin status changer — only visible when signed in */}
                      {user && (
                        <div className="mt-2">
                          <select
                            value={item.status}
                            onChange={e => handleStatusChange(item.id, e.target.value as FeedbackStatus)}
                            className="w-full text-[11px] rounded-md outline-none"
                            style={{
                              background: 'rgba(255,255,255,0.06)',
                              border: '1px solid rgba(255,255,255,0.1)',
                              color: '#a1a1aa',
                              padding: '3px 6px',
                              cursor: 'pointer',
                            }}
                          >
                            {STATUS_OPTIONS.map(opt => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>

      </div>
    </div>
  )
}
