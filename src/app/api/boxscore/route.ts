import { NextResponse } from "next/server"

// ── Server-side in-memory cache ───────────────────────────────────────────────
// Persists within the same serverless warm-start instance.
// Key: "eventId:league"  Value: the full JSON we previously returned
const bsCache = new Map<string, Record<string, unknown>>()

const SPORT_PATH: Record<string, string> = {
  mlb: "baseball/mlb",
  nfl: "football/nfl",
  nhl: "hockey/nhl",
  nba: "basketball/nba",
  wnba: "basketball/wnba",
  "usa.1": "soccer/usa.1",
  mls: "soccer/usa.1",
  "usa.nwsl": "soccer/usa.nwsl",
  "college-football": "football/college-football",
  "mens-college-basketball": "basketball/mens-college-basketball",
  "womens-college-basketball": "basketball/womens-college-basketball",
}

// ── WHL boxscore via leaguestat.com ──────────────────────────────────────────
const WHL_LOGO_BASE = "https://assets.leaguestat.com/whl/logos"
const WHL_BASE = "https://cluster.leaguestat.com/feed/?feed=modulekit&key=41b145a848f4bd67&client_code=whl&fmt=json&lang=en"

async function fetchWHLBoxScore(gameId: string): Promise<Record<string, unknown> | null> {
  const url = `${WHL_BASE}&view=gameSummary&game_id=${gameId}`
  const res = await fetch(url, { next: { revalidate: 60 } })
  if (!res.ok) return null
  const data = await res.json()

  const game: any = data?.SiteKit?.Game?.[0]
  if (!game) return null

  const homeId   = String(game.home_team   ?? "")
  const visitorId = String(game.visiting_team ?? "")
  const homeAbbr   = game.home_team_code    ?? "HOME"
  const visitorAbbr = game.visiting_team_code ?? "AWAY"
  const homeLogo    = `${WHL_LOGO_BASE}/${homeId}.png`
  const visitorLogo = `${WHL_LOGO_BASE}/${visitorId}.png`

  // Parse per-period goals — HockeyTech wraps these in Periods.home[] / Periods.visitor[]
  // or sometimes under ByPeriod; be defensive about both shapes.
  const periodsSrc: any = game.Periods ?? game.ByPeriod ?? {}
  const homePeriods: any[]    = Array.isArray(periodsSrc.home)    ? periodsSrc.home
    : Array.isArray(periodsSrc.Home)    ? periodsSrc.Home    : []
  const visitorPeriods: any[] = Array.isArray(periodsSrc.visitor) ? periodsSrc.visitor
    : Array.isArray(periodsSrc.Visitor) ? periodsSrc.Visitor : []

  const numPeriods = Math.max(3, homePeriods.length, visitorPeriods.length)
  const homeGoals: number[]    = []
  const visitorGoals: number[] = []
  for (let i = 0; i < numPeriods; i++) {
    homeGoals.push(   Number(homePeriods[i]?.goals    ?? homePeriods[i]?.goal_count    ?? 0))
    visitorGoals.push(Number(visitorPeriods[i]?.goals ?? visitorPeriods[i]?.goal_count ?? 0))
  }

  const periodLabels: string[] = numPeriods <= 3
    ? ["P1", "P2", "P3"].slice(0, numPeriods)
    : ["P1", "P2", "P3", ...Array.from({ length: numPeriods - 3 }, (_, i) =>
        i === 0 ? "OT" : `OT${i + 1}`)]

  const homeScore    = Number(game.home_goal_count    ?? 0)
  const visitorScore = Number(game.visiting_goal_count ?? 0)

  const linescores = [
    { teamId: visitorId, abbr: visitorAbbr, logo: visitorLogo, homeAway: "away",
      score: visitorScore, linescores: visitorGoals, record: "" },
    { teamId: homeId,    abbr: homeAbbr,    logo: homeLogo,    homeAway: "home",
      score: homeScore,   linescores: homeGoals,    record: "" },
  ]

  const shotsOnGoal = [
    { teamId: visitorId, abbr: visitorAbbr, value: String(game.visiting_shots ?? "–") },
    { teamId: homeId,    abbr: homeAbbr,    value: String(game.home_shots    ?? "–") },
  ]

  return {
    sportType: "hockey", periodLabels, linescores, stats: [], keyPlays: [],
    currentPeriod: null, pitchers: null, topScorers: [], shotsOnGoal,
    isShootout: false, goalScorers: [],
  }
}

