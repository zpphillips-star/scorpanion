"use client"
import { useState } from "react"
import { Game } from "@/lib/types"
import { getTeamLogoUrl } from "@/lib/teams"
import TeamLogo from "./TeamLogo"
import GameDetailSheet from "./GameDetailSheet"
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

function RecentCard({ game, onClick }: { game: Game; onClick: () => void }) {
  const seattleWon = (game.seattleScore ?? 0) > (game.opponentScore ?? 0)
  const seattleLost = (game.seattleScore ?? 0) < (game.opponentScore ?? 0)
  const color = game.seattleTeam.primaryColor
  const resultColor = seattleWon ? "#34d399" : seattleLost ? "#f87171" : "#9ca3af"

  return (
    <button
      onClick={onClick}
      className="flex-shrink-0 w-[148px] rounded-2xl overflow-hidden text-left active:scale-95 transition-transform"
      style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}
    >
      <div className="h-1" style={{ background: `linear-gradient(to right, ${color}, ${color}44)` }} />
      <div className="px-3 pt-2.5 pb-3">
        <div className="flex items-center justify-between mb-2.5">
          <span className="font-display text-[12px] font-800 uppercase tracking-wide" style={{ color: resultColor }}>
            {seattleWon ? "W" : seattleLost ? "L" : "T"}
          </span>
          <span className="text-[10px] text-zinc-600">{fmtDate(game.kickoff)}</span>
        </div>
        <div className="flex items-center justify-between gap-1.5">
          <div className="flex flex-col items-center gap-1 flex-1">
            <TeamLogo src={getTeamLogoUrl(game.seattleTeam)} emoji={game.seattleTeam.emoji} abbr={game.seattleTeam.abbr} size={26} />
            <span className={`font-display text-[14px] font-800 tabular-nums ${seattleLost ? "text-zinc-500" : "text-white"}`}>
              {game.seattleScore ?? "–"}
            </span>
          </div>
          <span className="font-display text-[10px] text-zinc-700 font-600 self-center pb-3">–</span>
          <div className="flex flex-col items-center gap-1 flex-1">
            <TeamLogo src={game.opponent.logo} emoji="🏟️" abbr={game.opponent.abbr} size={26} />
            <span className={`font-display text-[14px] font-800 tabular-nums ${seattleWon ? "text-zinc-500" : "text-white"}`}>
              {game.opponentScore ?? "–"}
            </span>
          </div>
        </div>
        <div className="flex items-center justify-between mt-2">
          <span className="text-[10px] text-zinc-600 truncate flex-1">vs {game.opponent.shortName || game.opponent.abbr}</span>
          <span className="text-[9px] text-zinc-700 flex-shrink-0 ml-1">›</span>
        </div>
      </div>
    </button>
  )
}

interface Props {
  games: Game[]
  label?: string
  sublabel?: string
}

export default function HorizontalRecentResults({ games, label = "Recent Results", sublabel = "Last 3 days" }: Props) {
  const [selected, setSelected] = useState<Game | null>(null)

  if (games.length === 0) return null

  return (
    <>
      <div className="mt-4">
        <div className="flex items-center gap-3 px-4 mb-3">
          <span className="font-display text-[13px] font-700 text-zinc-400 uppercase tracking-widest">{label}</span>
          <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
          <span className="font-display text-[10px] text-zinc-600 uppercase tracking-wider">{sublabel}</span>
        </div>
        <div className="overflow-x-auto no-scrollbar px-4">
          <div className="flex gap-3 min-w-max pb-1">
            {games.map(g => (
              <RecentCard key={g.id} game={g} onClick={() => setSelected(g)} />
            ))}
          </div>
        </div>
      </div>

      {selected && (
        <GameDetailSheet game={selected} onClose={() => setSelected(null)} />
      )}
    </>
  )
}
