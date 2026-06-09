import { useState, useEffect } from 'react'

export default function Home({ elderId, setCurrentTab }) {
  const [moodLogged, setMoodLogged] = useState(false)
  const [greeting, setGreeting] = useState('')

  useEffect(() => {
    const hour = new Date().getHours()
    if (hour < 12) setGreeting('શુભ સવાર (Good Morning)')
    else if (hour < 18) setGreeting('શુભ બપોર (Good Afternoon)')
    else setGreeting('શુભ સાંજ (Good Evening)')
  }, [])

  const handleMood = async (mood) => {
    const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'
    try {
      await fetch(`${API_BASE}/api/mood/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: elderId, mood })
      })
      setMoodLogged(true)
    } catch (e) {
      console.error(e)
    }
  }

  return (
    <div className="flex flex-col gap-10 items-center text-center mt-4">
      <div className="glass-card w-full p-6 md:p-10">
        <h2 className="text-3xl md:text-5xl font-display font-bold text-elder-brown mb-2 md:mb-4">{greeting}, Ramabai!</h2>
        <p className="text-xl md:text-3xl font-bold text-elder-brown mt-2 md:mt-4">કેમ છો? (How are you feeling today?)</p>
      </div>
      
      {moodLogged ? (
        <div className="bg-elder-green text-[#111827] p-8 rounded-3xl w-full shadow-xl border-4 border-white flex flex-col items-center gap-6 animate-fade-in">
          <p className="text-3xl font-bold">નોંધાયેલ! (Logged successfully!)</p>
          <button onClick={() => setMoodLogged(false)} className="btn-premium text-2xl py-4 px-10">
            બંધ કરો (Close)
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap justify-center gap-4 md:gap-6">
          <button onClick={() => handleMood('happy')} className="btn-glass-icon w-28 h-32 md:w-40 md:h-44 flex flex-col gap-2 p-2">
            <span className="text-5xl md:text-6xl transform transition-transform hover:scale-110">😀</span>
            <span className="text-xl font-bold text-elder-brown">ખુશ<br/>(Happy)</span>
          </button>
          <button onClick={() => handleMood('calm')} className="btn-glass-icon w-28 h-32 md:w-40 md:h-44 flex flex-col gap-2 p-2">
            <span className="text-5xl md:text-6xl transform transition-transform hover:scale-110">😌</span>
            <span className="text-xl font-bold text-elder-brown">શાંત<br/>(Calm)</span>
          </button>
          <button onClick={() => handleMood('tired')} className="btn-glass-icon w-28 h-32 md:w-40 md:h-44 flex flex-col gap-2 p-2">
            <span className="text-5xl md:text-6xl transform transition-transform hover:scale-110">🥱</span>
            <span className="text-xl font-bold text-elder-brown">થાકેલા<br/>(Tired)</span>
          </button>
          <button onClick={() => handleMood('lonely')} className="btn-glass-icon w-28 h-32 md:w-40 md:h-44 flex flex-col gap-2 p-2">
            <span className="text-5xl md:text-6xl transform transition-transform hover:scale-110">😔</span>
            <span className="text-xl font-bold text-elder-brown">એકલા<br/>(Lonely)</span>
          </button>
          <button onClick={() => handleMood('pain')} className="btn-glass-icon w-28 h-32 md:w-40 md:h-44 flex flex-col gap-2 p-2">
            <span className="text-5xl md:text-6xl transform transition-transform hover:scale-110">🤕</span>
            <span className="text-xl font-bold text-elder-brown">દર્દ<br/>(Pain)</span>
          </button>
        </div>
      )}

      <div className="w-full mt-8 md:mt-12 flex flex-col gap-4 md:gap-6">
        <button className="btn-premium text-xl md:text-3xl py-4 md:py-6" onClick={() => setCurrentTab('medicine')}>
          દવા લેવાનો સમય (Take Medicine)
        </button>
        <button className="btn-premium-secondary text-xl md:text-3xl py-4 md:py-6" onClick={() => setCurrentTab('memories')}>
          વાર્તા કહો (Tell a Story)
        </button>
      </div>
    </div>
  )
}
