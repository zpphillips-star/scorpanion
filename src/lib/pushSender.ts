import type { ScoreEvent } from './scoreEvents'

export interface PushTarget {
  expo_push_token?: string | null
  native_device_push_token?: string | null
  followed_team_ids?: string[] | null
  event_types?: string[] | null
}

export interface SendResult {
  attempted: number
  sent: number
  disabled: boolean
  error?: string
}

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send'

export function pushSendingEnabled() {
  return process.env.SCORPANION_PUSH_SENDING_ENABLED === 'true'
}

export async function sendScoreEventNotifications(events: ScoreEvent[], targets: PushTarget[]): Promise<SendResult> {
  if (!pushSendingEnabled()) {
    console.info('[push] Sending disabled. Set SCORPANION_PUSH_SENDING_ENABLED=true after backend secrets/tables are deployed.')
    return { attempted: 0, sent: 0, disabled: true }
  }

  const messages = []
  for (const event of events) {
    for (const target of targets) {
      const followsTeam = event.teamIds.some(id => target.followed_team_ids?.includes(id))
      const wantsEvent = target.event_types?.includes(event.type)
      if (!followsTeam || !wantsEvent || !target.expo_push_token) continue
      messages.push({
        to: target.expo_push_token,
        sound: 'default',
        channelId: 'score-alerts',
        title: event.title,
        body: event.body,
        data: { gameId: event.gameId, eventType: event.type },
      })
    }
  }

  if (messages.length === 0) return { attempted: 0, sent: 0, disabled: false }

  const res = await fetch(EXPO_PUSH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(messages),
  })
  if (!res.ok) {
    const error = `Expo push send failed with HTTP ${res.status}`
    console.error('[push]', error)
    return { attempted: messages.length, sent: 0, disabled: false, error }
  }
  return { attempted: messages.length, sent: messages.length, disabled: false }
}
