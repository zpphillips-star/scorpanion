"use client"
import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import PageHeader from "@/components/PageHeader"

// ── Types ─────────────────────────────────────────────────────────────────────
interface FeedbackItem {
  id: string
  title: string
  description: string | null
  status: "submitted" | "backlog" | "in_progress" | "live"
  created_at: string
}

type Stage = FeedbackItem["status"]

// ── Stage config ──────────────────────────────────────────────────────────────
const STAGES: { key: Stage; label: string; color: string; dotColor: string }[] = [
  { key: "submitted",  label: "Submitted",   color: "#D95C17", dotColor: "rgba(217,92,23,0.8)" },
  { key: "backlog",    label: "Backlog",      color: "#9ba3ae", dotColor: "rgba(155,163,174,0.8)" },
  { key: "in_progress",label: "In Progress", color: "#FFB400", dotColor: "rgba(255,180,0,0.9)" },
  { key: "live",       label: "Live",         color: "#2FA84F", dotColor: "rgba(47,168,79,0.9)" },
]

const STAGE_BG: Record<Stage, string> = {
  submitted:   "rgba(217,92,23,0.08)",
  backlog:     "rgba(155,163,174,0.06)",
  in_progress: "rgba(255,180,0,0.08)",
  live:        "rgba(47,168,79,0.08)",
}

// ── Back chevron ──────────────────────────────────────────────────────────────
function BackChevron() {
  return (
    <Link
      href="/"
      className="w-8 h-8 flex items-center justify-center rounded-lg transition-all active:scale-90 hover:bg-white/5"
      style={{ color: "var(--text-muted)" }}
      aria-label="Go back"
    >
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
      </svg>
    </Link>
  )
}

