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

const STAGES: {
  id: FeedbackStatus
  label: string
  shortLabel: string
  description: string
  color: string
  bg: string
}[] = [
  {
    id: 'submitted',
    label: 'Submitted',
    shortLabel: 'New',
    description: 'Just received — reviewing soon',
    color: '#71717a',
    bg: 'rgba(113,113,122,0.1)',
  },
  {
    id: 'backlog',
    label: 'Backlog',
    shortLabel: 'Queued',
    description: 'Accepted and queued for work',
    color: '#60a5fa',
    bg: 'rgba(96,165,250,0.08)',
  },
  {
    id: 'in_progress',
    label: 'In Progress',
    shortLabel: 'Building',
    description: 'Actively being built',
    color: '#D95C17',
    bg: 'rgba(217,92,23,0.1)',
  },
  {
    id: 'live',
    label: 'Live',
    shortLabel: 'Live',
    description: 'Shipped — available now',
    color: '#22c55e',
    bg: 'rgba(34,197,94,0.08)',
  },
]

const STATUS_OPTIONS: { value: FeedbackStatus; label: string }[] = [
  { value: 'submitted',   label: 'Submitted'   },
  { value: 'backlog',     label: 'Backlog'      },
  { value: 'in_progress', label: 'In Progress'  },
  { value: 'live',        label: 'Live'         },
]

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  } catch { return '' }
}

