'use client'
import { useState } from 'react'

const CANNED_RESPONSE = `I'm the Seattle Sports assistant! Here's what I can help with:

**📅 Schedule Tab** — View all upcoming games for your selected Seattle teams, sorted by date. Live games appear at the top with real-time scores.

**📆 Calendar Tab** — Monthly calendar view with colored dots for each game. Tap any day to see that day's games.

**🏆 Teams Tab** — Select which Seattle teams you follow. Your preferences are saved locally. Supported teams:
• Seattle Seahawks (NFL)
• Seattle Mariners (MLB)
• Seattle Kraken (NHL)
• Seattle Sounders FC (MLS)
• Seattle Reign FC (NWSL)
• Washington Huskies Football & Basketball (NCAA)
• Washington State Cougars Football (NCAA)

**Live Scores** — The app polls ESPN every 30 seconds normally, and every 5 seconds when a game is live.

All data comes from ESPN's public APIs. Have fun following Seattle sports! 🦅⚾🏒⚽`

export default function AssistantPage() {
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant', content: string }[]>([
    { role: 'assistant', content: CANNED_RESPONSE }
  ])

  const handleSend = () => {
    if (!input.trim()) return
    setMessages(prev => [
      ...prev,
      { role: 'user', content: input },
      { role: 'assistant', content: CANNED_RESPONSE }
    ])
    setInput('')
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <div className="sticky top-0 z-30 px-4 py-3 bg-[#0a0a0f]/95 backdrop-blur-md border-b border-white/10">
        <h1 className="text-xl font-bold text-white">Assistant</h1>
      </div>
      
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-blue-600 text-white rounded-br-sm'
                  : 'bg-white/10 text-gray-200 rounded-bl-sm'
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
      </div>
      
      <div className="px-4 py-3 border-t border-white/10 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
          placeholder="Ask about Seattle Sports..."
          className="flex-1 bg-white/10 text-white placeholder-gray-500 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-1 focus:ring-blue-500"
        />
        <button
          onClick={handleSend}
          className="bg-blue-600 hover:bg-blue-500 text-white rounded-xl px-4 py-2.5 text-sm font-medium transition-colors"
        >
          Send
        </button>
      </div>
    </div>
  )
}
