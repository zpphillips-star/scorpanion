/* eslint-disable @typescript-eslint/no-explicit-any */
export const runtime = 'edge'
export const dynamic = 'force-dynamic'

// ---------------------------------------------------------------------------
// GET /api/pga-teesheet?id=R2026525&round=1
// Returns all tee groups for a specific round of a PGA Tour tournament.
// ---------------------------------------------------------------------------
const PGA_GQL_URL = 'https://orchestrator.pgatour.com/graphql'
const PGA_GQL_KEY = 'da2-gsrx5bibzbb4njvhl7t37wqyl4'

export interface TeeSheetGroup {
  teeTime: string  // ISO string
  players: { name: string; country?: string }[]
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const id    = url.searchParams.get('id')
  const round = parseInt(url.searchParams.get('round') ?? '1', 10)

  if (!id || isNaN(round) || round < 1 || round > 4) {
    return Response.json({ error: 'Missing or invalid id / round param' }, { status: 400 })
  }

  try {
    const res = await fetch(PGA_GQL_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': PGA_GQL_KEY,
      },
      body: JSON.stringify({
        query: `{
          teeTimesV2(id: "${id}") {
            rounds {
              roundInt
              groups {
                teeTime
                players { firstName lastName country }
              }
            }
          }
        }`,
      }),
      cache: 'no-store',
    })

    if (!res.ok) {
      return Response.json({ error: `PGA Tour GraphQL returned ${res.status}` }, { status: 502 })
    }

    const data = await res.json()
    const allRounds: any[] = data?.data?.teeTimesV2?.rounds ?? []

    // Find the requested round
    const matchedRound = allRounds.find((r: any) => r.roundInt === round)
    if (!matchedRound) {
      // Round not yet posted — return empty groups rather than an error
      return Response.json({ groups: [] })
    }

    const rawGroups: any[] = matchedRound.groups ?? []

    // Build normalized groups, filter out groups with no players or no tee time
    const groups: TeeSheetGroup[] = rawGroups
      .filter((g: any) => g.teeTime && Array.isArray(g.players) && g.players.length > 0)
      .map((g: any) => ({
        teeTime: new Date(
          typeof g.teeTime === 'number' ? g.teeTime : parseInt(g.teeTime, 10)
        ).toISOString(),
        players: (g.players as any[]).map(p => ({
          name: [p.firstName, p.lastName].filter(Boolean).join(' '),
          country: p.country ?? undefined,
        })),
      }))
      // Sort by tee time ascending
      .sort((a, b) => a.teeTime.localeCompare(b.teeTime))

    return Response.json({ groups })
  } catch (e) {
    return Response.json({ error: `Tee sheet fetch failed: ${String(e)}` }, { status: 502 })
  }
}