// ── PWHL boxscore via hockeytech.com ─────────────────────────────────────────
const PWHL_LOGO_BASE = "https://lscluster.hockeytech.com/img/pwhl"
const PWHL_BASE = "https://lscluster.hockeytech.com/feed/index.php?feed=modulekit&key=446521baf8c38984&client_code=pwhl&fmt=json"

async function fetchPWHLBoxScore(gameId: string): Promise<Record<string, unknown> | null> {
  const url = `${PWHL_BASE}&view=gameSummary&game_id=${gameId}`
  const res = await fetch(url, { next: { revalidate: 60 } })
  if (!res.ok) return null
  const data = await res.json()

  const game: any = data?.SiteKit?.Game?.[0]
  if (!game) return null

  const homeId    = String(game.home_team    ?? "")
  const visitorId = String(game.visiting_team ?? "")
  const homeAbbr   = game.home_team_code    ?? "HOME"
  const visitorAbbr = game.visiting_team_code ?? "AWAY"
  const homeLogo    = `${PWHL_LOGO_BASE}/${homeId}.png`
  const visitorLogo = `${PWHL_LOGO_BASE}/${visitorId}.png`

  const periodsSrc: any = game.Periods ?? game.ByPeriod ?? {}
  const homePeriods: any[]    = Array.isArray(periodsSrc.home)    ? periodsSrc.home
    : Array.isArray(periodsSrc.Home)    ? periodsSrc.Home    : []
  const visitorPeriods: any[] = Array.isArray(periodsSrc.visitor) ? periodsSrc.visitor
    : Array.isArray(periodsSrc.Visitor) ? periodsSrc.Visitor : []

  const numPeriods = Math.max(3, homePeriods.length, visitorPeriods.length)
  const homeGoals: number[]    = []
  const visitorGoals: number[] = []
  for (let i = 0; i < numPeriods; i++) {
    homeGoals.push(   Number(homePeriods[i]?.goals    ?? homePeriods[i]?.goal_count    ?? 0))
    visitorGoals.push(Number(visitorPeriods[i]?.goals ?? visitorPeriods[i]?.goal_count ?? 0))
  }

  const periodLabels: string[] = numPeriods <= 3
    ? ["P1", "P2", "P3"].slice(0, numPeriods)
    : ["P1", "P2", "P3", ...Array.from({ length: numPeriods - 3 }, (_, i) =>
        i === 0 ? "OT" : `OT${i + 1}`)]

  const homeScore    = Number(game.home_goal_count    ?? 0)
  const visitorScore = Number(game.visiting_goal_count ?? 0)

  const linescores = [
    { teamId: visitorId, abbr: visitorAbbr, logo: visitorLogo, homeAway: "away",
      score: visitorScore, linescores: visitorGoals, record: "" },
    { teamId: homeId,    abbr: homeAbbr,    logo: homeLogo,    homeAway: "home",
      score: homeScore,   linescores: homeGoals,    record: "" },
  ]

  const shotsOnGoal = [
    { teamId: visitorId, abbr: visitorAbbr, value: String(game.visiting_shots ?? "–") },
    { teamId: homeId,    abbr: homeAbbr,    value: String(game.home_shots    ?? "–") },
  ]

  return {
    sportType: "hockey", periodLabels, linescores, stats: [], keyPlays: [],
    currentPeriod: null, pitchers: null, topScorers: [], shotsOnGoal,
    isShootout: false, goalScorers: [],
  }
}

