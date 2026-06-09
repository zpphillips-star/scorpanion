import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import InstallPrompt from '@/components/InstallPrompt'

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Scorpanion — Seattle Sports',
  description: 'Track every Seattle sports team — Seahawks, Mariners, Kraken, Sounders, Storm, Reign, and more',
  manifest: '/manifest.json',
  openGraph: {
    title: 'Scorpanion — Seattle Sports',
    description: 'Track every Seattle sports team in one app',
    url: 'https://www.scorpanion.com',
    siteName: 'Scorpanion',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Scorpanion — Seattle Sports',
    description: 'Track every Seattle sports team in one app',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Scorpanion',
  },
}

export const viewport: Viewport = {
  themeColor: '#0a0a0f',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
}

const swScript = `
  window.__installPromptEvent = null;
  window.addEventListener('beforeinstallprompt', function(e) { e.preventDefault(); window.__installPromptEvent = e; });
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function() {
      navigator.serviceWorker.register('/sw.js').catch(function(e) { console.log('SW error:', e); });
      navigator.serviceWorker.getRegistration('/sw.js').then(function(reg) {
        if (reg && reg.waiting) { reg.waiting.postMessage({type:'SKIP_WAITING'}); }
        if (reg) reg.update();
      });
    });
    navigator.serviceWorker.addEventListener('controllerchange', function() {
      if (!sessionStorage.getItem('sw_reloaded')) {
        sessionStorage.setItem('sw_reloaded', '1');
        window.location.reload();
      }
    });
  }
`

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[#0a0a0f] text-white`}>
        <script dangerouslySetInnerHTML={{ __html: swScript }} />
        {children}
        <InstallPrompt />
      </body>
    </html>
  )
}
