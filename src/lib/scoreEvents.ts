/* eslint-disable @typescript-eslint/no-explicit-any */
export type ScoreEventType = 'gameStart' | 'scoreChange' | 'leadChange' | 'final' | 'closeGameLate'

export interface LiveGameSnapshot {
  gameId: string
  status: string
  league?: string
  sport?: string
  kickoff?: string
  period?: string
  clock?: string
  seattleTeamId?: string
  seattleTeamName?: string
  opponentTeamId?: string
  opponentTeamName?: string
  isHome?: boolean
  seattleScore?: number
  opponentScore?: number
}

export interface ScoreEvent {
  id: string
  type: ScoreEventType
  gameId: string
  teamIds: string[]
  title: string
  body: string
  createdAt: string
  current: LiveGameSnapshot
  previous?: LiveGameSnapshot
}

const FINAL_STATUSES = new Set(['ft', 'final', 'completed', 'full time'])
const LIVE_STATUSES = new Set(['live', 'in progress'])

function toNumber(value: unknown): number | undefined {
  if (value === undefined || value === null || value === '') return undefined
  const n = Number(value)
  return Number.isFinite(n) && n >= 0 && n <= 150 ? n : undefined
}

function normalizeStatus(status: unknown): string {
  return String(status ?? '').trim().toLowerCase()
}

function isLive(status: string) {
  return LIVE_STATUSES.has(status) || status.includes('progress') || status.includes('inning') || status.includes('quarter') || status.includes('period') || status.includes('half')
}

function isFinal(status: string) {
  return FINAL_STATUSES.has(status) || status.includes('final')
}

function leader(snapshot: LiveGameSnapshot): 'seattle' | 'opponent' | 'tie' | 'unknown' {
  const s = snapshot.seattleScore
  const o = snapshot.opponentScore
  if (s === undefined || o === undefined) return 'unknown'
  if (s === o) return 'tie'
  return s > o ? 'seattle' : 'opponent'
}

function teamName(snapshot: LiveGameSnapshot, who: 'seattle' | 'opponent') {
  return who === 'seattle'
    ? snapshot.seattleTeamName || 'Your team'
    : snapshot.opponentTeamName || 'Opponent'
}

function scoreLine(snapshot: LiveGameSnapshot) {
  if (snapshot.seattleScore === undefined || snapshot.opponentScore === undefined) return ''
  const home = snapshot.isHome ? snapshot.seattleTeamName : snapshot.opponentTeamName
  const away = snapshot.isHome ? snapshot.opponentTeamName : snapshot.seattleTeamName
  const homeScore = snapshot.isHome ? snapshot.seattleScore : snapshot.opponentScore
  const awayScore = snapshot.isHome ? snapshot.opponentScore : snapshot.seattleScore
  return `${away ?? 'Away'} ${awayScore}, ${home ?? 'Home'} ${homeScore}`
}

function isLateCloseGame(snapshot: LiveGameSnapshot) {
  if (!isLive(snapshot.status)) return false
  if (snapshot.seattleScore === undefined || snapshot.opponentScore === undefined) return false
  const diff = Math.abs(snapshot.seattleScore - snapshot.opponentScore)
  const sport = `${snapshot.sport ?? ''} ${snapshot.league ?? ''}`.toLowerCase()
  const lateText = `${snapshot.period ?? ''} ${snapshot.clock ?? ''}`.toLowerCase()
  const closeEnough = sport.includes('baseball') || sport.includes('mlb') ? diff <= 1 : diff <= 3
  if (!closeEnough) return false
  return /9|8th|9th|ot|overtime|4th|final|2:|1:|0:/.test(lateText)
}

export function normalizeLiveGameSnapshot(raw: any): LiveGameSnapshot | null {
  const gameId = raw?.id ?? raw?.gameId
  if (!gameId) return null
  return {
    gameId: String(gameId),
    status: normalizeStatus(raw.status),
    league: raw.league,
    sport: raw.sport,
    kickoff: raw.kickoff,
    period: raw.period,
    clock: raw.clock,
    seattleTeamId: raw.seattleTeamId ?? raw.seattleTeam?.id,
    seattleTeamName: raw.seattleTeam?.shortName ?? raw.seattleTeam?.name,
    opponentTeamId: raw.opponent?.id,
    opponentTeamName: raw.opponent?.shortName ?? raw.opponent?.name,
    isHome: Boolean(raw.isHome),
    seattleScore: toNumber(raw.seattleScore),
    opponentScore: toNumber(raw.opponentScore),
  }
}

export function detectScoreEvents(previous: LiveGameSnapshot | undefined, current: LiveGameSnapshot): ScoreEvent[] {
  const now = new Date().toISOString()
  const teamIds = [current.seattleTeamId, current.opponentTeamId].filter(Boolean) as string[]
  const events: ScoreEvent[] = []
  const prevStatus = previous?.status ?? 'upcoming'

  const add = (type: ScoreEventType, title: string, body: string) => {
    events.push({
      id: `${current.gameId}:${type}:${current.seattleScore ?? 'x'}-${current.opponentScore ?? 'x'}:${current.status}`,
      type,
      gameId: current.gameId,
      teamIds,
      title,
      body,
      createdAt: now,
      previous,
      current,
    })
  }

  if ((!previous || !isLive(prevStatus)) && isLive(current.status)) {
    add('gameStart', `${current.seattleTeamName ?? 'Game'} is underway`, scoreLine(current) || `${current.seattleTeamName ?? 'Your team'} vs ${current.opponentTeamName ?? 'opponent'} has started.`)
  }

  const scoreChanged = previous &&
    previous.seattleScore !== undefined &&
    previous.opponentScore !== undefined &&
    current.seattleScore !== undefined &&
    current.opponentScore !== undefined &&
    (previous.seattleScore !== current.seattleScore || previous.opponentScore !== current.opponentScore)

  if (scoreChanged) {
    add('scoreChange', 'Score update', scoreLine(current))
    const prevLeader = leader(previous)
    const nextLeader = leader(current)
    if (prevLeader !== 'unknown' && nextLeader !== 'unknown' && prevLeader !== nextLeader) {
      add('leadChange', nextLeader === 'tie' ? 'Game tied' : `${teamName(current, nextLeader)} takes the lead`, scoreLine(current))
    }
  }

  if (previous && !isFinal(prevStatus) && isFinal(current.status)) {
    add('final', 'Final score', scoreLine(current))
  }

  if (previous && !isLateCloseGame(previous) && isLateCloseGame(current)) {
    add('closeGameLate', 'Close game late', scoreLine(current))
  }

  return events
}

export function compareSnapshotSets(previous: LiveGameSnapshot[], current: LiveGameSnapshot[]) {
  const previousById = new Map(previous.map(game => [game.gameId, game]))
  return current.flatMap(game => detectScoreEvents(previousById.get(game.gameId), game))
}

export function createScoreEventPoller(
  readSnapshots: () => Promise<LiveGameSnapshot[]>,
  onEvents: (events: ScoreEvent[]) => Promise<void> | void,
  intervalMs = 2_000,
) {
  let timer: ReturnType<typeof setInterval> | null = null
  let previous: LiveGameSnapshot[] = []
  const tick = async () => {
    const current = await readSnapshots()
    const events = compareSnapshotSets(previous, current)
    previous = current
    if (events.length) await onEvents(events)
  }
  return {
    start() {
      if (timer) return
      timer = setInterval(() => { tick().catch(err => console.error('[score-events] poll failed:', err)) }, intervalMs)
    },
    stop() {
      if (timer) clearInterval(timer)
      timer = null
    },
    tick,
  }
}
