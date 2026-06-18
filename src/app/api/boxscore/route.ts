import { NextResponse } from "next/server"

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

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const eventId = searchParams.get("eventId")
  const league = (searchParams.get("league") ?? "").toLowerCase()

  if (!eventId || !league) return NextResponse.json({ error: "Missing params" }, { status: 400 })

  const sportPath = SPORT_PATH[league]
  if (!sportPath) return NextResponse.json({ error: `Unknown league: ${league}` }, { status: 400 })

  const sportType = sportPath.split("/")[0] // baseball | football | hockey | basketball | soccer

  try {
    const url = `https://site.api.espn.com/apis/site/v2/sports/${sportPath}/summary?event=${eventId}`
    const res = await fetch(url, { next: { revalidate: 60 } })
    if (!res.ok) return NextResponse.json({ error: "ESPN error" }, { status: 502 })
    const data = await res.json()

    const comp = data.header?.competitions?.[0]
    const competitors: any[] = comp?.competitors ?? []
    const currentPeriod: number | null = comp?.status?.period ?? null
    const isLive = comp?.status?.type?.state === "in"

    // Line scores per team per period
    const linescores = competitors.map((c: any) => ({
      teamId: c.team?.id,
      abbr: c.team?.abbreviation,
      logo: c.team?.logo,
      homeAway: c.homeAway,
      score: parseFloat(c.score ?? "0"),
      linescores: (c.linescores ?? []).map((l: any) =>
        l.value !== undefined ? l.value : parseFloat(l.displayValue ?? "0")
      ),
      record: c.record?.[0]?.summary ?? "",
    }))

    // Box score stats
    const bsTeams: any[] = data.boxscore?.teams ?? []
    const stats = bsTeams.map((t: any) => ({
      teamId: t.team?.id,
      abbr: t.team?.abbreviation,
      statistics: (t.statistics ?? []).slice(0, 12).map((s: any) => ({
        name: s.name,
        label: s.label ?? s.name,
        displayValue: s.displayValue,
      })),
    }))

    // Period labels
    let periodLabels: string[] = []
    const maxPeriods = Math.max(...linescores.map(l => l.linescores.length), 0)
    if (sportType === "baseball") {
      periodLabels = Array.from({ length: maxPeriods }, (_, i) => String(i + 1))
    } else if (sportType === "football") {
      periodLabels = ["Q1", "Q2", "Q3", "Q4", "OT", "OT2"].slice(0, maxPeriods)
    } else if (sportType === "hockey") {
      periodLabels = ["P1", "P2", "P3", "OT", "SO"].slice(0, maxPeriods)
    } else if (sportType === "basketball") {
      periodLabels = ["Q1", "Q2", "Q3", "Q4", "OT", "OT2", "OT3"].slice(0, maxPeriods)
    } else if (sportType === "soccer") {
      periodLabels = ["1H", "2H", "ET1", "ET2"].slice(0, maxPeriods)
    } else {
      periodLabels = Array.from({ length: maxPeriods }, (_, i) => String(i + 1))
    }

    // Key plays (last 5 scoring plays)
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

    // ── SPORT-SPECIFIC EXTRAS ─────────────────────────────────────────────────

    // Baseball: winning / losing / saving pitcher
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
        // ERA/IP line from first statistic entry
        const line = src.statistics?.[0]?.displayValue ?? ""
        return { name, line }
      }
      const wp = pickPitcher(data.winningPitcher)
      const lp = pickPitcher(data.losingPitcher)
      const sp = pickPitcher(data.savingPitcher)
      if (wp || lp || sp) pitchers = { winning: wp, losing: lp, saving: sp }
    }

    // Basketball: top 2 scorers per team
    let topScorers: { teamId: string; abbr: string; name: string; pts: string; reb: string; ast: string }[] = []
    if (sportType === "basketball") {
      const bsPlayers: any[] = data.boxscore?.players ?? []
      topScorers = bsPlayers.flatMap((teamEntry: any) => {
        const teamId: string = teamEntry.team?.id ?? ""
        const abbr: string = teamEntry.team?.abbreviation ?? ""
        const statGroup = teamEntry.statistics?.[0]
        const keys: string[] = statGroup?.keys ?? []
        const athletes: any[] = statGroup?.athletes ?? []
        const ptsIdx = keys.indexOf("pts")
        const rebIdx = keys.indexOf("reb")
        const astIdx = keys.indexOf("ast")

        return athletes
          .filter((a: any) => a.athlete && Array.isArray(a.stats) && a.stats.length > 0)
          .map((a: any) => ({
            teamId,
            abbr,
            name: a.athlete?.shortName ?? a.athlete?.displayName ?? "",
            pts: ptsIdx >= 0 ? (a.stats[ptsIdx] ?? "–") : "–",
            reb: rebIdx >= 0 ? (a.stats[rebIdx] ?? "–") : "–",
            ast: astIdx >= 0 ? (a.stats[astIdx] ?? "–") : "–",
          }))
          .sort((x: any, y: any) => parseFloat(String(y.pts)) - parseFloat(String(x.pts)))
          .slice(0, 2)
      })
    }

    // Hockey: shots on goal per team + shootout flag
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

    // Soccer: goal scorers from ESPN `scoring` section
    let goalScorers: { teamId: string; name: string; minute: string; type: string }[] = []
    if (sportType === "soccer") {
      const scoring: any[] = data.scoring ?? []
      goalScorers = scoring.flatMap((period: any) =>
        (period.scores ?? []).map((s: any) => ({
          teamId: s.team?.id ?? "",
          name: s.athlete?.shortName ?? s.athlete?.displayName ?? "",
          minute: s.clock?.displayValue ?? "",
          type: s.type?.text ?? "Goal",
        }))
      )
    }

    return NextResponse.json({
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
    })
  } catch {
    return NextResponse.json({ error: "Failed to fetch box score" }, { status: 500 })
  }
}