// ── MLB official boxscore via statsapi.mlb.com ───────────────────────────────
async function fetchMLBBoxScore(gamePk: string): Promise<Record<string, unknown> | null> {
  const url = `https://statsapi.mlb.com/api/v1.1/game/${gamePk}/feed/live`
  // Short revalidation so live games stay fresh; edge cache avoids cold-start latency
  const res = await fetch(url, { next: { revalidate: 8 } })
  if (!res.ok) return null
  const feed = await res.json()

  const gameData = feed.gameData
  const liveData = feed.liveData
  if (!gameData || !liveData) return null
  // Guard: MLB Stats API returns gamePk=0 / empty teams for unknown IDs (e.g. ESPN IDs).
  // Return null so the ESPN fallback can take over.
  if (!feed.gamePk || feed.gamePk <= 0 || !gameData.teams?.away?.id || !gameData.teams?.home?.id) return null

  const linescore = liveData.linescore ?? {}
  const decisions = liveData.decisions ?? {}

  // Status
  const state: string = gameData.status?.abstractGameState ?? ''
  const isLive = state === 'Live'

  // Teams — away first, home second (standard baseball convention)
  const awayTeam = gameData.teams.away
  const homeTeam = gameData.teams.home

  // Build per-inning runs for each team
  const innings: any[] = linescore.innings ?? []
  const numInnings = Math.max(9, innings.length)

  // Pad inning arrays to at least 9
  const awayRuns: number[] = []
  const homeRuns: number[] = []
  for (let i = 0; i < numInnings; i++) {
    const ing = innings[i]
    awayRuns.push(ing?.away?.runs ?? (ing ? 0 : 0))
    // Home team may not have batted in the bottom of the final inning
    homeRuns.push(ing?.home?.runs ?? undefined)
  }

  const awayTotals = linescore.teams?.away ?? {}
  const homeTotals = linescore.teams?.home ?? {}

  const linescores = [
    {
      teamId: String(awayTeam.id),
      abbr: awayTeam.abbreviation,
      logo: `https://a.espncdn.com/i/teamlogos/mlb/500/${(awayTeam.fileCode ?? awayTeam.abbreviation).toLowerCase()}.png`,
      homeAway: "away",
      score: awayTotals.runs ?? 0,
      linescores: awayRuns,
      record: awayTeam.record
        ? `${awayTeam.record.wins}-${awayTeam.record.losses}`
        : "",
      hits: awayTotals.hits,
      errors: awayTotals.errors,
    },
    {
      teamId: String(homeTeam.id),
      abbr: homeTeam.abbreviation,
      logo: `https://a.espncdn.com/i/teamlogos/mlb/500/${(homeTeam.fileCode ?? homeTeam.abbreviation).toLowerCase()}.png`,
      homeAway: "home",
      score: homeTotals.runs ?? 0,
      linescores: homeRuns,
      record: homeTeam.record
        ? `${homeTeam.record.wins}-${homeTeam.record.losses}`
        : "",
      hits: homeTotals.hits,
      errors: homeTotals.errors,
    },
  ]

  // Stats: inject hits and errors as labelled statistics so BoxScore can display them
  const stats = [
    {
      teamId: String(awayTeam.id),
      abbr: awayTeam.abbreviation,
      statistics: [
        { name: "hits",   label: "H", displayValue: String(awayTotals.hits   ?? 0) },
        { name: "errors", label: "E", displayValue: String(awayTotals.errors ?? 0) },
      ],
    },
    {
      teamId: String(homeTeam.id),
      abbr: homeTeam.abbreviation,
      statistics: [
        { name: "hits",   label: "H", displayValue: String(homeTotals.hits   ?? 0) },
        { name: "errors", label: "E", displayValue: String(homeTotals.errors ?? 0) },
      ],
    },
  ]

  // Period labels: 1–9 minimum, extend for extra innings
  const periodLabels = Array.from({ length: numInnings }, (_, i) => String(i + 1))

  // Current period: encode as half-inning number matching ESPN convention
  // (1=top1st, 2=bot1st, 3=top2nd, … so isCurrentCol in BoxScore works correctly)
  let currentPeriod: number | null = null
  if (isLive) {
    const inning: number = linescore.currentInning ?? 1
    const isTop: boolean = linescore.isTopInning ?? true
    currentPeriod = isTop ? (inning - 1) * 2 + 1 : inning * 2
  }

  // Pitchers from decisions
  const pickPitcher = (src: any) => {
    if (!src) return null
    const name = src.fullName ?? src.shortName ?? null
    if (!name) return null
    return { name, line: "" }
  }
  const wp = pickPitcher(decisions.winner)
  const lp = pickPitcher(decisions.loser)
  const sp = pickPitcher(decisions.save)
  const pitchers = (wp || lp || sp)
    ? { winning: wp, losing: lp, saving: sp }
    : null

  return {
    sportType: "baseball",
    periodLabels,
    linescores,
    stats,
    keyPlays: [],
    currentPeriod,
    pitchers,
    topScorers: [],
    shotsOnGoal: [],
    isShootout: false,
    goalScorers: [],
  }
}

