'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'

// ── Setting types ──────────────────────────────────────────────────────────────
interface ToggleSetting {
  type: 'toggle'
  key: string
  label: string
  description: string
  default: boolean
}
interface SelectSetting {
  type: 'select'
  key: string
  label: string
  description: string
  options: { value: string; label: string }[]
  default: string
}
type Setting = ToggleSetting | SelectSetting

const SETTING_GROUPS: { title: string; settings: Setting[] }[] = [
  {
    title: 'Display',
    settings: [
      {
        type: 'toggle', key: 'dark_mode', label: 'Dark Mode', default: true,
        description: 'Use the dark navy theme (recommended)',
      },
      {
        type: 'toggle', key: 'compact_scores', label: 'Compact Scores', default: false,
        description: 'Show smaller score cards on the home screen',
      },
      {
        type: 'select', key: 'score_format', label: 'Score Format', default: 'live',
        description: 'How live game scores are displayed',
        options: [
          { value: 'live', label: 'Live with clock' },
          { value: 'score_only', label: 'Score only' },
        ],
      },
    ],
  },
  {
    title: 'Notifications',
    settings: [
      {
        type: 'toggle', key: 'live_alerts', label: 'Game Start Alerts', default: false,
        description: 'Notify when a followed team\'s game goes live',
      },
      {
        type: 'toggle', key: 'score_alerts', label: 'Score Change Alerts', default: false,
        description: 'Notify on goals, touchdowns, and scoring plays',
      },
      {
        type: 'toggle', key: 'final_alerts', label: 'Final Score Alerts', default: false,
        description: 'Notify when a followed team\'s game ends',
      },
    ],
  },
  {
    title: 'Data',
    settings: [
      {
        type: 'select', key: 'refresh_rate', label: 'Live Refresh Rate', default: '2',
        description: 'How often live scores update during games',
        options: [
          { value: '2',  label: 'Every 2 seconds (default)' },
          { value: '5',  label: 'Every 5 seconds' },
          { value: '10', label: 'Every 10 seconds' },
          { value: '30', label: 'Every 30 seconds' },
        ],
      },
      {
        type: 'toggle', key: 'preload_scores', label: 'Preload Score Data', default: true,
        description: 'Fetch schedule in background when app opens',
      },
    ],
  },
  {
    title: 'About',
    settings: [],
  },
]

const STORAGE_KEY = 'scorpanion:settings'

function loadSettings(): Record<string, string | boolean> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch { return {} }
}

function saveSettings(s: Record<string, string | boolean>) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)) } catch {}
}

