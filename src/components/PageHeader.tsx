"use client"
import { useState, useEffect } from "react"
import Link from "next/link"

// Only render when the user IS signed in — shows their initial, no "Sign in" clutter
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

  // Don't render anything while checking, or if not signed in
  if (!checked || !user) return null

  return (
    <Link
      href="/auth/login"
      title={user.email}
      className="w-8 h-8 rounded-full flex items-center justify-center font-display text-[13px] font-800 transition-all active:scale-95"
      style={{ background: "rgba(217,92,23,0.15)", border: "1.5px solid rgba(217,92,23,0.35)", color: "#D95C17" }}
    >
      {user.email?.[0]?.toUpperCase() ?? "?"}
    </Link>
  )
}

interface PageHeaderProps {
  title: string
  children?: React.ReactNode
  titleAction?: React.ReactNode
}

export default function PageHeader({ title, children, titleAction }: PageHeaderProps) {
  return (
    <div className="sticky top-0 z-30 glass-header">
      <div className="relative flex items-center justify-center px-4 pt-2 pb-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <div style={{ overflow: "hidden", height: "90px", display: "flex", alignItems: "center" }}>
          <img
            src="/scorpanion-logo-new.png"
            alt="Scorpanion"
            style={{ height: "128px", width: "auto", marginTop: "-19px", marginBottom: "-19px", objectFit: "contain" }}
            onError={(e) => { (e.target as HTMLImageElement).src = "/scorpanion-full.png" }}
          />
        </div>

        {titleAction && <div className="absolute left-4 flex-shrink-0">{titleAction}</div>}

        {/* Auth — only renders when signed in */}
        <div className="absolute right-4 flex-shrink-0">
          <AuthButton />
        </div>
      </div>

      {children && (
        <>
          <div className="pt-5">{children}</div>
          <div className="h-5" />
        </>
      )}
    </div>
  )
}
