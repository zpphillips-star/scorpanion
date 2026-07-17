"use client"
import { useState, useEffect } from "react"
import Link from "next/link"

function AuthButton() {
  const [user, setUser] = useState<{ email?: string } | null>(null)
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    if (!supabaseUrl || supabaseUrl.includes("placeholder")) {
      setChecked(true)
      return
    }
    import("@/lib/supabase").then(({ createClient }) => {
      const supabase = createClient()
      supabase.auth.getUser().then(({ data }) => {
        setUser(data.user ? { email: data.user.email } : null)
        setChecked(true)
      })
    })
  }, [])

  if (!checked) return <div className="w-8 h-8" />

  if (user) {
    return (
      <Link
        href="/auth/login"
        title={user.email}
        className="w-9 h-9 rounded-full flex items-center justify-center font-display text-[14px] font-800 transition-all active:scale-95"
        style={{ background: "rgba(217,92,23,0.15)", border: "1.5px solid rgba(217,92,23,0.35)", color: "#D95C17" }}
      >
        {user.email?.[0]?.toUpperCase() ?? "?"}
      </Link>
    )
  }

  return (
    <Link
      href="/auth/login"
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all active:scale-95"
      style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}
    >
      <svg className="w-3.5 h-3.5 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
      <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wide">Sign in</span>
    </Link>
  )
}

interface PageHeaderProps {
  title: string
  children?: React.ReactNode  // extra content below the title row (filter bars etc.)
  titleAction?: React.ReactNode  // small action next to the title (left of auth)
}

export default function PageHeader({ title, children, titleAction }: PageHeaderProps) {
  return (
    <div className="sticky top-0 z-30 glass-header">
      {/* Centered logo row with auth floated right */}
      <div className="relative flex items-center justify-center px-4 pt-4 pb-2">
        {/* Center: logo — exact file, no modifications, with breathing room */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <div className="px-4 py-1.5">
          <img src="/scorpanion-logo-new.png" alt="Scorpanion" className="object-contain h-[109px] w-auto"
            onError={(e) => { (e.target as HTMLImageElement).src = "/scorpanion-full.png" }} />
        </div>

        {/* Optional action slot — floated left */}
        {titleAction && <div className="absolute left-4 flex-shrink-0">{titleAction}</div>}

        {/* Right: auth — absolute so it doesn't shift the logo */}
        <div className="absolute right-4 flex-shrink-0">
          <AuthButton />
        </div>
      </div>

      {/* Divider between logo and filter bar */}
      <div className="mx-4 mb-3" style={{ height: "1px", background: "rgba(255,255,255,0.06)" }} />

      {/* Slot for filter bars etc. */}
      {children}
    </div>
  )
}