// ── Collapsible section ───────────────────────────────────────────────────────
function RoadmapSection({
  stage,
  items,
  isAdmin,
  onStatusChange,
}: {
  stage: typeof STAGES[number]
  items: FeedbackItem[]
  isAdmin: boolean
  onStatusChange: (id: string, status: Stage) => void
}) {
  const [open, setOpen] = useState(stage.key === "in_progress" || stage.key === "submitted")

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" })
  }

  return (
    <div
      className="rounded-xl overflow-hidden mb-3"
      style={{
        border: "1px solid rgba(255,255,255,0.16)",
        background: open ? STAGE_BG[stage.key] : "rgba(255,255,255,0.03)",
      }}
    >
      {/* Section header */}
      <button
        className="w-full flex items-center justify-between px-4 py-3.5 transition-colors hover:bg-white/5"
        onClick={() => setOpen(v => !v)}
      >
        <div className="flex items-center gap-2.5">
          <span
            className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{ background: stage.dotColor }}
          />
          <span
            className="font-display font-bold text-base uppercase tracking-wide"
            style={{ color: stage.color }}
          >
            {stage.label}
          </span>
          <span
            className="text-xs font-semibold px-1.5 py-0.5 rounded-md"
            style={{ background: "rgba(255,255,255,0.16)", color: "var(--text-faint)" }}
          >
            {items.length}
          </span>
        </div>
        <svg
          className="w-4 h-4 shrink-0 transition-transform duration-200"
          style={{ color: "var(--text-faint)", transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {/* Items */}
      {open && (
        <div className="px-4 pb-3 space-y-2">
          {items.length === 0 ? (
            <p className="py-3 text-center text-sm" style={{ color: "var(--text-faint)" }}>
              Nothing here yet
            </p>
          ) : (
            items.map(item => (
              <div
                key={item.id}
                className="rounded-lg px-3 py-2.5"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.16)" }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm leading-snug" style={{ color: "var(--text)" }}>
                      {item.title}
                    </p>
                    {item.description && (
                      <p
                        className="text-xs leading-snug mt-0.5 line-clamp-2"
                        style={{ color: "var(--text-muted)" }}
                      >
                        {item.description}
                      </p>
                    )}
                    <p className="text-[11px] mt-1" style={{ color: "var(--text-faint)" }}>
                      {formatDate(item.created_at)}
                    </p>
                  </div>

                  {/* Admin status dropdown */}
                  {isAdmin && (
                    <select
                      value={item.status}
                      onChange={e => onStatusChange(item.id, e.target.value as Stage)}
                      className="text-xs rounded-md px-2 py-1 shrink-0"
                      style={{
                        background: "rgba(255,255,255,0.16)",
                        border: "1px solid rgba(255,255,255,0.16)",
                        color: "var(--text)",
                        fontSize: "11px",
                        cursor: "pointer",
                      }}
                      onClick={e => e.stopPropagation()}
                    >
                      {STAGES.map(s => (
                        <option key={s.key} value={s.key} style={{ background: "#142236" }}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function RoadmapPage() {
  const [items, setItems] = useState<FeedbackItem[]>([])
  const [loading, setLoading] = useState(true)
  const [unavailable, setUnavailable] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [token, setToken] = useState<string | null>(null)

  // Check auth
  useEffect(() => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    if (!supabaseUrl || supabaseUrl.includes("placeholder")) return
    import("@/lib/supabase").then(({ createClient }) => {
      const supabase = createClient()
      supabase.auth.getSession().then(({ data }) => {
        if (data.session) {
          setIsAdmin(true)
          setToken(data.session.access_token)
        }
      })
    })
  }, [])

  const fetchItems = useCallback(async () => {
    try {
      const res = await fetch("/api/feedback")
      if (res.status === 503) {
        setUnavailable(true)
        setLoading(false)
        return
      }
      const json = await res.json()
      setItems(json.items ?? [])
    } catch {
      // fail silently
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchItems()
  }, [fetchItems])

  async function handleStatusChange(id: string, newStatus: Stage) {
    if (!token) return

    // Optimistic update
    setItems(prev => prev.map(item => item.id === id ? { ...item, status: newStatus } : item))

    try {
      await fetch(`/api/feedback?id=${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      })
    } catch {
      // Revert on error
      fetchItems()
    }
  }

  const grouped = STAGES.reduce<Record<Stage, FeedbackItem[]>>(
    (acc, s) => {
      acc[s.key] = items.filter(i => i.status === s.key)
      return acc
    },
    { submitted: [], backlog: [], in_progress: [], live: [] }
  )

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      <PageHeader title="Roadmap" titleAction={<BackChevron />} />

      <div className="px-4 pb-12 max-w-lg mx-auto">
        {/* ── Header ── */}
        <div className="pt-6 pb-5">
          <h1
            className="font-display font-bold text-2xl uppercase tracking-wide mb-1"
            style={{ color: "var(--text)" }}
          >
            Product Roadmap
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: "14px" }}>
            See what&apos;s being worked on and what&apos;s coming next.
            {isAdmin && (
              <span style={{ color: "#D95C17" }}> · Admin mode — you can move items between stages.</span>
            )}
          </p>
        </div>

        {unavailable ? (
          <div
            className="rounded-xl p-5"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.16)" }}
          >
            <p style={{ color: "var(--text-faint)", fontSize: "14px" }}>
              Roadmap data is currently unavailable.
            </p>
          </div>
        ) : loading ? (
          <div className="space-y-3">
            {STAGES.map(s => (
              <div
                key={s.key}
                className="rounded-xl h-14 animate-pulse"
                style={{ background: "rgba(255,255,255,0.04)" }}
              />
            ))}
          </div>
        ) : (
          <>
            {STAGES.map(stage => (
              <RoadmapSection
                key={stage.key}
                stage={stage}
                items={grouped[stage.key]}
                isAdmin={isAdmin}
                onStatusChange={handleStatusChange}
              />
            ))}
          </>
        )}

        {/* ── CTA ── */}
        <div className="mt-6 text-center">
          <Link
            href="/feedback"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all active:scale-95"
            style={{
              background: "linear-gradient(135deg, #D95C17 0%, #B54E13 100%)",
              color: "#fff",
            }}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Submit Feedback
          </Link>
        </div>
      </div>
    </div>
  )
}
