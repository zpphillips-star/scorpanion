"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"

// Fallback rendered when scorpion-mono.png fails to load (SW cache miss, network error, etc.)
function ScorpionFallback({ size, active }: { size: number; active: boolean }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      style={{ color: active ? "white" : "rgba(255,255,255,0.45)" }}
      aria-hidden="true"
    >
      {/* Simple home / shield silhouette as safe fallback */}
      <path d="M12 3L2 9v1h2v10h5v-6h6v6h5V10h2V9L12 3z" />
    </svg>
  )
}

function HomeIcon({ size, active }: { size: number; active: boolean }) {
  const [failed, setFailed] = useState(false)
  if (failed) return <ScorpionFallback size={size} active={active} />
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/scorpion-mono.png"
      alt="Home"
      width={size}
      height={size}
      className="object-contain"
      style={{ filter: active ? "none" : "brightness(0.5)" }}
      onError={() => setFailed(true)}
    />
  )
}

// Side tabs — Schedule, Calendar on left; Standings, Teams on right
const leftTabs = [
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
]
const rightTabs = [
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
]

const NavTab = ({ href, label, icon }: { href: string; label: string; icon: (a: boolean) => React.ReactNode }) => {
  const pathname = usePathname()
  const active = pathname === href || pathname.startsWith(href + "/")
  return (
    <Link href={href} className="flex-1 flex flex-col items-center pt-1 pb-2 gap-0.5 relative group">
      <span
        className="absolute top-0 left-1/2 -translate-x-1/2 h-[2px] rounded-b-full transition-all duration-200"
        style={{
          width: active ? "22px" : "0px",
          background: "var(--accent)",
          boxShadow: active ? "0 0 6px var(--accent)" : "none",
        }}
      />
      <span className="mt-2">{icon(active)}</span>
      <span className="text-[10px] font-semibold transition-colors" style={{ color: active ? "var(--accent)" : "#6b7280" }}>
        {label}
      </span>
    </Link>
  )
}

export default function BottomNav() {
  const pathname = usePathname()
  const homeActive = pathname === "/home" || pathname === "/"

  return (
    <>
      {/* Mobile bottom nav */}
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40"
        style={{
          background: "var(--surface)",
          borderTop: "1px solid var(--border)",
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        <div className="flex items-end">
          {/* Left 2 tabs */}
          {leftTabs.map(t => <NavTab key={t.href} {...t} />)}

          {/* Center FAB — Home */}
          <div className="flex-1 flex justify-center pb-2 relative">
            <Link
              href="/home"
              className="relative -top-4 flex flex-col items-center"
            >
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center transition-all active:scale-95"
                style={{
                  background: homeActive
                    ? "var(--accent)"
                    : "linear-gradient(145deg, #1a1a26, #0f0f1a)",
                  border: homeActive
                    ? "2px solid var(--accent)"
                    : "2px solid rgba(255,255,255,0.12)",
                  boxShadow: homeActive
                    ? "0 0 20px rgba(0,212,255,0.5), 0 4px 16px rgba(0,0,0,0.5)"
                    : "0 4px 16px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.08)",
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <HomeIcon size={26} active={homeActive} />
              </div>
              <span
                className="text-[10px] font-semibold mt-1 transition-colors"
                style={{ color: homeActive ? "var(--accent)" : "#6b7280" }}
              >
                Home
              </span>
            </Link>
          </div>

          {/* Right 2 tabs */}
          {rightTabs.map(t => <NavTab key={t.href} {...t} />)}
        </div>
      </nav>

      {/* Desktop sidebar nav */}
      <nav
        className="hidden lg:flex fixed left-0 top-0 bottom-0 z-40 w-16 xl:w-20 flex-col items-center py-4 gap-1"
        style={{ background: "var(--surface)", borderRight: "1px solid var(--border)" }}
      >
        {/* Home FAB — top of sidebar */}
        <Link href="/home" className="mb-3 relative group">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center transition-all"
            style={{
              background: homeActive ? "var(--accent)" : "var(--surface-2)",
              boxShadow: homeActive ? "0 0 14px rgba(0,212,255,0.5)" : "none",
              border: homeActive ? "2px solid var(--accent)" : "2px solid var(--border)",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <HomeIcon size={22} active={homeActive} />
          </div>
        </Link>

        {[...leftTabs, ...rightTabs].map(tab => {
          const active = pathname === tab.href || pathname.startsWith(tab.href + "/")
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className="flex flex-col items-center gap-1 p-2 rounded-lg transition-all w-full relative"
              style={{ background: active ? "rgba(0,212,255,0.08)" : "transparent" }}
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
