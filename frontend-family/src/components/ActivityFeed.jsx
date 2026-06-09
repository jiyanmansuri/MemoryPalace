import { useState, useEffect } from 'react'
import { formatDistanceToNow } from 'date-fns'

export default function ActivityFeed({ familyGroupId }) {
  const [events, setEvents] = useState([])

  useEffect(() => {
    const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'
    fetch(`${API_BASE}/api/family/feed?family_group_id=${familyGroupId}`)
      .then(res => res.json())
      .then(data => setEvents(data))
      .catch(e => console.error(e))
  }, [familyGroupId])

  return (
    <div className="flex flex-col gap-1 max-h-[400px] overflow-y-auto pr-3">
      {events.length === 0 ? (
        <div className="h-40 flex items-center justify-center text-gray-400 font-medium">No recent activity.</div>
      ) : (
        events.map((event, idx) => {
          const payload = JSON.parse(event.payload)
          const isFirst = idx === 0
          
          return (
            <div key={event.id} className="relative pl-6 py-4 border-b border-gray-50 last:border-0 hover:bg-gray-50/50 rounded-xl transition-colors">
              {/* Timeline dot */}
              <div className={`absolute left-0 top-6 w-2.5 h-2.5 rounded-full ${isFirst ? 'bg-family-primary ring-4 ring-indigo-50' : 'bg-gray-300'}`}></div>
              {/* Timeline line */}
              {idx !== events.length - 1 && <div className="absolute left-[4px] top-10 bottom-[-20px] w-[2px] bg-gray-100"></div>}
              
              <div className="flex gap-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-white shadow-sm border border-gray-100 text-2xl flex-shrink-0 z-10">
                  {event.event_type === 'mood_logged' && (
                    payload.mood === 'happy' ? '😀' :
                    payload.mood === 'calm' ? '😌' :
                    payload.mood === 'tired' ? '🥱' :
                    payload.mood === 'lonely' ? '😔' : '🤕'
                  )}
                  {event.event_type === 'medicine_taken' && '💊'}
                  {event.event_type === 'memory_recorded' && '🎤'}
                </div>
                <div className="flex-1 pt-1">
                  <p className="text-gray-900 font-medium">
                    {event.event_type === 'mood_logged' && <span>Ramabai is feeling <strong className="capitalize">{payload.mood}</strong></span>}
                    {event.event_type === 'medicine_taken' && <span>Took medicine: <strong>{payload.medicine_name}</strong> ({payload.dose})</span>}
                    {event.event_type === 'memory_recorded' && <span>Recorded memory: <strong>"{payload.title}"</strong></span>}
                  </p>
                  <p className="text-xs text-gray-400 mt-1.5 font-medium">{formatDistanceToNow(new Date(event.created_at), { addSuffix: true })}</p>
                </div>
              </div>
            </div>
          )
        })
      )}
    </div>
  )
}
