"use client"
import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"

// ── MenuItem helper ────────────────────────────────────────────────────────────
function MenuItem({
  href,
  onClick,
  children,
  noBorder,
}: {
  href: string
  onClick: () => void
  children: React.ReactNode
  noBorder?: boolean
}) {
  const [hovered, setHovered] = useState(false)
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex items-center py-4 px-6 font-display uppercase text-white transition-colors"
      style={{
        fontSize: 16,
        fontWeight: 700,
        letterSpacing: "0.1em",
        borderBottom: noBorder ? "none" : "1px solid rgba(255,255,255,0.07)",
        background: hovered ? "rgba(255,255,255,0.05)" : "transparent",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {children}
    </Link>
  )
}

// ── Hamburger + slide-in panel ─────────────────────────────────────────────────
function HamburgerMenu() {
  const [open, setOpen] = useState(false)
  const [user, setUser] = useState<{ email?: string } | null>(null)
  const [checked, setChecked] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    if (!supabaseUrl || supabaseUrl.includes("placeholder") || !supabaseUrl.startsWith("http")) {
      setChecked(true)
      return
    }
    import("@/lib/supabase").then(({ createClient }) => {
      const supabase = createClient()
      supabase.auth.getUser().then(({ data }) => {
        setUser(data.user ? { email: data.user.email } : null)
        setChecked(true)
      })
      supabase.auth.onAuthStateChange((_event, session) => {
        setUser(session?.user ? { email: session.user.email } : null)
      })
    })
  }, [])

  // Lock body scroll while panel is open
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : ""
    return () => { document.body.style.overflow = "" }
  }, [open])

  async function handleSignOut() {
    setOpen(false)
    const { createClient } = await import("@/lib/supabase")
    const supabase = createClient()
    await supabase.auth.signOut()
    setUser(null)
    router.push("/auth/login")
    router.refresh()
  }

  return (
    <>
      {/* ── Hamburger button ─────────────────────────────────────── */}
      <button
        onClick={() => setOpen(true)}
        className="absolute right-4 flex flex-col items-center justify-center gap-[5px] w-9 h-9"
        aria-label="Open menu"
      >
        <span className="block rounded-full" style={{ width: 22, height: 1.5, background: "#a1a1aa" }} />
        <span className="block rounded-full" style={{ width: 22, height: 1.5, background: "#a1a1aa" }} />
        <span className="block rounded-full" style={{ width: 22, height: 1.5, background: "#a1a1aa" }} />
      </button>

      {/* ── Backdrop ─────────────────────────────────────────────── */}
      <div
        className="fixed inset-0 z-[9998] transition-opacity duration-300"
        style={{
          background: "rgba(0,0,0,0.55)",
          backdropFilter: "blur(4px)",
          pointerEvents: open ? "auto" : "none",
          opacity: open ? 1 : 0,
        }}
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />

      {/* ── Slide-in panel ───────────────────────────────────────── */}
      <div
        className="fixed top-0 right-0 h-full z-[9999] flex flex-col"
        style={{
          width: 280,
          background: "#0c1b31",
          borderLeft: "1px solid rgba(255,255,255,0.07)",
          transform: open ? "translateX(0)" : "translateX(100%)",
          transition: "transform 0.25s cubic-bezier(0.4,0,0.2,1)",
        }}
      >
        {/* Close button */}
        <div className="flex justify-end px-4 pt-5 pb-2">
          <button
            onClick={() => setOpen(false)}
            className="w-9 h-9 flex items-center justify-center rounded-full"
            style={{ color: "#a1a1aa" }}
            aria-label="Close menu"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M5 5L15 15M15 5L5 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Logo */}
        <div className="flex items-center justify-center" style={{ height: 70, overflow: "hidden" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/scorpanion-logo-new.png"
            alt="Scorpanion"
            style={{ height: 100, width: "auto", objectFit: "contain" }}
            onError={(e) => { (e.target as HTMLImageElement).src = "/scorpanion-full.png" }}
          />
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: "rgba(255,255,255,0.07)", margin: "12px 0" }} />

        {/* Menu items */}
        <nav className="flex flex-col">
          {/* Sign In / Sign Out row */}
          {checked && (
            <div style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
              {user ? (
                <div className="flex items-center gap-3 py-4 px-6">
                  <span
                    className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{
                      background: "rgba(217,92,23,0.15)",
                      border: "1.5px solid rgba(217,92,23,0.35)",
                      color: "#D95C17",
                      fontFamily: "var(--font-barlow), 'Barlow Condensed', sans-serif",
                      fontSize: 13,
                      fontWeight: 700,
                    }}
                  >
                    {user.email?.[0]?.toUpperCase() ?? "?"}
                  </span>
                  <button
                    onClick={handleSignOut}
                    className="font-display uppercase text-white transition-colors"
                    style={{ fontSize: 16, fontWeight: 700, letterSpacing: "0.1em" }}
                  >
                    Sign Out
                  </button>
                </div>
              ) : (
                <MenuItem href="/auth/login" onClick={() => setOpen(false)}>
                  Sign In
                </MenuItem>
              )}
            </div>
          )}

          <MenuItem href="/settings" onClick={() => setOpen(false)}>Settings</MenuItem>
          <MenuItem href="/feedback" onClick={() => setOpen(false)} noBorder>Feedback</MenuItem>
        </nav>
      </div>
    </>
  )
}

// ── PageHeader ─────────────────────────────────────────────────────────────────
interface PageHeaderProps {
  title: string
  children?: React.ReactNode
  titleAction?: React.ReactNode
}

export default function PageHeader({ title: _title, children, titleAction }: PageHeaderProps) {
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

        {/* Hamburger menu */}
        <HamburgerMenu />
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
