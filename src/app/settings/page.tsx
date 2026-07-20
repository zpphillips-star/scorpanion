'use client'
import Link from 'next/link'

export default function SettingsPage() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6 text-center"
      style={{ background: '#0c1b31' }}
    >
      {/* Logo */}
      <div style={{ overflow: 'hidden', height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 32 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/scorpanion-logo-new.png"
          alt="Scorpanion"
          style={{ height: 110, width: 'auto', objectFit: 'contain' }}
          onError={(e) => { (e.target as HTMLImageElement).src = '/scorpanion-full.png' }}
        />
      </div>

      {/* Heading */}
      <h1
        className="font-display uppercase tracking-widest mb-3"
        style={{ fontSize: 28, fontWeight: 700, color: '#F2E6CF' }}
      >
        Settings
      </h1>

      {/* Body */}
      <p style={{ color: '#5F6773', fontSize: 15, maxWidth: 280, lineHeight: 1.6 }}>
        Coming soon — we&apos;re working on customization options.
      </p>

      {/* Back button */}
      <Link
        href="/home"
        className="mt-10 inline-flex items-center gap-2 transition-colors"
        style={{ color: '#a1a1aa', fontSize: 14 }}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M10 3L5 8L10 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Back to app
      </Link>
    </div>
  )
}
