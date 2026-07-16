'use client'
import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  async function handleReset(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?type=recovery`,
      })
      if (error) {
        setError(error.message)
      } else {
        setSent(true)
      }
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#0a0a0f' }}>
        <div className="w-full max-w-[400px] text-center">
          <div className="text-5xl mb-4">✉️</div>
          <h2 className="font-extrabold text-xl mb-2" style={{ color: '#f0f0f8' }}>Email sent</h2>
          <p className="text-sm mb-6" style={{ color: '#9090b0' }}>Check your inbox for a password reset link.</p>
          <Link href="/auth/login" className="transition-colors" style={{ color: '#9090b0', fontSize: '13px' }}>
            ← Back to sign in
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#0a0a0f' }}>
      <div className="w-full max-w-[400px]">

        {/* ── Logo area ── */}
        <div
          className="text-center mb-8 pt-8 pb-2"
          style={{ background: 'radial-gradient(ellipse 60% 40% at 50% 0%, rgba(0,212,255,0.08) 0%, transparent 100%)' }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/scorpion-logo.png" alt="Scorpanion" width={64} height={64} className="object-contain mx-auto mb-3" />
          <div
            className="font-display text-[32px] font-extrabold uppercase tracking-[0.08em] leading-none mb-2"
            style={{ color: '#f0f0f8' }}
          >
            SCORPANION
          </div>
          <p style={{ color: '#9090b0', fontSize: '15px', fontWeight: 400 }}>Your teams. Every score.</p>
        </div>

        {/* ── Form ── */}
        <form onSubmit={handleReset} className="space-y-4">
          {error && (
            <div
              className="px-4 py-3 rounded-[10px] text-sm"
              style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171' }}
            >
              {error}
            </div>
          )}

          <div>
            <label className="block mb-1.5" style={{ color: '#9090b0', fontSize: '13px', fontWeight: 500 }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
              className="w-full px-4 text-white placeholder-[#5a5a7a] outline-none transition-all"
              style={{
                height: '52px',
                background: '#12121a',
                border: '1px solid #2a2a3f',
                borderRadius: '10px',
                fontSize: '15px',
              }}
              onFocus={e => { e.currentTarget.style.borderColor = '#00d4ff'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(0,212,255,0.15)' }}
              onBlur={e => { e.currentTarget.style.borderColor = '#2a2a3f'; e.currentTarget.style.boxShadow = 'none' }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full font-semibold transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              height: '48px',
              background: '#00d4ff',
              color: '#0a0a0f',
              borderRadius: '10px',
              fontSize: '15px',
              fontWeight: 600,
            }}
          >
            {loading ? 'Sending…' : 'Send reset link'}
          </button>
        </form>

        {/* ── Footer links ── */}
        <div className="mt-6 text-center">
          <Link href="/auth/login" className="transition-colors" style={{ color: '#9090b0', fontSize: '13px' }}>
            ← Back to sign in
          </Link>
        </div>

      </div>
    </div>
  )
}

