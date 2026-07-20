"use client"
import { useState } from "react"
import { SEATTLE_TEAMS, getTeamLogoUrl } from "@/lib/teams"
import { ALL_PRO_TEAMS } from "@/lib/allProTeams"
import TeamLogo from "@/components/TeamLogo"

const SPORT_LABELS: Record<string, string> = {
  football: "Football", baseball: "Baseball", basketball: "Basketball",
  volleyball: "Volleyball", lacrosse: "Lacrosse", softball: "Softball",
  soccer: "Soccer", hockey: "Hockey",
}

function getCollegeGroupKey(teamId: string): string | null {
  if (teamId.startsWith("uw-")) return "uw"
  if (teamId.startsWith("wsu-")) return "wsu"
  if (teamId === "seattleu") return "seattleu"
  return null
}

interface Props {
  selectedTeamIds: string[]
  activeFilter: string
  onFilterChange: (id: string) => void
  teamClickCounts?: Record<string, number>
  recordClick?: (id: string) => void
  /** If provided, only teams in this set will be shown (e.g. teams with data) */
  teamsWithData?: Set<string>
}

function CollegeSportPicker({
  groupKey, availableTeams, activeFilter,
  onSelect, onSelectAll, onClose,
}: {
  groupKey: string
  availableTeams: typeof SEATTLE_TEAMS
  activeFilter: string
  onSelect: (id: string) => void
  onSelectAll: () => void
  onClose: () => void
}) {
  const representative = availableTeams[0]
  const school = groupKey === "uw" ? "Washington Huskies" : groupKey === "wsu" ? "WSU Cougars" : groupKey === "seattleu" ? "Seattle U" : groupKey
  const allActive = !availableTeams.some(t => t.id === activeFilter)

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div
        className="absolute left-0 z-50 mt-1 rounded-2xl overflow-hidden shadow-2xl animate-slide-down"
        style={{ background: "var(--surface)", border: "1px solid var(--border)", top: "100%", minWidth: "180px" }}
      >
        <div className="px-3 py-2.5 border-b border-white/[0.09] flex items-center gap-2">
          {representative && (
            <TeamLogo src={getTeamLogoUrl(representative)} emoji={representative.emoji} abbr={representative.abbr} size={20} />
          )}
          <span className="font-display text-[12px] font-800 text-white uppercase tracking-wide">{school}</span>
        </div>
        <div className="p-2.5 flex flex-wrap gap-1.5">
          <button
            onClick={onSelectAll}
            className="px-3 py-1.5 rounded-full text-[11px] font-700 font-display uppercase tracking-wide transition-all"
            style={{
              background: allActive ? "var(--accent)" : "var(--surface-2)",
              color: allActive ? "#08080f" : "#9ca3af",
              border: "1px solid rgba(255,255,255,0.1)",
            }}
          >
            All
          </button>
          {availableTeams.map(team => {
            const active = activeFilter === team.id
            return (
              <button
                key={team.id}
                onClick={() => onSelect(team.id)}
                className="px-3 py-1.5 rounded-full text-[11px] font-700 font-display uppercase tracking-wide transition-all"
                style={{
                  background: active ? team.primaryColor : "var(--surface-2)",
                  color: active ? "#fff" : "#9ca3af",
                  border: `1px solid ${active ? team.primaryColor : "rgba(255,255,255,0.1)"}`,
                }}
              >
                {SPORT_LABELS[team.sport] || team.sport}
              </button>
            )
          })}
        </div>
      </div>
    </>
  )
}

