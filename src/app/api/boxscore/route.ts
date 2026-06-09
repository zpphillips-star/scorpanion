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

    // Box score stats (baseball: R/H/E; other sports: team stats)
    const bsTeams: any[] = data.boxscore?.teams ?? []
    const stats = bsTeams.map((t: any) => ({
      teamId: t.team?.id,
      abbr: t.team?.abbreviation,
      statistics: (t.statistics ?? []).slice(0, 10).map((s: any) => ({
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
      periodLabels = ["Q1", "Q2", "Q3", "Q4", "OT", "OT2"].slice(0, maxPeriods)
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

    return NextResponse.json({ sportType, periodLabels, linescores, stats, keyPlays })
  } catch (e) {
    return NextResponse.json({ error: "Failed to fetch box score" }, { status: 500 })
  }
}
