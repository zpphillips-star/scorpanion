'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

export default function SignupPage() {
  const router = useRouter()
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
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
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center px-4">
        <div className="w-full max-w-sm text-center">
          <div className="text-4xl mb-4">✉️</div>
          <h2 className="text-white font-bold text-xl mb-2">Check your email</h2>
          <p className="text-gray-400 text-sm mb-6">We sent a confirmation link to <span className="text-white">{email}</span></p>
          <Link href="/schedule" className="text-xs text-gray-500 hover:text-gray-300 transition-colors">
            Continue without confirming →
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="text-4xl mb-2">🦂</div>
          <h1 className="text-2xl font-bold text-white tracking-tight">scorpanion</h1>
          <p className="text-gray-500 text-sm mt-1">Create your account</p>
        </div>

        {/* Card */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <form onSubmit={handleSignup} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-900/30 border border-red-500/30 rounded-md text-red-300 text-sm">
                {error}
              </div>
            )}
            <div>
              <label className="block text-gray-400 text-xs font-medium mb-1.5">Display name</label>
              <input
                type="text"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                required
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-blue-500/50 transition-colors"
                placeholder="Hawks fan"
              />
            </div>
            <div>
              <label className="block text-gray-400 text-xs font-medium mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-blue-500/50 transition-colors"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="block text-gray-400 text-xs font-medium mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-blue-500/50 transition-colors"
                placeholder="••••••••"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg py-3 text-sm transition-colors"
            >
              {loading ? 'Creating account…' : 'Create account'}
            </button>
          </form>
        </div>

        {/* Links */}
        <div className="mt-4 text-center space-y-2">
          <p className="text-xs text-gray-600">
            Already have an account?{' '}
            <Link href="/auth/login" className="text-gray-400 hover:text-white transition-colors">
              Sign in
            </Link>
          </p>
          <Link href="/schedule" className="text-xs text-gray-600 hover:text-gray-400 transition-colors block mt-2">
            Continue without account →
          </Link>
        </div>
      </div>
    </div>
  )
}