export default function TeamFilterBar({
  selectedTeamIds, activeFilter, onFilterChange,
  teamClickCounts = {}, recordClick,
}: Props) {
  const [collegePicker, setCollegePicker] = useState<string | null>(null)

  const getAggregatedClicks = (team: typeof SEATTLE_TEAMS[0]): number => {
    const gk = getCollegeGroupKey(team.id)
    if (!gk) return teamClickCounts[team.id] || 0
    return SEATTLE_TEAMS
      .filter(t => getCollegeGroupKey(t.id) === gk && selectedTeamIds.includes(t.id))
      .reduce((sum, t) => sum + (teamClickCounts[t.id] || 0), 0)
  }

  // Merge SEATTLE_TEAMS + ALL_PRO_TEAMS into a unified shape for the filter bar
  const allKnownTeams: typeof SEATTLE_TEAMS = [
    ...SEATTLE_TEAMS,
    ...ALL_PRO_TEAMS
      .filter(t => !SEATTLE_TEAMS.some(st => st.id === t.id))
      .map(t => ({
        id: t.id, name: t.name, shortName: t.shortName, abbr: t.abbr,
        sport: t.sport, league: t.league.toLowerCase(), espnId: t.espnId,
        primaryColor: t.primaryColor, secondaryColor: '#ffffff', emoji: '', logoUrl: t.logo,
      } as typeof SEATTLE_TEAMS[0])),
  ]

  const followedSorted = allKnownTeams
    .filter(t => selectedTeamIds.includes(t.id))
    .sort((a, b) => (getAggregatedClicks(b) - getAggregatedClicks(a)) || a.shortName.localeCompare(b.shortName))

  // Deduplicate: college schools show as one icon
  const filterItems = (() => {
    const seen = new Set<string>()
    return followedSorted.filter(t => {
      const key = getCollegeGroupKey(t.id) ?? (getTeamLogoUrl(t) || t.id)
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  })()

  const filterMatchIds = (filterId: string): string[] => {
    const item = allKnownTeams.find(t => t.id === filterId)
    if (!item) return [filterId]
    const gk = getCollegeGroupKey(filterId)
    if (gk) return allKnownTeams.filter(t => getCollegeGroupKey(t.id) === gk).map(t => t.id)
    const logoKey = getTeamLogoUrl(item) || filterId
    return allKnownTeams.filter(t => (getTeamLogoUrl(t) || t.id) === logoKey).map(t => t.id)
  }

  return (
    <div className="relative overflow-x-auto no-scrollbar px-4 pb-3 pt-1">
      <div className="flex gap-3 min-w-max">
        {/* ALL */}
        <button onClick={() => { onFilterChange("all"); setCollegePicker(null) }} className="flex-shrink-0">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center transition-all"
            style={{
              background: "#0c1b31",
              border: `2px solid ${activeFilter === "all" ? "#D95C17" : "rgba(217,92,23,0.45)"}`,
              boxShadow: activeFilter === "all" ? "0 0 10px rgba(217,92,23,0.35)" : "none",
            }}
          >
            <span className="font-display text-[11px] font-800 uppercase" style={{ color: "#ffffff" }}>All</span>
          </div>
        </button>

        {filterItems.map(team => {
          const gk = getCollegeGroupKey(team.id)
          const isCollege = !!gk
          const pickerOpen = isCollege && collegePicker === gk
          const isActive = isCollege
            ? filterMatchIds(team.id).includes(activeFilter) && activeFilter !== "all"
            : activeFilter === team.id
          const logoUrl = getTeamLogoUrl(team)
          const collegeTeams = isCollege
            ? SEATTLE_TEAMS.filter(t => getCollegeGroupKey(t.id) === gk && selectedTeamIds.includes(t.id))
            : []

          return (
            <div key={team.id} className="relative flex-shrink-0">
              <button
                onClick={() => {
                  if (isCollege) {
                    setCollegePicker(pickerOpen ? null : gk)
                  } else {
                    setCollegePicker(null)
                    if (isActive) {
                      onFilterChange("all")
                    } else {
                      onFilterChange(team.id)
                      recordClick?.(team.id)
                    }
                  }
                }}
              >
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center transition-all overflow-hidden p-1 relative"
                  style={{
                    background: isActive ? `${team.primaryColor}25` : "var(--surface-2)",
                    border: `2px solid ${isActive ? "#D95C17" : pickerOpen ? "rgba(217,92,23,0.5)" : "rgba(255,255,255,0.1)"}`,
                    boxShadow: isActive ? "0 0 10px rgba(217,92,23,0.4)" : "none",
                    opacity: !isActive && !pickerOpen && activeFilter !== "all" ? 0.4 : 1,
                  }}
                >
                  <TeamLogo src={logoUrl} emoji={team.emoji} abbr={team.abbr} size={32} />
                  {isCollege && <span className="absolute bottom-0.5 right-0.5 text-[8px] text-white/60">▾</span>}
                </div>
              </button>

              {pickerOpen && gk && (
                <CollegeSportPicker
                  groupKey={gk}
                  availableTeams={collegeTeams}
                  activeFilter={activeFilter}
                  onSelect={(id) => { onFilterChange(id); setCollegePicker(null); recordClick?.(id) }}
                  onSelectAll={() => { onFilterChange("all"); setCollegePicker(null) }}
                  onClose={() => setCollegePicker(null)}
                />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export { getCollegeGroupKey }
