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
        style={{ background: "rgba(0,212,255,0.15)", border: "1.5px solid rgba(0,212,255,0.35)", color: "#00d4ff" }}
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
      <span className="font-display text-[11px] font-700 text-zinc-500 uppercase tracking-wide">Sign in</span>
    </Link>
  )
}

interface PageHeaderProps {
  title: string
  children?: React.ReactNode  // extra content below the title row (filter bars etc.)
}

export default function PageHeader({ title, children }: PageHeaderProps) {
  return (
    <div className="sticky top-0 z-30 glass-header">
      {/* Logo | Title | Auth */}
      <div className="flex items-center px-4 py-3 gap-3">
        {/* Left: scorpion logo */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/scorpion-mono.png" alt="Scorpanion" width={26} height={26} className="object-contain flex-shrink-0" />

        {/* Center: page title */}
        <h1 className="flex-1 text-center font-display text-[22px] font-800 text-white leading-none tracking-tight uppercase">
          {title}
        </h1>

        {/* Right: auth */}
        <div className="flex-shrink-0">
          <AuthButton />
        </div>
      </div>

      {/* Slot for filter bars etc. */}
      {children}
    </div>
  )
}
