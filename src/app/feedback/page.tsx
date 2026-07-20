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
  description: string
  color: string
  bg: string
  borderColor: string
}[] = [
  {
    id: 'submitted',
    label: 'Submitted',
    description: 'New ideas we\'ve received and are reviewing',
    color: '#a1a1aa',
    bg: 'rgba(161,161,170,0.07)',
    borderColor: 'rgba(161,161,170,0.2)',
  },
  {
    id: 'backlog',
    label: 'Planned',
    description: 'Accepted and scheduled to be built',
    color: '#60a5fa',
    bg: 'rgba(96,165,250,0.07)',
    borderColor: 'rgba(96,165,250,0.2)',
  },
  {
    id: 'in_progress',
    label: 'In Progress',
    description: 'Actively being built right now',
    color: '#D95C17',
    bg: 'rgba(217,92,23,0.08)',
    borderColor: 'rgba(217,92,23,0.22)',
  },
  {
    id: 'live',
    label: 'Live',
    description: 'Shipped and available in the app',
    color: '#22c55e',
    bg: 'rgba(34,197,94,0.07)',
    borderColor: 'rgba(34,197,94,0.2)',
  },
]

const STATUS_OPTIONS: { value: FeedbackStatus; label: string }[] = [
  { value: 'submitted',   label: 'Submitted'   },
  { value: 'backlog',     label: 'Planned'      },
  { value: 'in_progress', label: 'In Progress'  },
  { value: 'live',        label: 'Live'         },
]

function formatDate(iso: string) {
  try { return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) }
  catch { return '' }
}

