'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ) : (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
    </svg>
  )
}

export default function SignupPage() {
  const router = useRouter()
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { display_name: displayName },
        },
      })
      if (error) {
        setError(error.message)
      } else {
        setSuccess(true)
      }
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#0c1b31' }}>
        <div className="w-full max-w-[400px] text-center">
          <div className="text-5xl mb-4">✉️</div>
          <h2 className="font-extrabold text-xl mb-2" style={{ color: '#f0f0f8' }}>Check your email</h2>
          <p className="text-sm mb-6" style={{ color: '#9090b0' }}>
            We sent a confirmation link to <span style={{ color: '#f0f0f8' }}>{email}</span>
          </p>
          <Link href="/schedule" className="transition-colors" style={{ color: '#5a5a7a', fontSize: '13px' }}>
            Continue without confirming →
          </Link>
        </div>
      </div>
    )
  }

  const inputStyle = {
    height: '52px',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '10px',
    fontSize: '15px',
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#0c1b31' }}>
      <div className="w-full max-w-[380px]">

        {/* ── Logo area ── */}
        <div className="flex items-center justify-center mb-8 pt-8" style={{ overflow: 'hidden', height: 90 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/scorpanion-logo-new.png"
            alt="Scorpanion"
            style={{ height: 90, width: 'auto', objectFit: 'contain' }}
            onError={(e) => { (e.target as HTMLImageElement).src = '/scorpanion-full.png' }}
          />
        </div>

        {/* ── Form ── */}
        <form onSubmit={handleSignup} className="space-y-4">
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
              Display name
            </label>
            <input
              type="text"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              required
              placeholder="Hawks fan"
              className="w-full px-4 text-white placeholder-[#5a5a7a] outline-none transition-all"
              style={inputStyle}
              onFocus={e => { e.currentTarget.style.borderColor = '#00d4ff'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(0,212,255,0.15)' }}
              onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.boxShadow = 'none' }}
            />
          </div>

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
              style={inputStyle}
              onFocus={e => { e.currentTarget.style.borderColor = '#00d4ff'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(0,212,255,0.15)' }}
              onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.boxShadow = 'none' }}
            />
          </div>

          <div>
            <label className="block mb-1.5" style={{ color: '#9090b0', fontSize: '13px', fontWeight: 500 }}>
              Password
            </label>
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={6}
                placeholder="••••••••"
                className="w-full px-4 pr-12 text-white placeholder-[#5a5a7a] outline-none transition-all"
                style={inputStyle}
                onFocus={e => { e.currentTarget.style.borderColor = '#00d4ff'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(0,212,255,0.15)' }}
                onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.boxShadow = 'none' }}
              />
              <button
                type="button"
                onClick={() => setShowPw(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                style={{ color: '#5a5a7a' }}
                tabIndex={-1}
              >
                <EyeIcon open={showPw} />
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full font-semibold transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              height: '48px',
              background: '#D95C17',
              color: 'white',
              borderRadius: '10px',
              fontSize: '15px',
              fontWeight: 600,
            }}
          >
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        {/* ── Footer links ── */}
        <div className="mt-6 text-center space-y-3">
          <div style={{ color: '#9090b0', fontSize: '13px' }}>
            Already have an account?{' '}
            <Link href="/auth/login" className="transition-colors" style={{ color: '#00d4ff' }}>
              Sign in
            </Link>
          </div>
          <div className="pt-1">
            <Link href="/schedule" className="transition-colors" style={{ color: '#5a5a7a', fontSize: '13px' }}>
              Continue without account →
            </Link>
          </div>
        </div>

      </div>
    </div>
  )
}

