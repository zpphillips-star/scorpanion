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

const STANDINGS_LEAGUE: Record<string, string> = {
  mlb: "mlb", nfl: "nfl", nhl: "nhl", wnba: "wnba",
  "usa.1": "mls", mls: "mls", nba: "nba",
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const teamId = searchParams.get("teamId")  // ESPN team ID
  const league = (searchParams.get("league") ?? "").toLowerCase()

  if (!teamId || !league) return NextResponse.json({ error: "Missing params" }, { status: 400 })

  const sportPath = SPORT_PATH[league]
  if (!sportPath) return NextResponse.json({ error: `Unknown league: ${league}` }, { status: 400 })

  try {
    const teamUrl = `https://site.api.espn.com/apis/site/v2/sports/${sportPath}/teams/${teamId}`
    const res = await fetch(teamUrl, { next: { revalidate: 300 } })
    if (!res.ok) return NextResponse.json({ error: "ESPN team error" }, { status: 502 })
    const data = await res.json()

    const team = data.team
    if (!team) return NextResponse.json({ error: "No team data" }, { status: 404 })

    // Record
    const record = team.record?.items?.[0]
    const wins = record?.stats?.find((s: any) => s.name === "wins")?.value ?? 0
    const losses = record?.stats?.find((s: any) => s.name === "losses")?.value ?? 0
    const ties = record?.stats?.find((s: any) => s.name === "ties")?.value
    const pct = record?.stats?.find((s: any) => s.name === "winPercent" || s.name === "OWP")?.value

    // Recent form (last 3) + next 3 upcoming
    const schedUrl = `https://site.api.espn.com/apis/site/v2/sports/${sportPath}/teams/${teamId}/schedule`
    const schedRes = await fetch(schedUrl, { next: { revalidate: 300 } })
    let recentForm: { result: "W" | "L" | "T"; myScore: number; oppScore: number; isHome: boolean; opponent: string; oppLogo: string; date: string }[] = []
    let upcomingGames: { opponent: string; oppLogo: string; date: string; isHome: boolean; time: string }[] = []
    if (schedRes.ok) {
      const schedData = await schedRes.json()
      const events: any[] = schedData.events ?? []
      const completed = events.filter((e: any) => e.competitions?.[0]?.status?.type?.completed)
      const upcoming = events.filter((e: any) => !e.competitions?.[0]?.status?.type?.completed && new Date(e.date) > new Date())
      const last3 = completed.slice(-3)
      const next3 = upcoming.slice(0, 3)
      recentForm = last3.map((e: any) => {
        const comp = e.competitions[0]
        const myTeam = comp.competitors.find((c: any) => c.team?.id === teamId || c.id === teamId)
        const opp = comp.competitors.find((c: any) => c.team?.id !== teamId && c.id !== teamId)
        // score can be a string "4", a number 4, or an object {value:4, displayValue:"4"}
        const parseScore = (s: any): number => {
          if (s === null || s === undefined) return 0
          if (typeof s === "number") return s
          if (typeof s === "string") return parseFloat(s) || 0
          if (typeof s === "object") return parseFloat(s.value ?? s.displayValue ?? "0") || 0
          return 0
        }
        const myScore = parseScore(myTeam?.score)
        const oppScore = parseScore(opp?.score)
        const isHome = myTeam?.homeAway === "home"
        return {
          result: myScore > oppScore ? "W" : myScore < oppScore ? "L" : "T",
          myScore,
          oppScore,
          isHome,
          opponent: opp?.team?.abbreviation ?? opp?.team?.shortDisplayName ?? "?",
          oppLogo: opp?.team?.logos?.[0]?.href ?? opp?.team?.logo ?? "",
          date: e.date,
        }
      })
      upcomingGames = next3.map((e: any) => {
        const comp = e.competitions[0]
        const myTeam = comp.competitors.find((c: any) => c.team?.id === teamId || c.id === teamId)
        const opp = comp.competitors.find((c: any) => c.team?.id !== teamId && c.id !== teamId)
        const isHome = myTeam?.homeAway === "home"
        return {
          opponent: opp?.team?.shortDisplayName ?? opp?.team?.abbreviation ?? "?",
          oppLogo: opp?.team?.logos?.[0]?.href ?? opp?.team?.logo ?? "",
          date: e.date,
          isHome,
          time: e.date,  // raw ISO — format client-side to use local TZ
        }
      })
    }

    // Standings rank + full division — fetch standings
    let divisionRank: number | null = null
    let divisionName = ""
    let divisionStandings: { abbr: string; logo: string; wins: number; losses: number; winPct: number; isThis: boolean }[] = []
    const standingsLeague = STANDINGS_LEAGUE[league]
    if (standingsLeague) {
      try {
        const stUrl = `https://site.api.espn.com/apis/v2/sports/${sportPath}/standings?level=3`
        const stRes = await fetch(stUrl, { next: { revalidate: 300 } })
        if (stRes.ok) {
          const stData = await stRes.json()
          const children = stData.children ?? stData.standings?.entries ?? []
          // Walk the nested group structure
          const findRank = (groups: any[]): void => {
            for (const group of groups) {
              if (group.standings?.entries) {
                const entries: any[] = group.standings.entries
                const idx = entries.findIndex((e: any) =>
                  e.team?.id === teamId || String(e.team?.id) === String(teamId)
                )
                if (idx !== -1) {
                  divisionRank = idx + 1
                  divisionName = group.name ?? group.shortName ?? ""
                  divisionStandings = entries.map((e: any, i: number) => {
                    const w = e.stats?.find((s: any) => s.name === "wins")?.value ?? 0
                    const l = e.stats?.find((s: any) => s.name === "losses")?.value ?? 0
                    const pctVal = e.stats?.find((s: any) => s.name === "winPercent" || s.name === "OWP" || s.name === "pointsPercentage")?.value ?? 0
                    return {
                      abbr: e.team?.abbreviation ?? e.team?.shortDisplayName ?? "?",
                      logo: e.team?.logos?.[0]?.href ?? e.team?.logo ?? "",
                      wins: Math.round(w),
                      losses: Math.round(l),
                      winPct: parseFloat(pctVal),
                      isThis: e.team?.id === teamId || String(e.team?.id) === String(teamId),
                    }
                  })
                  return
                }
              }
              if (group.children) findRank(group.children)
            }
          }
          findRank(children)
        }
      } catch { /* standings optional */ }
    }

    return NextResponse.json({
      id: team.id,
      name: team.displayName ?? team.name,
      shortName: team.shortDisplayName ?? team.nickname,
      abbr: team.abbreviation,
      logo: team.logos?.[0]?.href ?? "",
      color: `#${team.color ?? "333"}`,
      altColor: `#${team.alternateColor ?? "666"}`,
      wins: Math.round(wins),
      losses: Math.round(losses),
      ties: ties ? Math.round(ties) : undefined,
      winPct: pct ? parseFloat(pct).toFixed(3) : undefined,
      recentForm,
      upcomingGames,
      divisionRank,
      divisionName,
      divisionStandings,
      venue: team.franchise?.venue?.fullName ?? team.venue?.fullName ?? null,
      location: team.location ?? null,
    })
  } catch (e) {
    return NextResponse.json({ error: "Failed" }, { status: 500 })
  }
}
