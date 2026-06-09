"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"

const tabs = [
  { href: "/schedule", label: "Schedule", icon: (a: boolean) => (
    <svg className={`w-5 h-5 transition-colors ${a ? "text-[#00d4ff]" : "text-zinc-500"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <line x1="3" y1="6" x2="21" y2="6" strokeWidth={2} strokeLinecap="round"/>
      <line x1="3" y1="12" x2="21" y2="12" strokeWidth={2} strokeLinecap="round"/>
      <line x1="3" y1="18" x2="21" y2="18" strokeWidth={2} strokeLinecap="round"/>
    </svg>
  )},
  { href: "/calendar", label: "Calendar", icon: (a: boolean) => (
    <svg className={`w-5 h-5 transition-colors ${a ? "text-[#00d4ff]" : "text-zinc-500"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" strokeWidth={2}/>
      <line x1="16" y1="2" x2="16" y2="6" strokeWidth={2} strokeLinecap="round"/>
      <line x1="8" y1="2" x2="8" y2="6" strokeWidth={2} strokeLinecap="round"/>
      <line x1="3" y1="10" x2="21" y2="10" strokeWidth={2}/>
    </svg>
  )},
  { href: "/standings", label: "Standings", icon: (a: boolean) => (
    <svg className={`w-5 h-5 transition-colors ${a ? "text-[#00d4ff]" : "text-zinc-500"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
    </svg>
  )},
  { href: "/teams", label: "Teams", icon: (a: boolean) => (
    <svg className={`w-5 h-5 transition-colors ${a ? "text-[#00d4ff]" : "text-zinc-500"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <rect x="3" y="3" width="7" height="7" rx="1" strokeWidth={2}/>
      <rect x="14" y="3" width="7" height="7" rx="1" strokeWidth={2}/>
      <rect x="14" y="14" width="7" height="7" rx="1" strokeWidth={2}/>
      <rect x="3" y="14" width="7" height="7" rx="1" strokeWidth={2}/>
    </svg>
  )},
  { href: "/assistant", label: "Assistant", icon: (a: boolean) => (
    <svg className={`w-5 h-5 transition-colors ${a ? "text-[#00d4ff]" : "text-zinc-500"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" strokeWidth={2}/>
    </svg>
  )},
]

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <>
      {/* Mobile bottom nav */}
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40"
        style={{ background: "var(--surface)", borderTop: "1px solid var(--border)", paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="flex">
          {tabs.map(tab => {
            const active = pathname === tab.href || pathname.startsWith(tab.href + "/")
            return (
              <Link key={tab.href} href={tab.href} className="flex-1 flex flex-col items-center pt-1 pb-2 gap-0.5 relative group">
                {/* Active indicator bar */}
                <span
                  className="absolute top-0 left-1/2 -translate-x-1/2 h-[2px] rounded-b-full transition-all duration-200"
                  style={{
                    width: active ? "24px" : "0px",
                    background: "var(--accent)",
                    boxShadow: active ? "0 0 6px var(--accent)" : "none",
                  }}
                />
                <span className="mt-2">{tab.icon(active)}</span>
                <span
                  className="text-[10px] font-semibold transition-colors"
                  style={{ color: active ? "var(--accent)" : "#6b7280" }}
                >
                  {tab.label}
                </span>
              </Link>
            )
          })}
        </div>
      </nav>

      {/* Desktop sidebar nav */}
      <nav
        className="hidden lg:flex fixed left-0 top-0 bottom-0 z-40 w-16 xl:w-20 flex-col items-center py-6 gap-1"
        style={{ background: "var(--surface)", borderRight: "1px solid var(--border)" }}
      >
        {/* Logo mark */}
        <div className="mb-4 w-8 h-8 rounded-xl flex items-center justify-center text-lg" style={{ background: "var(--accent-dim)" }}>
          🦂
        </div>
        {tabs.map(tab => {
          const active = pathname === tab.href || pathname.startsWith(tab.href + "/")
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className="flex flex-col items-center gap-1 p-2 rounded-xl transition-all w-full mx-2 relative"
              style={{
                background: active ? "rgba(0,212,255,0.08)" : "transparent",
              }}
            >
              {active && (
                <span
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-6 rounded-r-full"
                  style={{ background: "var(--accent)", boxShadow: "0 0 6px var(--accent)" }}
                />
              )}
              {tab.icon(active)}
              <span className="text-[9px] xl:text-[10px] font-semibold" style={{ color: active ? "var(--accent)" : "#6b7280" }}>
                {tab.label}
              </span>
            </Link>
          )
        })}
      </nav>
    </>
  )
}
