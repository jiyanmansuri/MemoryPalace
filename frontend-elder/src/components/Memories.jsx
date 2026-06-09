import { useState, useEffect, useRef } from 'react'
import { Mic, Square, Play } from 'lucide-react'

export default function Memories({ elderId, setCurrentTab }) {
  const [isRecording, setIsRecording] = useState(false)
  const [memories, setMemories] = useState([])
  const [loading, setLoading] = useState(true)
  const [prompt, setPrompt] = useState(null)
  
  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])

  useEffect(() => {
    fetchMemories()
  }, [])

  const fetchMemories = async () => {
    try {
      const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'
      const res = await fetch(`${API_BASE}/api/memory/list?user_id=${elderId}`)
      const data = await res.json()
      setMemories(data)
      setLoading(false)
    } catch (e) {
      console.error(e)
    }
  }

  const handleRecordToggle = async () => {
    if (isRecording) {
      // Stop recording
      setIsRecording(false)
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stop()
      }
    } else {
      // Start recording
      setPrompt(null)
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        const mediaRecorder = new MediaRecorder(stream)
        mediaRecorderRef.current = mediaRecorder
        audioChunksRef.current = []

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data)
          }
        }

        mediaRecorder.onstop = async () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
          const formData = new FormData()
          formData.append('user_id', elderId)
          formData.append('title', 'મારી નાનપણની વાર્તા (My childhood story)')
          formData.append('audio', audioBlob, 'audio.webm')

          try {
            setPrompt('વિચારી રહ્યા છીએ... (Thinking...)')
            const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'
            const res = await fetch(`${API_BASE}/api/memory/record`, {
              method: 'POST',
              body: formData
            })
            const data = await res.json()
            setPrompt(data.prompt)
            fetchMemories()
          } catch (e) {
            console.error(e)
            setPrompt('ભૂલ આવી. (Error occurred.)')
          }
          
          // Stop the microphone tracks so the red recording dot goes away
          stream.getTracks().forEach(track => track.stop())
        }

        mediaRecorder.start()
        setIsRecording(true)
      } catch (err) {
        console.error("Error accessing microphone:", err)
        alert("Microphone access is required to record memories.")
      }
    }
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
        <h2 className="text-3xl md:text-5xl font-display font-bold text-elder-brown mb-2 md:mb-4">તમારી વાર્તા (Your Stories)</h2>
        <p className="text-xl md:text-2xl font-bold text-elder-brown">Press the microphone to start.</p>
      </div>

      {prompt && (
        <div className="bg-white border-l-8 border-elder-saffron p-4 md:p-6 rounded-3xl shadow-xl flex items-center gap-3 md:gap-4 animate-float mx-2 md:mx-0">
          <div className="w-14 h-14 md:w-20 md:h-20 bg-elder-saffron/20 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-3xl md:text-4xl">🤖</span>
          </div>
          <p className="text-xl md:text-3xl font-bold text-elder-brown leading-snug">{prompt}</p>
        </div>
      )}

      <div className="flex justify-center relative my-4">
        {isRecording && (
          <div className="absolute inset-0 bg-red-400 rounded-[3rem] animate-pulse-glow" style={{ zIndex: 0 }}></div>
        )}
        <button 
          onClick={handleRecordToggle}
          className={`relative z-10 w-full py-6 md:py-8 rounded-[3rem] flex flex-col items-center justify-center gap-3 md:gap-4 transition-all duration-500 shadow-2xl border-4 min-h-[120px] md:min-h-[160px] ${isRecording ? 'bg-red-500 text-white border-red-300 scale-105' : 'bg-gradient-to-tr from-elder-saffron to-elder-peach text-white border-white hover:scale-105 active:scale-95'}`}
        >
          {isRecording ? <Square fill="currentColor" className="animate-pulse w-12 h-12 md:w-20 md:h-20" /> : <Mic className="drop-shadow-md w-12 h-12 md:w-20 md:h-20" />}
          <span className="text-2xl md:text-4xl font-display font-bold drop-shadow-md mt-1 md:mt-2">
            {isRecording ? 'રોકો (Stop)' : 'બોલો (Speak)'}
          </span>
        </button>
      </div>

      <div className="mt-6 md:mt-8 flex flex-col gap-4 md:gap-6">
        <h3 className="text-2xl md:text-3xl font-display font-bold ml-2 text-elder-brown">ભૂતકાળની યાદો (Past Memories)</h3>
        {loading ? (
          <p className="ml-2 text-xl md:text-2xl font-bold text-elder-brown">Loading...</p>
        ) : memories.length === 0 ? (
          <p className="ml-2 text-xl md:text-2xl font-bold text-elder-brown">કોઈ યાદો નથી (No memories yet)</p>
        ) : (
          memories.map((m, i) => (
            <div key={m.id} className="glass-card flex flex-col sm:flex-row items-start sm:items-center justify-between p-5 md:p-8 gap-4 sm:gap-0 animate-fade-in" style={{animationDelay: `${i * 0.1}s`}}>
              <div>
                <p className="font-bold text-2xl md:text-3xl text-elder-brown mb-1 md:mb-2">{m.title}</p>
                <p className="text-lg md:text-xl font-bold text-elder-brown">{new Date(m.created_at).toLocaleDateString()}</p>
              </div>
              <button className="self-end sm:self-auto bg-elder-saffron/20 text-elder-brown font-bold px-6 py-4 rounded-2xl flex items-center gap-3 hover:bg-elder-saffron hover:text-white transition-colors border-2 border-elder-saffron/40">
                <Play fill="currentColor" className="w-6 h-6 md:w-8 md:h-8" />
                <span className="text-xl md:text-2xl">સાંભળો<br/>(Listen)</span>
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