export default function FeedbackPage() {
  const [items, setItems] = useState<FeedbackItem[]>([])
  const [notConfigured, setNotConfigured] = useState(false)
  const [user, setUser] = useState<{ email?: string } | null>(null)
  const [activeStage, setActiveStage] = useState<FeedbackStatus>('submitted')
  const [showForm, setShowForm] = useState(false)

  // Form
  const [title, setTitle]             = useState('')
  const [description, setDescription] = useState('')
  const [name, setName]               = useState('')
  const [submitting, setSubmitting]   = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [justSubmitted, setJustSubmitted] = useState(false)

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
    } catch { /* silent */ }
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
      setTitle(''); setDescription(''); setName('')
      setShowForm(false)
      setActiveStage('submitted')
      setTimeout(() => setJustSubmitted(false), 5000)
      fetchItems()
    } catch {
      setSubmitError('Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleStatusChange(id: string, status: FeedbackStatus) {
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
      if (!res.ok) fetchItems()
    } catch { fetchItems() }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 10,
    color: 'white',
    fontSize: 15,
    outline: 'none',
    padding: '12px 16px',
  }
  function onFocus(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) {
    e.currentTarget.style.borderColor = '#00d4ff'
    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(0,212,255,0.1)'
  }
  function onBlur(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) {
    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'
    e.currentTarget.style.boxShadow = 'none'
  }

  const activeStageInfo = STAGES.find(s => s.id === activeStage)!
  const visibleItems = items.filter(i => i.status === activeStage)

  return (
    <div style={{ minHeight: '100dvh', background: '#0c1b31', color: 'white', paddingBottom: '5rem' }}>

      {/* ── Header ── */}
      <div
        className="sticky top-0 z-20 flex items-center gap-3 px-4 py-3"
        style={{ background: 'rgba(12,27,49,0.96)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        <Link
          href="/home"
          className="flex items-center justify-center w-8 h-8 rounded-full flex-shrink-0"
          style={{ color: '#a1a1aa', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 3L5 8L10 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </Link>
        <div style={{ overflow: 'hidden', height: 44, display: 'flex', alignItems: 'center', flex: 1 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/scorpanion-logo-new.png" alt="Scorpanion"
            style={{ height: 62, width: 'auto', objectFit: 'contain' }}
            onError={(e) => { (e.target as HTMLImageElement).src = '/scorpanion-full.png' }}
          />
        </div>
        {/* Submit button in header */}
        <button
          onClick={() => setShowForm(v => !v)}
          className="flex-shrink-0 font-display uppercase tracking-widest transition-opacity active:opacity-70"
          style={{
            height: 34, paddingLeft: 14, paddingRight: 14,
            background: showForm ? 'rgba(217,92,23,0.15)' : '#D95C17',
            color: showForm ? '#D95C17' : 'white',
            border: showForm ? '1px solid rgba(217,92,23,0.4)' : 'none',
            borderRadius: 8, fontSize: 12, fontWeight: 700,
          }}
        >
          {showForm ? 'Cancel' : '+ Suggest'}
        </button>
      </div>

      <div className="px-4 pt-5" style={{ maxWidth: 680, margin: '0 auto' }}>

        {/* ── Page intro ── */}
        <div className="mb-5">
          <h1 className="font-display text-[22px] font-800 uppercase tracking-tight text-white leading-tight">
            Roadmap
          </h1>
          <p className="text-[13px] mt-1" style={{ color: '#52637a' }}>
            See what we&apos;re working on and what&apos;s been shipped. Tap &ldquo;+ Suggest&rdquo; to request a feature.
          </p>
        </div>

        {/* ── Success toast ── */}
        {justSubmitted && (
          <div
            className="mb-4 px-4 py-3 rounded-xl text-[13px] flex items-center gap-2"
            style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', color: '#86efac' }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <circle cx="7" cy="7" r="6.5" stroke="#22c55e"/>
              <path d="M4 7l2 2 4-4" stroke="#22c55e" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Thanks! Your feedback was submitted and is under review.
          </div>
        )}

        {/* ── Submit form (collapsible) ── */}
        {showForm && (
          <div
            className="mb-6 rounded-2xl p-5"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <h2 className="font-display text-[15px] font-700 uppercase tracking-widest mb-4" style={{ color: '#F2E6CF' }}>
              Suggest a Feature
            </h2>
            {submitError && !notConfigured && (
              <div className="mb-3 px-3 py-2 rounded-lg text-[13px]"
                style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}>
                {submitError}
              </div>
            )}
            {notConfigured ? (
              <p className="text-[13px]" style={{ color: '#D95C17' }}>Feedback coming soon — setting up our backend.</p>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-3">
                <input
                  type="text" value={title} onChange={e => setTitle(e.target.value)}
                  required placeholder="Short title (e.g. &quot;Show player stats&quot;)"
                  className="placeholder-zinc-600" style={{ ...inputStyle, height: 48 }}
                  onFocus={onFocus} onBlur={onBlur}
                />
                <textarea
                  value={description} onChange={e => setDescription(e.target.value)}
                  rows={3} placeholder="Describe what you&apos;d like to see..."
                  className="w-full resize-none placeholder-zinc-600" style={{ ...inputStyle }}
                  onFocus={onFocus} onBlur={onBlur}
                />
                <input
                  type="text" value={name} onChange={e => setName(e.target.value)}
                  placeholder="Your name (optional)"
                  className="placeholder-zinc-600" style={{ ...inputStyle, height: 48 }}
                  onFocus={onFocus} onBlur={onBlur}
                />
                <button
                  type="submit" disabled={submitting}
                  className="w-full font-display uppercase tracking-widest transition-opacity disabled:opacity-50"
                  style={{ height: 48, background: '#D95C17', color: 'white', borderRadius: 10, fontSize: 14, fontWeight: 700 }}
                >
                  {submitting ? 'Submitting…' : 'Submit'}
                </button>
              </form>
            )}
          </div>
        )}

        {/* ── Pipeline progress bar ── */}
        <div className="mb-5">
          <div className="flex items-center gap-0">
            {STAGES.map((stage, idx) => {
              const count = items.filter(i => i.status === stage.id).length
              const isActive = stage.id === activeStage
              const A = 10
              const clipFirst  = `polygon(0 0, calc(100% - ${A}px) 0, 100% 50%, calc(100% - ${A}px) 100%, 0 100%)`
              const clipMiddle = `polygon(${A}px 0, calc(100% - ${A}px) 0, 100% 50%, calc(100% - ${A}px) 100%, 0 100%, ${A}px 50%)`
              const clipLast   = `polygon(${A}px 0, 100% 0, 100% 100%, 0 100%, ${A}px 50%)`
              const clip = idx === 0 ? clipFirst : idx === STAGES.length - 1 ? clipLast : clipMiddle
              return (
                <button
                  key={stage.id}
                  onClick={() => setActiveStage(stage.id)}
                  className="flex-1 flex flex-col items-center justify-center transition-opacity active:opacity-70"
                  style={{
                    clipPath: clip,
                    background: isActive ? stage.color : 'rgba(255,255,255,0.05)',
                    marginLeft: idx === 0 ? 0 : -A,
                    zIndex: isActive ? STAGES.length + 1 : STAGES.length - idx,
                    minHeight: 52,
                    paddingTop: 8, paddingBottom: 8,
                    paddingLeft: idx === 0 ? 8 : A + 4,
                    paddingRight: idx === STAGES.length - 1 ? 8 : A + 4,
                    border: 'none', cursor: 'pointer',
                  }}
                >
                  <span className="font-display font-800 uppercase tracking-widest leading-none block"
                    style={{ fontSize: 8.5, color: isActive ? (stage.id === 'submitted' ? 'white' : '#08080f') : stage.color }}>
                    {stage.shortLabel}
                  </span>
                  <span className="font-display font-700 leading-none block mt-0.5"
                    style={{ fontSize: 15, color: isActive ? (stage.id === 'submitted' ? 'white' : '#08080f') : 'rgba(255,255,255,0.3)' }}>
                    {count}
                  </span>
                </button>
              )
            })}
          </div>
          {/* Stage description */}
          <p className="text-[11px] mt-2 px-1" style={{ color: activeStageInfo.color }}>
            {activeStageInfo.description}
          </p>
        </div>

        {/* ── Card list for selected stage ── */}
        <div className="space-y-3">
          {visibleItems.length === 0 ? (
            <div
              className="py-12 flex flex-col items-center justify-center gap-3 rounded-2xl"
              style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}
            >
              <div className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ background: activeStageInfo.bg, border: `1px solid ${activeStageInfo.color}33` }}>
                <div className="w-2 h-2 rounded-full" style={{ background: activeStageInfo.color, opacity: 0.5 }} />
              </div>
              <div className="text-center">
                <p className="font-display text-[13px] font-700 uppercase tracking-widest" style={{ color: '#334155' }}>
                  Nothing here yet
                </p>
                {activeStage === 'submitted' && (
                  <p className="text-[12px] mt-1" style={{ color: '#334155' }}>
                    Be the first — tap &ldquo;+ Suggest&rdquo; above
                  </p>
                )}
              </div>
            </div>
          ) : (
            visibleItems.map(item => (
              <div
                key={item.id}
                className="rounded-2xl p-4"
                style={{
                  background: activeStageInfo.bg,
                  border: `1px solid ${activeStageInfo.color}28`,
                  borderLeft: `3px solid ${activeStageInfo.color}`,
                }}
              >
                {/* Status badge + date */}
                <div className="flex items-center justify-between mb-2">
                  <span
                    className="font-display text-[10px] font-700 uppercase tracking-widest px-2 py-0.5 rounded-full"
                    style={{ background: `${activeStageInfo.color}20`, color: activeStageInfo.color }}
                  >
                    {activeStageInfo.label}
                  </span>
                  <span className="text-[11px]" style={{ color: '#334155' }}>
                    {item.name ? `${item.name} · ` : ''}{formatDate(item.created_at)}
                  </span>
                </div>

                {/* Title */}
                <p className="font-semibold text-[15px] leading-snug text-white">
                  {item.title}
                </p>

                {/* Description */}
                {item.description && (
                  <p className="text-[13px] mt-1.5 leading-relaxed" style={{ color: '#7a8fa6' }}>
                    {item.description}
                  </p>
                )}

                {/* Admin status changer */}
                {user && (
                  <div className="mt-3 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                    <select
                      value={item.status}
                      onChange={e => handleStatusChange(item.id, e.target.value as FeedbackStatus)}
                      className="text-[12px] rounded-lg outline-none w-full"
                      style={{
                        background: 'rgba(255,255,255,0.07)',
                        border: '1px solid rgba(255,255,255,0.12)',
                        color: '#a1a1aa', padding: '6px 10px', cursor: 'pointer',
                      }}
                    >
                      {STATUS_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

      </div>
    </div>
  )
}