// ── Toggle component ───────────────────────────────────────────────────────────
function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!on)}
      className="relative flex-shrink-0 transition-colors"
      style={{
        width: 44, height: 26, borderRadius: 13,
        background: on ? '#D95C17' : 'rgba(255,255,255,0.1)',
        border: `1px solid ${on ? 'rgba(217,92,23,0.5)' : 'rgba(255,255,255,0.16)'}`,
      }}
    >
      <span
        className="absolute top-[2px] transition-transform"
        style={{
          width: 20, height: 20, borderRadius: '50%',
          background: 'white',
          boxShadow: '0 1px 4px rgba(0,0,0,0.35)',
          left: on ? 'calc(100% - 22px)' : '2px',
          transition: 'left 0.18s cubic-bezier(0.4,0,0.2,1)',
        }}
      />
    </button>
  )
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Record<string, string | boolean>>({})
  const [saved, setSaved] = useState(false)

  useEffect(() => { setSettings(loadSettings()) }, [])

  function getSetting(key: string, def: string | boolean): string | boolean {
    return key in settings ? settings[key] : def
  }

  function updateSetting(key: string, value: string | boolean) {
    const next = { ...settings, [key]: value }
    setSettings(next)
    saveSettings(next)
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  function resetAll() {
    setSettings({})
    saveSettings({})
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  return (
    <div style={{ minHeight: '100dvh', background: '#0c1b31', color: 'white', paddingBottom: '5rem' }}>

      {/* ── Sticky header ── */}
      <div className="sticky top-0 z-20 flex items-center gap-3 px-4 py-3"
        style={{ background: 'rgba(12,27,49,0.96)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255,255,255,0.16)' }}>
        <Link href="/home" className="flex items-center justify-center w-8 h-8 rounded-full flex-shrink-0"
          style={{ color: '#a1a1aa', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.16)' }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 3L5 8L10 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </Link>
        <div style={{ overflow: 'hidden', height: 44, display: 'flex', alignItems: 'center', flex: 1 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/scorpanion-logo-new.png" alt="Scorpanion"
            style={{ height: 62, width: 'auto', objectFit: 'contain' }}
            onError={(e) => { (e.target as HTMLImageElement).src = '/scorpanion-full.png' }}/>
        </div>
        {/* Saved indicator */}
        <div className="flex-shrink-0 transition-opacity" style={{ opacity: saved ? 1 : 0 }}>
          <span className="font-display text-[11px] font-700 uppercase tracking-widest" style={{ color: '#22c55e' }}>Saved</span>
        </div>
      </div>

      <div className="px-4 pt-5" style={{ maxWidth: 560, margin: '0 auto' }}>
        <h1 className="font-display text-[22px] font-800 uppercase tracking-tight text-white mb-1">Settings</h1>
        <p className="text-[13px] mb-6" style={{ color: '#52637a' }}>Preferences are saved locally on your device.</p>

        {/* ── Setting groups ── */}
        {SETTING_GROUPS.map(group => (
          <div key={group.title} className="mb-6">
            <p className="font-display text-[10px] font-700 uppercase tracking-widest mb-2 px-1" style={{ color: '#52637a' }}>
              {group.title}
            </p>

            {/* About section — special content */}
            {group.title === 'About' ? (
              <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.16)', background: 'rgba(255,255,255,0.02)' }}>
                <div className="px-4 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.15)' }}>
                  <span className="text-[14px] text-white font-medium">Version</span>
                  <span className="text-[13px]" style={{ color: '#52637a' }}>1.0.0</span>
                </div>
                <Link href="/feedback" className="px-4 py-4 flex items-center justify-between active:bg-white/5 transition-colors block"
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.15)' }}>
                  <span className="text-[14px] text-white font-medium">Send Feedback</span>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ color: '#52637a' }}>
                    <path d="M3 7h8M8 4l3 3-3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </Link>
                <button onClick={resetAll} className="w-full px-4 py-4 flex items-center justify-between active:bg-white/5 transition-colors text-left">
                  <span className="text-[14px] font-medium" style={{ color: '#f87171' }}>Reset All Settings</span>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ color: '#f87171' }}>
                    <path d="M7 2a5 5 0 100 10A5 5 0 007 2zM5 5l4 4M9 5l-4 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                  </svg>
                </button>
              </div>
            ) : (
              <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.16)', background: 'rgba(255,255,255,0.02)' }}>
                {group.settings.map((setting, idx) => (
                  <div key={setting.key}
                    className="px-4 py-4 flex items-center gap-4"
                    style={{ borderBottom: idx < group.settings.length - 1 ? '1px solid rgba(255,255,255,0.15)' : 'none' }}>
                    {/* Label */}
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] font-medium text-white leading-tight">{setting.label}</p>
                      <p className="text-[12px] mt-0.5 leading-snug" style={{ color: '#52637a' }}>{setting.description}</p>
                    </div>
                    {/* Control */}
                    {setting.type === 'toggle' ? (
                      <Toggle
                        on={getSetting(setting.key, setting.default) as boolean}
                        onChange={v => updateSetting(setting.key, v)}
                      />
                    ) : (
                      <select
                        value={getSetting(setting.key, setting.default) as string}
                        onChange={e => updateSetting(setting.key, e.target.value)}
                        className="text-[13px] rounded-lg outline-none text-right"
                        style={{
                          background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.1)',
                          color: '#D95C17', padding: '6px 10px', cursor: 'pointer', maxWidth: 160,
                        }}
                      >
                        {setting.options.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        {/* Coming soon notice for notifications */}
        <p className="text-center text-[11px] pb-4" style={{ color: '#334155' }}>
          Notification features require account sign-in — coming soon.
        </p>
      </div>
    </div>
  )
}

