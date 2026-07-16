"use client"
import { useState, useEffect } from "react"
import { Game } from "@/lib/types"
import { getTeamLogoUrl } from "@/lib/teams"
import TeamLogo from "./TeamLogo"

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
  const seaId = game.seattleTeam.espnId
  const oppId = game.opponent.id

  useEffect(() => {
    if (!seaId || !oppId || league === "whl" || league === "pwhl") {
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
    <div className="border-t border-zinc-800/60">
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

  const seaLogoUrl = getTeamLogoUrl(game.seattleTeam)
  const color = game.seattleTeam.primaryColor

  const GameRow = ({ g }: { g: UpcomingGame }) => (
    <div className="flex items-center gap-2.5 py-3 border-b border-zinc-800/50 last:border-0">
      <span className="font-display text-[11px] font-600 text-zinc-600 w-5 text-center flex-shrink-0">{g.isHome ? "vs" : "@"}</span>
      {g.oppLogo
        // eslint-disable-next-line @next/next/no-img-element
        ? <img src={g.oppLogo} alt={g.opponent} width={18} height={18} className="object-contain flex-shrink-0" />
        : <div className="w-4.5 h-4.5 flex-shrink-0" />}
      <span className="font-display text-[13px] font-600 text-zinc-300 flex-1 truncate">{g.opponent}</span>
      <span className="font-display text-[11px] text-zinc-600 flex-shrink-0">{fmtShortDate(g.date)}</span>
    </div>
  )

  return (
    <div className="border-t border-zinc-800/60">
      {/* Section label */}
      <div className="px-5 pt-6 pb-2">
        <span className="font-display text-[10px] font-700 uppercase tracking-[0.16em] text-zinc-500">Upcoming Schedule</span>
      </div>

      {/* Two-column layout: Seattle | Opponent */}
      <div className="grid grid-cols-2 divide-x divide-zinc-800/60">
        {/* Seattle column */}
        <div className="px-5 pb-4">
          <div className="flex items-center gap-2 pb-2.5 mb-1 border-b border-zinc-800/60">
            <TeamLogo src={seaLogoUrl} emoji={game.seattleTeam.emoji} abbr={game.seattleTeam.abbr} size={16} />
            <span className="font-display text-[11px] font-700 text-white truncate" style={{ color }}>{game.seattleTeam.abbr}</span>
          </div>
          {seaGames.length === 0
            ? <div className="font-display text-[12px] text-zinc-600 py-3">No upcoming</div>
            : seaGames.map((g, i) => <GameRow key={i} g={g} />)}
        </div>

        {/* Opponent column */}
        <div className="px-5 pb-4">
          <div className="flex items-center gap-2 pb-2.5 mb-1 border-b border-zinc-800/60">
            {game.opponent.logo
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={game.opponent.logo} alt={game.opponent.abbr} width={16} height={16} className="object-contain" />
              : null}
            <span className="font-display text-[11px] font-700 text-zinc-400 truncate">{game.opponent.abbr}</span>
          </div>
          {oppGames.length === 0
            ? <div className="font-display text-[12px] text-zinc-600 py-3">No upcoming</div>
            : oppGames.map((g, i) => <GameRow key={i} g={g} />)}
        </div>
      </div>
    </div>
  )
}
