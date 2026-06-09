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
    let recentForm: { result: "W" | "L" | "T"; score: string; opponent: string; oppLogo: string; date: string }[] = []
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
        const myScore = parseFloat(myTeam?.score ?? "0")
        const oppScore = parseFloat(opp?.score ?? "0")
        return {
          result: myScore > oppScore ? "W" : myScore < oppScore ? "L" : "T",
          score: `${myScore}-${oppScore}`,
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
        const date = new Date(e.date)
        return {
          opponent: opp?.team?.shortDisplayName ?? opp?.team?.abbreviation ?? "?",
          oppLogo: opp?.team?.logos?.[0]?.href ?? opp?.team?.logo ?? "",
          date: e.date,
          isHome,
          time: date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true, timeZoneName: "short" }),
        }
      })
    }

    // Standings rank — fetch standings
    let divisionRank: number | null = null
    let divisionName = ""
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
      venue: team.franchise?.venue?.fullName ?? team.venue?.fullName ?? null,
      location: team.location ?? null,
    })
  } catch (e) {
    return NextResponse.json({ error: "Failed" }, { status: 500 })
  }
}
