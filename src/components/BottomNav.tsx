"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"

// Inline SVG scorpion — pixel-perfect at 22–26 px, no external dependency.
// Uses a filled silhouette so it's readable at small sizes on both the dark
// inactive button and the cyan active button.
function ScorpionIcon({ size, active }: { size: number; active: boolean }) {
  // Active = white icon on orange pill; inactive = visible cream-ish on dark pill.
  const fill = active ? "#ffffff" : "rgba(242,230,207,0.55)"
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      aria-hidden="true"
    >
      {/* ── Chunky body (rounded rect) ───────────────────────── */}
      <rect x="10" y="13" width="11" height="8" rx="3.5" fill={fill} />

      {/* ── Head (left of body) ──────────────────────────────── */}
      <ellipse cx="7" cy="17" rx="3" ry="2.5" fill={fill} />

      {/* ── Chelicerae / pincers ─────────────────────────────── */}
      <line x1="4.5" y1="15" x2="2"  y2="12.5" stroke={fill} strokeWidth="2.2" strokeLinecap="round" />
      <line x1="4.5" y1="19" x2="2"  y2="21.5" stroke={fill} strokeWidth="2.2" strokeLinecap="round" />

      {/* ── Tail — thick C-curve sweeping up and hooking forward */}
      <path
        d="M21 14 C24 10 28 10 28 14 C28 18 24 19.5 22 18"
        stroke={fill}
        strokeWidth="2.8"
        strokeLinecap="round"
        fill="none"
      />
      {/* Stinger tip */}
      <line x1="22" y1="18" x2="24" y2="16" stroke={fill} strokeWidth="2.2" strokeLinecap="round" />

      {/* ── Legs (3 pairs, short and chunky) ─────────────────── */}
      <line x1="13" y1="21" x2="11" y2="24.5" stroke={fill} strokeWidth="1.8" strokeLinecap="round" />
      <line x1="16" y1="21" x2="15" y2="25"   stroke={fill} strokeWidth="1.8" strokeLinecap="round" />
      <line x1="19" y1="21" x2="19" y2="24.5" stroke={fill} strokeWidth="1.8" strokeLinecap="round" />
      <line x1="13" y1="13" x2="11" y2="9.5"  stroke={fill} strokeWidth="1.8" strokeLinecap="round" />
      <line x1="16" y1="13" x2="15" y2="9"    stroke={fill} strokeWidth="1.8" strokeLinecap="round" />
      <line x1="19" y1="13" x2="19" y2="9.5"  stroke={fill} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

// Side tabs — Schedule, Calendar on left; Standings, Teams on right
const leftTabs = [
  { href: "/schedule", label: "Schedule", icon: (a: boolean) => (
    <svg className={`w-5 h-5 transition-colors`} fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: a ? "#D95C17" : "#5F6773" }}>
      <line x1="3" y1="6" x2="21" y2="6" strokeWidth={2} strokeLinecap="round"/>
      <line x1="3" y1="12" x2="21" y2="12" strokeWidth={2} strokeLinecap="round"/>
      <line x1="3" y1="18" x2="21" y2="18" strokeWidth={2} strokeLinecap="round"/>
    </svg>
  )},
  { href: "/calendar", label: "Calendar", icon: (a: boolean) => (
    <svg className={`w-5 h-5 transition-colors`} fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: a ? "#D95C17" : "#5F6773" }}>
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" strokeWidth={2}/>
      <line x1="16" y1="2" x2="16" y2="6" strokeWidth={2} strokeLinecap="round"/>
      <line x1="8" y1="2" x2="8" y2="6" strokeWidth={2} strokeLinecap="round"/>
      <line x1="3" y1="10" x2="21" y2="10" strokeWidth={2}/>
    </svg>
  )},
]
const rightTabs = [
  { href: "/standings", label: "Standings", icon: (a: boolean) => (
    <svg className={`w-5 h-5 transition-colors`} fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: a ? "#D95C17" : "#5F6773" }}>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
    </svg>
  )},
  { href: "/teams", label: "Teams", icon: (a: boolean) => (
    <svg className={`w-5 h-5 transition-colors`} fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: a ? "#D95C17" : "#5F6773" }}>
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
          background: "#D95C17",
          boxShadow: active ? "0 0 6px rgba(217,92,23,0.6)" : "none",
        }}
      />
      <span className="mt-2">{icon(active)}</span>
      <span className="text-[10px] font-semibold transition-colors" style={{ color: active ? "#D95C17" : "#5F6773" }}>
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
          background: "#0c1b31",
          borderTop: "1px solid #1e3050",
          paddingBottom: "env(safe-area-inset-bottom)",
          minHeight: "60px",
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
                className="w-14 h-14 rounded-full overflow-hidden flex items-center justify-center transition-all active:scale-95"
                style={{
                  background: "#0c1b31",
                  border: homeActive
                    ? "2.5px solid #D65820"
                    : "2.5px solid #D65820",
                  boxShadow: homeActive
                    ? "0 0 24px rgba(214,88,32,0.7), 0 4px 16px rgba(0,0,0,0.5)"
                    : "0 0 14px rgba(214,88,32,0.4), 0 4px 16px rgba(0,0,0,0.4)",
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/sp-new-btn.png"
                  alt="Home"
                  className="w-full h-full object-cover transition-all rounded-full"
                  style={{ opacity: homeActive ? 1 : 0.85 }}
                />
              </div>
              <span
                className="text-[10px] font-semibold mt-1 transition-colors"
                style={{ color: homeActive ? "#D65820" : "#5F6773" }}
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
            className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center transition-all"
            style={{
              background: "#0c1b31",
              boxShadow: homeActive ? "0 0 14px rgba(214,88,32,0.6)" : "0 0 8px rgba(214,88,32,0.3)",
              border: homeActive ? "2.5px solid #D65820" : "2.5px solid #D65820",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/sp-new-btn.png"
              alt="Home"
              className="w-full h-full object-cover transition-all rounded-full"
              style={{ opacity: homeActive ? 1 : 0.85 }}
            />
          </div>
        </Link>

        {[...leftTabs, ...rightTabs].map(tab => {
          const active = pathname === tab.href || pathname.startsWith(tab.href + "/")
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className="flex flex-col items-center gap-1 p-2 rounded-lg transition-all w-full relative"
              style={{ background: active ? "rgba(217,92,23,0.1)" : "transparent" }}
            >
              {active && (
                <span
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-6 rounded-r-full"
                  style={{ background: "#D95C17", boxShadow: "0 0 6px rgba(217,92,23,0.6)" }}
                />
              )}
              {tab.icon(active)}
              <span className="text-[9px] xl:text-[10px] font-semibold" style={{ color: active ? "#D95C17" : "#5F6773" }}>
                {tab.label}
              </span>
            </Link>
          )
        })}
      </nav>
    </>
  )
}
