'use client'

import { useEffect, useState } from 'react'

type Platform = 'ios' | 'android' | 'other'
type State = 'hidden' | 'ios-sheet' | 'ios-safari-redirect' | 'android-banner' | 'debug'

const STORAGE_KEY = 'seattle-sports-install-ts'
const COOLDOWN_MS = 24 * 60 * 60 * 1000

function getPlatform(): Platform {
  const ua = navigator.userAgent
  if (/iphone|ipad|ipod/i.test(ua)) return 'ios'
  if (/android/i.test(ua)) return 'android'
  return 'other'
}

function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (navigator as any).standalone === true
  )
}

function isOnCooldown(): boolean {
  try {
    const ts = localStorage.getItem(STORAGE_KEY)
    if (!ts) return false
    return Date.now() - parseInt(ts) < COOLDOWN_MS
  } catch { return false }
}

function snooze() {
  try { localStorage.setItem(STORAGE_KEY, String(Date.now())) } catch { /* ignore */ }
}

function clearStorage() {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch { /* ignore */ }
}

export default function InstallPrompt() {
  const [state, setState] = useState<State>('hidden')
  const [debugInfo, setDebugInfo] = useState('')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [iosStep, setIosStep] = useState(0)

  useEffect(() => {
    const params = window.location.search
    const isDebug = params.includes('debug-install')
    const isReset = params.includes('reset-install')

    if (isReset || isDebug) clearStorage()

    const platform = getPlatform()
    const standalone = isStandalone()
    const cooldown = isOnCooldown()
    const ua = navigator.userAgent.slice(0, 80)
    const isSafari = /safari/i.test(navigator.userAgent) && !/crios|fxios|gsa/i.test(navigator.userAgent)

    if (isDebug) {
      setDebugInfo(`platform=${platform} | standalone=${standalone} | cooldown=${cooldown} | safari=${isSafari} | ua=${ua}`)
      setState('debug')
      return
    }

    if (standalone) return
    if (cooldown) return

    if (platform === 'android' || platform === 'other') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const preCapture = (window as any).__installPromptEvent
      if (preCapture) {
        setDeferredPrompt(preCapture)
        setState('android-banner')
        return
      }
      const handler = (e: Event) => {
        e.preventDefault()
        setDeferredPrompt(e)
        setState('android-banner')
      }
      window.addEventListener('beforeinstallprompt', handler as EventListener)
      return () => window.removeEventListener('beforeinstallprompt', handler as EventListener)
    }

    if (platform === 'ios') {
      const isSafariCheck = /safari/i.test(navigator.userAgent) && !/crios|fxios|gsa/i.test(navigator.userAgent)
      if (isSafariCheck) {
        const t = setTimeout(() => setState('ios-sheet'), 800)
        return () => clearTimeout(t)
      } else {
        const t = setTimeout(() => setState('ios-safari-redirect'), 800)
        return () => clearTimeout(t)
      }
    }
  }, [])

  async function handleAndroidInstall() {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') snooze()
    setDeferredPrompt(null)
    setState('hidden')
  }

  function handleDismiss() {
    snooze()
    setState('hidden')
  }

  const IOS_STEPS = [
    { icon: '⬆️', title: 'Tap the Share button', desc: 'At the bottom of Safari, tap the square with an arrow pointing up' },
    { icon: '➕', title: 'Tap "Add to Home Screen"', desc: 'Scroll down in the share sheet and tap "Add to Home Screen"' },
    { icon: '✅', title: 'Tap "Add"', desc: "Tap Add in the top right — you're done!" },
  ]

  if (state === 'hidden') return null

  if (state === 'ios-safari-redirect') {
    return (
      <div className="fixed inset-0 z-50 flex items-end">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleDismiss} />
        <div className="relative w-full bg-[#16161f] border-t border-white/10 rounded-t-3xl px-5 pt-5 pb-10 shadow-2xl shadow-black/80">
          <div className="w-10 h-1 bg-zinc-700 rounded-full mx-auto mb-5" />
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center text-2xl flex-shrink-0">🏟️</div>
            <div>
              <p className="text-base font-bold text-white">Install Seattle Sports</p>
              <p className="text-xs text-zinc-400">One more step needed</p>
            </div>
            <button onClick={handleDismiss} className="ml-auto text-zinc-500 text-2xl leading-none pb-1">✕</button>
          </div>
          <div className="bg-zinc-800/60 rounded-2xl px-4 py-3.5 mb-5">
            <p className="text-sm text-white font-semibold mb-1">🧭 Open this page in Safari</p>
            <p className="text-xs text-zinc-400 leading-relaxed">
              iOS only allows installing apps from Safari. Copy the link and paste it into Safari to get the install option.
            </p>
          </div>
          <button
            onClick={handleDismiss}
            className="w-full py-3 rounded-xl bg-blue-500 text-white text-sm font-bold active:scale-95 transition-transform"
          >
            Got it
          </button>
          <button onClick={handleDismiss} className="w-full py-2.5 mt-2 text-zinc-500 text-xs text-center">
            Dismiss
          </button>
        </div>
      </div>
    )
  }

  if (state === 'debug') {
    return (
      <div className="fixed inset-0 z-50 flex items-end">
        <div className="absolute inset-0 bg-black/70" onClick={() => setState('hidden')} />
        <div className="relative w-full bg-[#16161f] border-t border-white/10 rounded-t-3xl px-5 pt-5 pb-10">
          <p className="text-xs font-bold text-blue-400 mb-3 uppercase tracking-widest">Install Prompt Debug</p>
          <p className="text-xs text-zinc-300 break-all leading-relaxed font-mono">{debugInfo}</p>
          <div className="flex gap-3 mt-5">
            <button onClick={() => setState('ios-sheet')} className="flex-1 py-3 rounded-xl bg-blue-500 text-white text-sm font-bold">
              Show iOS Sheet
            </button>
            <button onClick={() => setState('hidden')} className="flex-1 py-3 rounded-xl bg-zinc-800 text-zinc-300 text-sm font-semibold">
              Close
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (state === 'android-banner') {
    return (
      <div className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-6 pt-2">
        <div className="bg-[#16161f] border border-white/10 rounded-2xl p-4 shadow-2xl shadow-black/60 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center text-2xl flex-shrink-0">🏟️</div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white">Add to Home Screen</p>
            <p className="text-xs text-zinc-400 mt-0.5">Install Seattle Sports — no app store needed</p>
          </div>
          <div className="flex flex-col gap-2 flex-shrink-0">
            <button onClick={handleAndroidInstall} className="bg-blue-500 text-white text-xs font-bold px-4 py-2 rounded-xl active:scale-95 transition-transform">
              Install
            </button>
            <button onClick={handleDismiss} className="text-zinc-500 text-xs text-center">Not now</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleDismiss} />
      <div className="relative w-full bg-[#16161f] border-t border-white/10 rounded-t-3xl px-5 pt-5 pb-10 shadow-2xl shadow-black/80">
        <div className="w-10 h-1 bg-zinc-700 rounded-full mx-auto mb-5" />
        <div className="flex items-center gap-3 mb-5">
          <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center text-2xl flex-shrink-0">🏟️</div>
          <div>
            <p className="text-base font-bold text-white">Add Seattle Sports</p>
            <p className="text-xs text-zinc-400">to your Home Screen</p>
          </div>
          <button onClick={handleDismiss} className="ml-auto text-zinc-500 text-2xl leading-none pb-1">✕</button>
        </div>
        <div className="space-y-4 mb-6">
          {IOS_STEPS.map((step, i) => (
            <div key={i} className={`flex items-start gap-3 transition-opacity ${i <= iosStep ? 'opacity-100' : 'opacity-30'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold
                ${i < iosStep ? 'bg-blue-500/20 text-blue-400' : i === iosStep ? 'bg-blue-500 text-white' : 'bg-zinc-800 text-zinc-500'}`}>
                {i < iosStep ? '✓' : i + 1}
              </div>
              <div className="pt-0.5">
                <p className="text-sm font-semibold text-white">{step.icon} {step.title}</p>
                <p className="text-xs text-zinc-400 mt-0.5 leading-relaxed">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="flex gap-3">
          {iosStep > 0 && (
            <button onClick={() => setIosStep(s => s - 1)} className="flex-1 py-3 rounded-xl bg-zinc-800 text-zinc-300 text-sm font-semibold active:scale-95 transition-transform">
              Back
            </button>
          )}
          {iosStep < IOS_STEPS.length - 1 ? (
            <button onClick={() => setIosStep(s => s + 1)} className="flex-1 py-3 rounded-xl bg-blue-500 text-white text-sm font-bold active:scale-95 transition-transform">
              Next →
            </button>
          ) : (
            <button onClick={handleDismiss} className="flex-1 py-3 rounded-xl bg-blue-500 text-white text-sm font-bold active:scale-95 transition-transform">
              Done ✓
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
