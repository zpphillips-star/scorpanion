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
    <div className="px-4 py-5 border-t border-white/5">
      <div className="font-display text-[10px] font-700 uppercase tracking-widest text-zinc-700 mb-3">Upcoming Schedule</div>
      <div className="grid grid-cols-2 gap-4">
        {[0, 1].map(i => (
          <div key={i} className="space-y-2">
            <div className="h-3 w-20 rounded bg-white/8 animate-pulse" />
            {[0, 1, 2].map(j => <div key={j} className="h-8 rounded-lg bg-white/5 animate-pulse" />)}
          </div>
        ))}
      </div>
    </div>
  )

  if (seaGames.length === 0 && oppGames.length === 0) return null

  const seaLogoUrl = getTeamLogoUrl(game.seattleTeam)
  const maxRows = Math.max(seaGames.length, oppGames.length)
  const color = game.seattleTeam.primaryColor

  return (
    <div className="px-4 pb-6 border-t border-white/8 mt-1">
      {/* Section header */}
      <div className="flex items-center gap-3 pt-5 pb-4">
        <span className="font-display text-[15px] font-800 text-zinc-200 uppercase tracking-wider">Upcoming Schedule</span>
        <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.12)" }} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* Seattle column */}
        <div>
          {/* Column header */}
          <div className="flex items-center gap-2 mb-3 pb-2.5" style={{ borderBottom: `2px solid ${color}40` }}>
            <TeamLogo src={seaLogoUrl} emoji={game.seattleTeam.emoji} abbr={game.seattleTeam.abbr} size={20} />
            <span className="font-display text-[14px] font-700 text-white truncate">{game.seattleTeam.shortName}</span>
          </div>
          {seaGames.length === 0 ? (
            <div className="text-[13px] text-zinc-600 py-2">No upcoming games</div>
          ) : (
            <div className="space-y-3.5">
              {seaGames.map((g, i) => (
                <div key={i} className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="font-display text-[12px] font-600 text-zinc-500 flex-shrink-0">{g.isHome ? "vs" : "@"}</span>
                    {g.oppLogo
                      ? <img src={g.oppLogo} alt={g.opponent} width={16} height={16} className="object-contain flex-shrink-0" />
                      : null
                    }
                    <span className="font-display text-[14px] font-700 text-white truncate">{g.opponent}</span>
                  </div>
                  <span className="font-display text-[12px] font-600 text-zinc-500">{fmtShortDate(g.date)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Opponent column */}
        <div>
          {/* Column header */}
          <div className="flex items-center gap-2 mb-3 pb-2.5" style={{ borderBottom: "2px solid rgba(255,255,255,0.1)" }}>
            {game.opponent.logo
              ? <img src={game.opponent.logo} alt={game.opponent.abbr} width={20} height={20} className="object-contain" />
              : <div className="w-5 h-5 rounded-full bg-white/10" />
            }
            <span className="font-display text-[14px] font-700 text-zinc-300 truncate">{game.opponent.shortName || game.opponent.name}</span>
          </div>
          {oppGames.length === 0 ? (
            <div className="text-[13px] text-zinc-600 py-2">No upcoming games</div>
          ) : (
            <div className="space-y-3.5">
              {oppGames.map((g, i) => (
                <div key={i} className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="font-display text-[12px] font-600 text-zinc-500 flex-shrink-0">{g.isHome ? "vs" : "@"}</span>
                    {g.oppLogo
                      ? <img src={g.oppLogo} alt={g.opponent} width={16} height={16} className="object-contain flex-shrink-0" />
                      : null
                    }
                    <span className="font-display text-[14px] font-600 text-zinc-300 truncate">{g.opponent}</span>
                  </div>
                  <span className="font-display text-[12px] font-600 text-zinc-500">{fmtShortDate(g.date)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