// ── NHL official boxscore via api-web.nhle.com ───────────────────────────────
async function fetchNHLBoxScore(gameId: string): Promise<Record<string, unknown> | null> {
  // Use the landing endpoint — it has summary.scoring with per-period goal breakdown
  const url = `https://api-web.nhle.com/v1/gamecenter/${gameId}/landing`
  const res = await fetch(url, { next: { revalidate: 30 } })
  if (!res.ok) return null
  const data = await res.json()

  const awayTeam = data.awayTeam
  const homeTeam = data.homeTeam
  if (!awayTeam || !homeTeam) return null

  const gameState: string = data.gameState ?? ''
  const isLive = gameState === 'LIVE' || gameState === 'CRIT'

  // Period count from top-level periodDescriptor
  const totalPeriods: number = data.periodDescriptor?.number ?? 3
  const lastPeriodType: string = data.gameOutcome?.lastPeriodType ?? data.periodDescriptor?.periodType ?? 'REG'
  const isShootout = lastPeriodType === 'SO'
  const hasOT = lastPeriodType === 'OT' || lastPeriodType === 'SO'

  // Build per-period goals from summary.scoring
  // scoring[] has one entry per period; each entry has periodDescriptor.number and goals[]
  const scoring: any[] = data.summary?.scoring ?? []

  // Map: periodNumber → { away: count, home: count }
  const periodGoals = new Map<number, { away: number; home: number }>()
  for (let p = 1; p <= totalPeriods; p++) {
    periodGoals.set(p, { away: 0, home: 0 })
  }

  for (const periodEntry of scoring) {
    const pNum: number = periodEntry.periodDescriptor?.number ?? 0
    if (!periodGoals.has(pNum)) periodGoals.set(pNum, { away: 0, home: 0 })
    const pg = periodGoals.get(pNum)!
    for (const goal of periodEntry.goals ?? []) {
      const abbrev: string = goal.teamAbbrev?.default ?? ''
      if (abbrev === awayTeam.abbrev) pg.away++
      else if (abbrev === homeTeam.abbrev) pg.home++
    }
  }

  // Build ordered period arrays (periods 1, 2, 3, then OT if applicable)
  const orderedPeriods = Array.from({ length: totalPeriods }, (_, i) => i + 1)
  const awayPerPeriod = orderedPeriods.map(p => periodGoals.get(p)?.away ?? 0)
  const homePerPeriod = orderedPeriods.map(p => periodGoals.get(p)?.home ?? 0)

  // Period labels
  let periodLabels: string[]
  if (totalPeriods <= 3) {
    periodLabels = ["P1", "P2", "P3"].slice(0, totalPeriods)
  } else if (isShootout) {
    periodLabels = ["P1", "P2", "P3", "OT", "SO"].slice(0, totalPeriods)
  } else if (hasOT) {
    periodLabels = ["P1", "P2", "P3", ...Array.from({ length: totalPeriods - 3 }, (_, i) => `OT${i > 0 ? i + 1 : ''}`)]
  } else {
    periodLabels = Array.from({ length: totalPeriods }, (_, i) => i < 3 ? `P${i + 1}` : `OT`)
  }

  const awayRecord = awayTeam.record ? `${awayTeam.record.wins}-${awayTeam.record.losses}-${awayTeam.record.otLosses ?? 0}` : ""
  const homeRecord = homeTeam.record ? `${homeTeam.record.wins}-${homeTeam.record.losses}-${homeTeam.record.otLosses ?? 0}` : ""

  const linescores = [
    {
      teamId: String(awayTeam.id),
      abbr: awayTeam.abbrev,
      logo: awayTeam.darkLogo ?? awayTeam.logo ?? "",
      homeAway: "away",
      score: awayTeam.score ?? 0,
      linescores: awayPerPeriod,
      record: awayRecord,
    },
    {
      teamId: String(homeTeam.id),
      abbr: homeTeam.abbrev,
      logo: homeTeam.darkLogo ?? homeTeam.logo ?? "",
      homeAway: "home",
      score: homeTeam.score ?? 0,
      linescores: homePerPeriod,
      record: homeRecord,
    },
  ]

  // Shots on goal
  const shotsOnGoal = [
    { teamId: String(awayTeam.id), abbr: awayTeam.abbrev, value: String(awayTeam.sog ?? "–") },
    { teamId: String(homeTeam.id), abbr: homeTeam.abbrev, value: String(homeTeam.sog ?? "–") },
  ]

  // Stats (goals + shots on goal as named stats so BoxScore displays them)
  const stats = [
    {
      teamId: String(awayTeam.id),
      abbr: awayTeam.abbrev,
      statistics: [
        { name: "goals",         label: "G",   displayValue: String(awayTeam.score ?? 0) },
        { name: "shotsOnGoal",   label: "SOG", displayValue: String(awayTeam.sog  ?? "–") },
      ],
    },
    {
      teamId: String(homeTeam.id),
      abbr: homeTeam.abbrev,
      statistics: [
        { name: "goals",         label: "G",   displayValue: String(homeTeam.score ?? 0) },
        { name: "shotsOnGoal",   label: "SOG", displayValue: String(homeTeam.sog  ?? "–") },
      ],
    },
  ]

  // currentPeriod for live NHL (0-based column index won't work — BoxScore expects period-1)
  const currentPeriod = isLive ? (data.periodDescriptor?.number ?? null) : null

  return {
    sportType: "hockey",
    periodLabels,
    linescores,
    stats,
    keyPlays: [],
    currentPeriod,
    pitchers: null,
    topScorers: [],
    shotsOnGoal,
    isShootout,
    goalScorers: [],
  }
}

