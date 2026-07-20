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
    <div className="border-t border-zinc-600/55">
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
    <div className="flex items-center gap-3 py-3.5 border-b border-zinc-600/50 last:border-0">
      <span className="font-display text-[12px] font-600 text-zinc-500 w-5 text-center flex-shrink-0">
        {g.isHome ? "vs" : "@"}
      </span>
      {g.oppLogo
        // eslint-disable-next-line @next/next/no-img-element
        ? <img src={g.oppLogo} alt={g.opponent} width={20} height={20} className="object-contain flex-shrink-0" />
        : <div className="w-5 h-5 flex-shrink-0" />}
      <span className="font-display text-[14px] font-600 text-zinc-200 flex-1 truncate">{g.opponent}</span>
      <span className="font-display text-[12px] text-zinc-500 flex-shrink-0">{fmtShortDate(g.date)}</span>
    </div>
  )

  return (
    <div className="mt-6 pb-6">
      {/* Section header — WC style */}
      <div className="flex items-center gap-2 mb-5">
        <div className="flex-1 h-px bg-zinc-700/50" />
        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Upcoming Schedule</span>
        <div className="flex-1 h-px bg-zinc-700/50" />
      </div>

      {/* Two-column layout: Seattle | Opponent */}
      <div className="grid grid-cols-2 divide-x divide-zinc-800/60">
        {/* Seattle column */}
        <div>
          <div className="flex items-center gap-2 mb-3 pb-2.5 border-b border-zinc-700/60">
            <TeamLogo src={seaLogoUrl} emoji={game.seattleTeam.emoji} abbr={game.seattleTeam.abbr} size={18} />
            <span className="text-[12px] font-semibold text-white truncate">{game.seattleTeam.shortName}</span>
          </div>
          {seaGames.length === 0 ? (
            <div className="text-[12px] text-zinc-600 py-2">No upcoming games</div>
          ) : (
            <div>
              {seaGames.map((g, i) => (
                <div key={i} className={`py-2.5 ${i < seaGames.length - 1 ? "border-b border-zinc-600/50" : ""}`}>
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-[11px] text-zinc-500 flex-shrink-0 w-4">{g.isHome ? "vs" : "@"}</span>
                    {g.oppLogo
                      ? <img src={g.oppLogo} alt={g.opponent} width={20} height={20} className="object-contain flex-shrink-0" />
                      : null
                    }
                    <span className="text-[12px] font-semibold text-white truncate">{g.opponent}</span>
                  </div>
                  <div className="text-[11px] text-zinc-500 mt-0.5 pl-5">{fmtShortDate(g.date)}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Opponent column */}
        <div>
          <div className="flex items-center gap-2 mb-3 pb-2.5 border-b border-zinc-700/60">
            {game.opponent.logo
              ? <img src={game.opponent.logo} alt={game.opponent.abbr} width={18} height={18} className="object-contain" />
              : <div className="w-4 h-4 rounded-full bg-white/10" />
            }
            <span className="text-[12px] font-semibold text-white truncate">{game.opponent.shortName || game.opponent.name}</span>
          </div>
          {oppGames.length === 0 ? (
            <div className="text-[12px] text-zinc-600 py-2">No upcoming games</div>
          ) : (
            <div>
              {oppGames.map((g, i) => (
                <div key={i} className={`py-2.5 ${i < oppGames.length - 1 ? "border-b border-zinc-600/50" : ""}`}>
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-[11px] text-zinc-500 flex-shrink-0 w-4">{g.isHome ? "vs" : "@"}</span>
                    {g.oppLogo
                      ? <img src={g.oppLogo} alt={g.opponent} width={20} height={20} className="object-contain flex-shrink-0" />
                      : null
                    }
                    <span className="text-[12px] font-semibold text-white truncate">{g.opponent}</span>
                  </div>
                  <div className="text-[11px] text-zinc-500 mt-0.5 pl-5">{fmtShortDate(g.date)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
