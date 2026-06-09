import { useState, useEffect } from 'react'
import { CheckCircle, Circle } from 'lucide-react'

export default function Medicine({ elderId, setCurrentTab }) {
  const [medicines, setMedicines] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchMedicines()
  }, [])

  const fetchMedicines = async () => {
    try {
      const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'
      const res = await fetch(`${API_BASE}/api/medicine/today?user_id=${elderId}`)
      const data = await res.json()
      setMedicines(data)
      setLoading(false)
    } catch (e) {
      console.error(e)
    }
  }

  const handleTake = async (medicine_id, scheduled_at) => {
    try {
      const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'
      await fetch(`${API_BASE}/api/medicine/take/${medicine_id}?scheduled_at=${encodeURIComponent(scheduled_at)}&user_id=${elderId}`, {
        method: 'POST'
      })
      fetchMedicines()
    } catch (e) {
      console.error(e)
    }
  }

  const formatTime = (isoString) => {
    const d = new Date(isoString)
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="flex flex-col gap-8 mt-4">
      <button 
        onClick={() => setCurrentTab('home')} 
        className="self-start bg-white/80 border-2 border-elder-brown/20 text-elder-brown font-bold text-xl md:text-2xl py-3 px-6 rounded-full shadow-md flex items-center gap-3 transition-transform active:scale-95"
      >
        <span className="text-2xl md:text-3xl">⬅️</span> પાછા જાઓ (Back)
      </button>

      <div className="glass-card w-full p-6 md:p-10 text-center">
        <h2 className="text-3xl md:text-5xl font-display font-bold text-elder-brown mb-2 md:mb-4">આજની દવા</h2>
        <p className="text-xl md:text-2xl font-bold text-elder-brown">Today's Medicine Schedule</p>
      </div>
      
      {loading ? (
        <p className="text-center text-xl">Loading...</p>
      ) : medicines.length === 0 ? (
        <div className="glass-card p-10 text-center">
          <p className="text-2xl text-elder-brown/60">કોઈ દવા નથી (No medicine scheduled)</p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {medicines.map((med, idx) => (
            <div 
              key={`${med.medicine_id}-${idx}`} 
              className={`glass-card p-4 md:p-6 flex flex-col md:flex-row items-center justify-between border-l-8 md:border-l-[12px] transition-all duration-500 gap-4 md:gap-0 ${med.taken ? 'bg-gray-100 border-gray-400' : 'hover:-translate-y-1 hover:shadow-2xl'}`}
              style={{ borderLeftColor: med.taken ? '#9ca3af' : (med.color_hex || '#ccc') }}
            >
              <div className="flex flex-col gap-1 md:gap-2 w-full text-center md:text-left">
                <p className="font-display font-bold text-2xl md:text-4xl text-elder-brown mb-1 md:mb-2">{med.name}</p>
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 md:gap-4 justify-center md:justify-start">
                  <span className="bg-white/80 border-2 border-white px-3 md:px-4 py-1 md:py-2 rounded-lg md:rounded-xl text-lg md:text-2xl font-bold text-elder-brown w-fit mx-auto sm:mx-0">{med.dose}</span>
                  <span className="text-lg md:text-3xl font-bold text-elder-brown">{formatTime(med.scheduled_at)}</span>
                </div>
              </div>
              <button 
                onClick={() => !med.taken && handleTake(med.medicine_id, med.scheduled_at)}
                disabled={med.taken}
                className={`flex-shrink-0 w-full md:w-auto md:ml-4 flex items-center justify-center gap-3 transition-transform active:scale-95 rounded-2xl py-4 px-6 md:px-8 border-2 ${med.taken ? 'bg-elder-green/20 border-elder-green text-elder-green shadow-none' : 'bg-white/90 border-white text-elder-brown shadow-lg hover:bg-white'}`}
              >
                {med.taken ? (
                  <>
                    <CheckCircle className="w-8 h-8 md:w-10 md:h-10" fill="#96E6B3" color="white" />
                    <span className="text-xl md:text-2xl font-bold">દવા લીધી<br/>(Taken)</span>
                  </>
                ) : (
                  <>
                    <Circle className="w-8 h-8 md:w-10 md:h-10 text-gray-400 drop-shadow-sm" />
                    <span className="text-xl md:text-2xl font-bold">દવા લો<br/>(Take)</span>
                  </>
                )}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
