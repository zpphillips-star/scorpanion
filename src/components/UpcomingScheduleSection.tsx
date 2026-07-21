"use client"
import { useState, useEffect } from "react"
import { Game } from "@/lib/types"

interface UpcomingGame {
  opponent: string
  oppLogo: string
  date: string
  isHome: boolean
  time: string
}

function fmtShortDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

interface Props {
  game: Game
}

export default function UpcomingScheduleSection({ game }: Props) {
  const [seaGames, setSeaGames] = useState<UpcomingGame[]>([])
  const [oppGames, setOppGames] = useState<UpcomingGame[]>([])
  const [loading, setLoading] = useState(true)

  const league = game.league
  // For WHL/PWHL teams espnId is empty — fall back to internal team id
  const seaId = game.seattleTeam.espnId || game.seattleTeam.id
  const oppId = game.opponent.id

  useEffect(() => {
    if (!seaId || !oppId) {
      setLoading(false)
      return
    }
    Promise.all([
      fetch(`/api/team-detail?teamId=${encodeURIComponent(seaId)}&league=${encodeURIComponent(league)}`).then(r => r.ok ? r.json() : null),
      fetch(`/api/team-detail?teamId=${encodeURIComponent(oppId)}&league=${encodeURIComponent(league)}`).then(r => r.ok ? r.json() : null),
    ]).then(([seaData, oppData]) => {
      setSeaGames((seaData?.upcomingGames ?? []).slice(0, 3))
      setOppGames((oppData?.upcomingGames ?? []).slice(0, 3))
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [seaId, oppId, league])

  if (loading) return (
    <div className="border-t border-zinc-500/65">
      <div className="px-5 pt-6 pb-2">
        <span className="font-display text-[10px] font-700 uppercase tracking-[0.16em] text-zinc-500">Upcoming Schedule</span>
      </div>
      <div className="grid grid-cols-2 divide-x divide-zinc-800/60">
        {[0, 1].map(i => (
          <div key={i} className="px-5 py-3 space-y-3">
            <div className="h-2.5 w-20 rounded bg-white/8 animate-pulse" />
            {[0, 1, 2].map(j => <div key={j} className="h-7 rounded bg-white/5 animate-pulse" />)}
          </div>
        ))}
      </div>
    </div>
  )

  if (seaGames.length === 0 && oppGames.length === 0) return null

  // Match column order to the game card: away on left, home on right.
  // game.isHome = true means Seattle is the home team (right column).
  const awayGames  = game.isHome ? oppGames  : seaGames
  const homeGames  = game.isHome ? seaGames  : oppGames

  const ScheduleCol = ({ games }: { games: UpcomingGame[] }) => (
    <div className="px-3 py-2">
      {games.length === 0 ? (
        <div className="text-[12px] text-zinc-600 py-1">No upcoming games</div>
      ) : (
        games.map((g, i) => (
          <div key={i} className={`flex items-center gap-1.5 py-2 min-w-0 ${i < games.length - 1 ? "border-b border-zinc-500/40" : ""}`}>
            <span className="text-[11px] text-zinc-500 flex-shrink-0 w-12">{fmtShortDate(g.date)}</span>
            <span className="text-[11px] text-zinc-500 flex-shrink-0 w-4">{g.isHome ? "vs" : "@"}</span>
            {g.oppLogo
              ? <img src={g.oppLogo} alt={g.opponent} width={16} height={16} className="object-contain flex-shrink-0" />
              : null
            }
            <span className="text-[12px] font-semibold text-white truncate">{g.opponent}</span>
          </div>
        ))
      )}
    </div>
  )

  return (
    <div className="pt-3 pb-2">
      {/* Section title */}
      <div className="text-[12px] font-bold uppercase tracking-widest text-zinc-400 px-3 mb-3">Upcoming Schedule</div>
      {/* Two-column layout: away (left) | home (right) — matches card layout */}
      <div className="grid grid-cols-2 divide-x divide-zinc-800/60">
        <ScheduleCol games={awayGames} />
        <ScheduleCol games={homeGames} />
      </div>
    </div>
  )
}