// ── ESPN boxscore (fallback for all other leagues) ────────────────────────────
async function fetchESPNBoxScore(
  eventId: string,
  league: string,
  sportPath: string,
  sportType: string,
  cacheKey: string,
): Promise<Record<string, unknown> | null> {
  const url = `https://site.api.espn.com/apis/site/v2/sports/${sportPath}/summary?event=${eventId}`
  const res = await fetch(url, { next: { revalidate: 60 } })
  if (!res.ok) {
    const cached = bsCache.get(cacheKey)
    return cached ?? null
  }
  const data = await res.json()

  const comp = data.header?.competitions?.[0]
  const competitors: any[] = comp?.competitors ?? []
  const currentPeriod: number | null = comp?.status?.period ?? null
  const isLive = comp?.status?.type?.state === "in"

  const linescores = competitors.map((c: any) => {
    const inningData: any[] = c.linescores ?? []
    const inningValues = inningData.map((l: any) =>
      l.value !== undefined && l.value !== null ? l.value : parseFloat(l.displayValue ?? "0")
    )
    const totalHits = sportType === "baseball"
      ? inningData.reduce((sum: number, l: any) => sum + (typeof l.hits === "number" ? l.hits : 0), 0)
      : undefined
    const totalErrors = sportType === "baseball"
      ? inningData.reduce((sum: number, l: any) => sum + (typeof l.errors === "number" ? l.errors : 0), 0)
      : undefined
    return {
      teamId: c.team?.id,
      abbr: c.team?.abbreviation,
      logo: c.team?.logos?.[0]?.href || c.team?.logo || "",
      homeAway: c.homeAway,
      score: parseFloat(c.score ?? "0"),
      linescores: inningValues,
      record: c.record?.[0]?.summary ?? "",
      hits: totalHits,
      errors: totalErrors,
    }
  })

  const bsTeams: any[] = data.boxscore?.teams ?? []
  const stats = bsTeams.map((t: any) => {
    const baseStats = (t.statistics ?? []).slice(0, 12).map((s: any) => ({
      name: s.name,
      label: s.label ?? s.name,
      displayValue: s.displayValue,
    }))
    if (sportType === "baseball") {
      const comp = competitors.find((c: any) => c.team?.id === t.team?.id)
      if (comp) {
        if (comp.hits !== undefined && comp.hits !== null)
          baseStats.push({ name: "hits", label: "H", displayValue: String(comp.hits) })
        if (comp.errors !== undefined && comp.errors !== null)
          baseStats.push({ name: "errors", label: "E", displayValue: String(comp.errors) })
      }
    }
    return {
      teamId: t.team?.id,
      abbr: t.team?.abbreviation,
      statistics: baseStats,
    }
  })

  let periodLabels: string[] = []
  const maxPeriods = Math.max(...linescores.map(l => l.linescores.length), 0)
  if (sportType === "baseball") {
    const totalInnings = Math.max(9, maxPeriods)
    periodLabels = Array.from({ length: totalInnings }, (_, i) => String(i + 1))
  } else if (sportType === "football") {
    // Always show all 4 quarters even mid-game — ESPN only returns completed periods
    // in linescores arrays, so maxPeriods mid-game could be 1 or 2. Floor at 4.
    const totalQtrs = Math.max(4, maxPeriods)
    periodLabels = ["Q1", "Q2", "Q3", "Q4", "OT", "OT2"].slice(0, totalQtrs)
  } else if (sportType === "hockey") {
    periodLabels = ["P1", "P2", "P3", "OT", "SO"].slice(0, Math.max(3, maxPeriods))
  } else if (sportType === "basketball") {
    // Always show all 4 quarters even mid-game — same ESPN linescore issue as football
    const totalQtrs = Math.max(4, maxPeriods)
    periodLabels = ["Q1", "Q2", "Q3", "Q4", "OT", "OT2", "OT3"].slice(0, totalQtrs)
  } else if (sportType === "soccer") {
    periodLabels = ["1H", "2H", "ET1", "ET2"].slice(0, Math.max(2, maxPeriods))
  } else {
    periodLabels = Array.from({ length: maxPeriods }, (_, i) => String(i + 1))
  }

  const keyPlays = (data.keyPlays ?? data.plays ?? [])
    .filter((p: any) => p.scoringPlay || p.type?.text?.includes("Score"))
    .slice(-5)
    .map((p: any) => ({
      text: p.text ?? p.alternativeText ?? "",
      period: p.period?.displayValue ?? "",
      clock: p.clock?.displayValue ?? "",
      awayScore: p.awayScore,
      homeScore: p.homeScore,
    }))

  let pitchers: {
    winning: { name: string; line: string } | null
    losing:  { name: string; line: string } | null
    saving:  { name: string; line: string } | null
  } | null = null

  if (sportType === "baseball") {
    const pickPitcher = (src: any) => {
      if (!src) return null
      const name = src.athlete?.displayName ?? src.athlete?.shortName ?? null
      if (!name) return null
      const line = src.statistics?.[0]?.displayValue ?? ""
      return { name, line }
    }
    const wp = pickPitcher(data.winningPitcher)
    const lp = pickPitcher(data.losingPitcher)
    const sp = pickPitcher(data.savingPitcher)
    if (wp || lp || sp) pitchers = { winning: wp, losing: lp, saving: sp }
  }

  let topScorers: { teamId: string; abbr: string; name: string; pts: string; reb: string; ast: string }[] = []
  if (sportType === "basketball") {
    const bsPlayers: any[] = data.boxscore?.players ?? []
    // Helper: find index by multiple possible key names (ESPN varies by league)
    const findIdx = (keys: string[], ...names: string[]) => {
      for (const n of names) {
        const i = keys.findIndex((k: string) => k.toLowerCase() === n.toLowerCase())
        if (i >= 0) return i
      }
      return -1
    }
    topScorers = bsPlayers.flatMap((teamEntry: any) => {
      const teamId: string = teamEntry.team?.id ?? ""
      const abbr: string = teamEntry.team?.abbreviation ?? ""
      const statGroup = teamEntry.statistics?.[0]
      const keys: string[] = statGroup?.keys ?? []
      const athletes: any[] = statGroup?.athletes ?? []
      const ptsIdx = findIdx(keys, "pts", "points")
      const rebIdx = findIdx(keys, "reb", "rebounds", "totalRebounds")
      const astIdx = findIdx(keys, "ast", "assists")
      return athletes
        .filter((a: any) => a.athlete && Array.isArray(a.stats) && a.stats.length > 0)
        .map((a: any) => ({
          teamId, abbr,
          name: a.athlete?.shortName ?? a.athlete?.displayName ?? "",
          pts: ptsIdx >= 0 ? (a.stats[ptsIdx] ?? "–") : "–",
          reb: rebIdx >= 0 ? (a.stats[rebIdx] ?? "–") : "–",
          ast: astIdx >= 0 ? (a.stats[astIdx] ?? "–") : "–",
        }))
        .sort((x: any, y: any) => parseFloat(String(y.pts)) - parseFloat(String(x.pts)))
        .slice(0, 3)
    })
  }

  let shotsOnGoal: { teamId: string; abbr: string; value: string }[] = []
  let isShootout = false
  if (sportType === "hockey") {
    shotsOnGoal = stats.map(t => ({
      teamId: t.teamId,
      abbr: t.abbr,
      value: t.statistics.find(
        (s: any) => s.name === "shots" || s.name === "shotsOnGoal" || s.label === "Shots"
      )?.displayValue ?? "–",
    }))
    isShootout = periodLabels[periodLabels.length - 1] === "SO"
  }

  let goalScorers: { teamId: string; name: string; minute: string; type: string }[] = []
  if (sportType === "soccer") {
    // ESPN NWSL/MLS summary uses `keyEvents` (not `data.scoring`) for goal data.
    // Each scoring play has: team.id, participants[0].athlete.displayName, clock.displayValue, type.text
    const keyEvents: any[] = data.keyEvents ?? []
    const scoringEvents = keyEvents.filter((e: any) => e.scoringPlay === true)
    goalScorers = scoringEvents.map((e: any) => ({
      teamId: e.team?.id ?? "",
      name: e.participants?.[0]?.athlete?.displayName ?? e.shortText ?? "",
      minute: e.clock?.displayValue ?? "",
      type: e.type?.text ?? "Goal",
    }))
  }

  return {
    sportType,
    periodLabels,
    linescores,
    stats,
    keyPlays,
    currentPeriod: isLive ? currentPeriod : null,
    pitchers,
    topScorers,
    shotsOnGoal,
    isShootout,
    goalScorers,
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const eventId = searchParams.get("eventId")
  const league = (searchParams.get("league") ?? "").toLowerCase()

  if (!eventId || !league) return NextResponse.json({ error: "Missing params" }, { status: 400 })

  const cacheKey = `${eventId}:${league}`

  try {
    let payload: Record<string, unknown> | null = null

    if (league === "mlb") {
      // ── MLB: try official MLB Stats API first (Mariners gamePk IDs)
      // ── If that fails, fall back to ESPN (non-Mariners use ESPN event IDs)
      payload = await fetchMLBBoxScore(eventId)
      if (!payload) {
        // ESPN fallback for non-Mariners MLB teams (their IDs come from ESPN)
        payload = await fetchESPNBoxScore(eventId, league, "baseball/mlb", "baseball", cacheKey)
      }
      if (!payload) {
        const cached = bsCache.get(cacheKey)
        if (cached) return NextResponse.json(cached)
        return NextResponse.json({ error: "MLB boxscore unavailable" }, { status: 502 })
      }
    } else if (league === "nhl") {
      // ── Official NHL API ────────────────────────────────────────────────
      payload = await fetchNHLBoxScore(eventId)
      if (!payload) {
        const cached = bsCache.get(cacheKey)
        if (cached) return NextResponse.json(cached)
        return NextResponse.json({ error: "NHL API error" }, { status: 502 })
      }
    } else if (league === "whl") {
      // ── WHL (leaguestat API) ────────────────────────────────────────────
      payload = await fetchWHLBoxScore(eventId)
      if (!payload) {
        const cached = bsCache.get(cacheKey)
        if (cached) return NextResponse.json(cached)
        return NextResponse.json({ error: "WHL API error" }, { status: 502 })
      }
    } else if (league === "pwhl") {
      // ── PWHL (hockeytech API) ───────────────────────────────────────────
      payload = await fetchPWHLBoxScore(eventId)
      if (!payload) {
        const cached = bsCache.get(cacheKey)
        if (cached) return NextResponse.json(cached)
        return NextResponse.json({ error: "PWHL API error" }, { status: 502 })
      }
    } else {
      // ── ESPN fallback for all other leagues ─────────────────────────────
      const sportPath = SPORT_PATH[league]
      if (!sportPath) return NextResponse.json({ error: `Unknown league: ${league}` }, { status: 400 })
      const sportType = sportPath.split("/")[0]

      payload = await fetchESPNBoxScore(eventId, league, sportPath, sportType, cacheKey)
      if (!payload) {
        const cached = bsCache.get(cacheKey)
        if (cached) return NextResponse.json(cached)
        return NextResponse.json({ error: "ESPN error" }, { status: 502 })
      }
    }

    // Cache whenever we have real linescore data
    const ls = payload.linescores as any[]
    if (ls && ls.length > 0) {
      bsCache.set(cacheKey, payload)
    } else {
      const cached = bsCache.get(cacheKey)
      if (cached) return NextResponse.json(cached)
    }

    return NextResponse.json(payload)
  } catch {
    const cached = bsCache.get(cacheKey)
    if (cached) return NextResponse.json(cached)
    return NextResponse.json({ error: "Failed to fetch box score" }, { status: 500 })
  }
}