export default function FeedbackPage() {
  const [items, setItems] = useState<FeedbackItem[]>([])
  const [notConfigured, setNotConfigured] = useState(false)
  const [user, setUser] = useState<{ email?: string } | null>(null)
  const [expanded, setExpanded] = useState<Record<FeedbackStatus, boolean>>({
    submitted: true, backlog: true, in_progress: true, live: true,
  })
  const [showForm, setShowForm] = useState(false)

  const [title, setTitle]             = useState('')
  const [description, setDescription] = useState('')
  const [name, setName]               = useState('')
  const [submitting, setSubmitting]   = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [justSubmitted, setJustSubmitted] = useState(false)

  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    if (!url || url.includes('placeholder') || !url.startsWith('http')) return
    import('@/lib/supabase').then(({ createClient }) => {
      createClient().auth.getUser().then(({ data }) => {
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
    setSubmitting(true); setSubmitError(null)
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), description: description.trim(), name: name.trim() }),
      })
      const data = await res.json()
      if (!res.ok) {
        if (data.not_configured) setNotConfigured(true)
        setSubmitError(data.error ?? 'Failed to submit'); return
      }
      setJustSubmitted(true); setTitle(''); setDescription(''); setName(''); setShowForm(false)
      setTimeout(() => setJustSubmitted(false), 5000)
      fetchItems()
    } catch { setSubmitError('Something went wrong. Please try again.') }
    finally { setSubmitting(false) }
  }

  async function handleStatusChange(id: string, status: FeedbackStatus) {
    setItems(prev => prev.map(i => i.id === id ? { ...i, status } : i))
    try {
      const { createClient } = await import('@/lib/supabase')
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`/api/feedback/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}) },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) fetchItems()
    } catch { fetchItems() }
  }

  function toggleStage(id: FeedbackStatus) {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }))
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 10, color: 'white', fontSize: 15, outline: 'none', padding: '12px 16px',
  }
  function onFocus(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) {
    e.currentTarget.style.borderColor = '#00d4ff'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(0,212,255,0.1)'
  }
  function onBlur(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) {
    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.boxShadow = 'none'
  }

  return (
    <div style={{ minHeight: '100dvh', background: '#0c1b31', color: 'white', paddingBottom: '5rem' }}>

      {/* Header */}
      <div className="sticky top-0 z-20 flex items-center px-4 py-3"
        style={{ background: 'rgba(12,27,49,0.96)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255,255,255,0.06)', position: 'relative' }}>
        <Link href="/home" className="flex items-center justify-center w-8 h-8 rounded-full flex-shrink-0"
          style={{ color: '#a1a1aa', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 3L5 8L10 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </Link>
        {/* Logo — absolutely centered in the header, matching site-wide size */}
        <div style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
          <div style={{ overflow: 'hidden', height: 90, display: 'flex', alignItems: 'center' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/scorpanion-logo-new.png" alt="Scorpanion"
              style={{ height: 128, width: 'auto', marginTop: -19, marginBottom: -19, objectFit: 'contain' }}
              onError={(e) => { (e.target as HTMLImageElement).src = '/scorpanion-full.png' }}/>
          </div>
        </div>
        <div style={{ flex: 1 }} />
        <button onClick={() => setShowForm(v => !v)}
          className="flex-shrink-0 font-display uppercase tracking-widest transition-opacity active:opacity-70"
          style={{ height: 34, paddingLeft: 14, paddingRight: 14, background: showForm ? 'rgba(217,92,23,0.15)' : '#D95C17',
            color: showForm ? '#D95C17' : 'white', border: showForm ? '1px solid rgba(217,92,23,0.4)' : 'none',
            borderRadius: 8, fontSize: 12, fontWeight: 700 }}>
          {showForm ? 'Cancel' : '+ Suggest'}
        </button>
      </div>

      <div className="px-4 pt-5" style={{ maxWidth: 680, margin: '0 auto' }}>

        {/* Intro */}
        <div className="mb-5">
          <h1 className="font-display text-[22px] font-800 uppercase tracking-tight text-white">Roadmap</h1>
          <p className="text-[13px] mt-1" style={{ color: '#52637a' }}>
            Track what&apos;s being built and what&apos;s shipped. Tap any section to expand it.
          </p>
        </div>

        {/* Success toast */}
        {justSubmitted && (
          <div className="mb-4 px-4 py-3 rounded-xl text-[13px] flex items-center gap-2"
            style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', color: '#86efac' }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <circle cx="7" cy="7" r="6.5" stroke="#22c55e"/>
              <path d="M4 7l2 2 4-4" stroke="#22c55e" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Thanks! Your feedback was submitted and is under review.
          </div>
        )}

        {/* Collapsible submit form */}
        {showForm && (
          <div className="mb-6 rounded-2xl p-5"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
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
                <input type="text" value={title} onChange={e => setTitle(e.target.value)} required
                  placeholder="Short title (e.g. &quot;Show player stats&quot;)"
                  className="placeholder-zinc-600" style={{ ...inputStyle, height: 48 }} onFocus={onFocus} onBlur={onBlur}/>
                <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3}
                  placeholder="Describe what you'd like in more detail..." className="w-full resize-none placeholder-zinc-600"
                  style={inputStyle} onFocus={onFocus} onBlur={onBlur}/>
                <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Your name (optional)"
                  className="placeholder-zinc-600" style={{ ...inputStyle, height: 48 }} onFocus={onFocus} onBlur={onBlur}/>
                <button type="submit" disabled={submitting}
                  className="w-full font-display uppercase tracking-widest transition-opacity disabled:opacity-50"
                  style={{ height: 48, background: '#D95C17', color: 'white', borderRadius: 10, fontSize: 14, fontWeight: 700 }}>
                  {submitting ? 'Submitting…' : 'Submit'}
                </button>
              </form>
            )}
          </div>
        )}

        {/* ── Collapsible stage sections ── */}
        <div className="space-y-3">
          {STAGES.map(stage => {
            const stageItems = items.filter(i => i.status === stage.id)
            const isOpen = expanded[stage.id]
            return (
              <div key={stage.id} className="rounded-2xl overflow-hidden"
                style={{ border: `1px solid ${stage.borderColor}`, background: stage.bg }}>

                {/* Section header — always visible, tap to toggle */}
                <button
                  onClick={() => toggleStage(stage.id)}
                  className="w-full flex items-center gap-3 px-4 py-4 text-left transition-opacity active:opacity-70"
                >
                  {/* Color bar */}
                  <div className="w-1 h-8 rounded-full flex-shrink-0" style={{ background: stage.color }} />

                  {/* Label + description */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-display text-[14px] font-800 uppercase tracking-widest" style={{ color: stage.color }}>
                        {stage.label}
                      </span>
                      {/* Count badge */}
                      <span className="font-display text-[11px] font-700 px-2 py-0.5 rounded-full"
                        style={{ background: `${stage.color}20`, color: stage.color }}>
                        {stageItems.length}
                      </span>
                    </div>
                    <p className="text-[11px] mt-0.5" style={{ color: '#52637a' }}>
                      {stage.description}
                    </p>
                  </div>

                  {/* Chevron */}
                  <svg
                    width="16" height="16" viewBox="0 0 16 16" fill="none" className="flex-shrink-0 transition-transform"
                    style={{ color: stage.color, opacity: 0.5, transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
                  >
                    <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>

                {/* Expanded items */}
                {isOpen && (
                  <div className="px-4 pb-4 space-y-2.5"
                    style={{ borderTop: `1px solid ${stage.borderColor}` }}>

                    {stageItems.length === 0 ? (
                      <div className="py-5 text-center">
                        <p className="text-[12px]" style={{ color: '#334155' }}>
                          {stage.id === 'submitted' ? 'Be the first — tap "+ Suggest" above' : 'Nothing here yet'}
                        </p>
                      </div>
                    ) : (
                      stageItems.map(item => (
                        <div key={item.id} className="rounded-xl p-3.5 mt-2.5"
                          style={{ background: 'rgba(12,27,49,0.6)', border: '1px solid rgba(255,255,255,0.06)' }}>
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <p className="font-semibold text-[14px] leading-snug text-white flex-1">{item.title}</p>
                            <span className="text-[10px] flex-shrink-0 mt-0.5" style={{ color: '#334155' }}>
                              {formatDate(item.created_at)}
                            </span>
                          </div>
                          {item.description && (
                            <p className="text-[12px] leading-relaxed" style={{ color: '#7a8fa6' }}>{item.description}</p>
                          )}
                          {item.name && (
                            <p className="text-[11px] mt-1.5" style={{ color: '#334155' }}>— {item.name}</p>
                          )}
                          {user && (
                            <div className="mt-2.5 pt-2.5" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                              <select value={item.status} onChange={e => handleStatusChange(item.id, e.target.value as FeedbackStatus)}
                                className="text-[12px] rounded-lg outline-none w-full"
                                style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', color: '#a1a1aa', padding: '6px 10px', cursor: 'pointer' }}>
                                {STATUS_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                              </select>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>

      </div>
    </div>
  )
}
