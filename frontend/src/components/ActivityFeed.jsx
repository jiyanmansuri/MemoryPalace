import { useState, useEffect } from 'react'
import { formatDistanceToNow } from 'date-fns'

export default function ActivityFeed({ familyGroupId }) {
  const [events, setEvents] = useState([])
  const [users, setUsers] = useState([])

  useEffect(() => {
    const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'
    
    // Fetch events
    const fetchEvents = () => {
      fetch(`${API_BASE}/api/family/feed?family_group_id=${familyGroupId}`)
        .then(res => res.json())
        .then(data => setEvents(data))
        .catch(e => console.error(e))
    }
    
    fetchEvents()
    window.addEventListener('medical-summary-updated', fetchEvents)
    window.addEventListener('family-feed-updated', fetchEvents)
    
    return () => {
      window.removeEventListener('medical-summary-updated', fetchEvents)
      window.removeEventListener('family-feed-updated', fetchEvents)
    }

    // Fetch users
    fetch(`${API_BASE}/api/auth/users`)
      .then(res => res.json())
      .then(data => setUsers(data))
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
          const eventUser = users.find(u => u.id === event.user_id)
          const userName = eventUser ? eventUser.name : 'Someone'
          
          return (
            <div key={event.id} className="relative pl-6 py-4 border-b border-gray-50 last:border-0 hover:bg-gray-50/50 rounded-xl transition-colors">
              {/* Timeline dot */}
              <div className={`absolute left-0 top-6 w-2.5 h-2.5 rounded-full ${event.event_type === 'emergency_alert' ? 'bg-red-500 ring-4 ring-red-50 animate-pulse' : isFirst ? 'bg-family-primary ring-4 ring-indigo-50' : 'bg-gray-300'}`}></div>
              {/* Timeline line */}
              {idx !== events.length - 1 && <div className="absolute left-[4px] top-10 bottom-[-20px] w-[2px] bg-gray-100"></div>}
              
              <div className="flex gap-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-white shadow-sm border border-gray-100 text-2xl flex-shrink-0 z-10">
                  {event.event_type === 'mood_logged' && (
                    payload.mood === 'happy' ? '😀' :
                    payload.mood === 'calm' ? '😌' :
                    payload.mood === 'tired' ? '🥱' :
                    payload.mood === 'lonely' ? '😔' :
                    payload.mood === 'sleeping' ? '🛌' :
                    payload.mood === 'awake' ? '☀️' : '🤕'
                  )}
                  {event.event_type === 'medicine_taken' && '💊'}
                  {event.event_type === 'memory_recorded' && '🎤'}
                  {event.event_type === 'emergency_alert' && '🚨'}
                  {event.event_type === 'medical_summary' && '🩺'}
                  {event.event_type === 'voice_message' && '💬'}
                </div>
                <div className="flex-1 pt-1">
                  <p className="text-gray-900 font-medium">
                    {event.event_type === 'mood_logged' && (
                      payload.mood === 'sleeping' ? (
                        <span><strong>{userName}</strong> went to sleep 🛌</span>
                      ) : payload.mood === 'awake' ? (
                        <span><strong>{userName}</strong> woke up ☀️</span>
                      ) : (
                        <span><strong>{userName}</strong> is feeling <strong className="capitalize">{payload.mood}</strong></span>
                      )
                    )}
                    {event.event_type === 'medicine_taken' && <span>Took medicine: <strong>{payload.medicine_name}</strong> ({payload.dose})</span>}
                    {event.event_type === 'memory_recorded' && <span>Recorded memory: <strong>"{payload.title}"</strong></span>}
                    {event.event_type === 'emergency_alert' && (
                      <span className="text-red-600 font-bold">
                        🚨 Emergency Alert: <strong>{userName}</strong> did not take medicine <strong>{payload.medicine_name}</strong> within 15 minutes!
                      </span>
                    )}
                    {event.event_type === 'voice_message' && (
                      <span><strong>{userName}</strong> sent a voice message: <em className="text-indigo-600 font-bold">"{payload.message}"</em></span>
                    )}
                    {event.event_type === 'medical_summary' && (
                      <div className="bg-indigo-50 p-4 rounded-xl mt-2 border border-indigo-100">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-indigo-800 font-bold">Medical Summary Generated</span>
                        </div>
                        <ul className="text-sm space-y-1 text-gray-700">
                          <li><strong>Chief Complaint:</strong> {payload.chief_complaint}</li>
                          <li><strong>Duration:</strong> {payload.duration}</li>
                          <li><strong>Severity:</strong> {payload.severity}/10</li>
                          {payload.red_flags && payload.red_flags.length > 0 && <li><strong>Red Flags:</strong> {payload.red_flags.join(', ')}</li>}
                          {payload.current_medicines && payload.current_medicines.length > 0 && <li><strong>Current Meds:</strong> {payload.current_medicines.join(', ')}</li>}
                          <li><strong>Notes:</strong> {payload.notes}</li>
                        </ul>
                        <button className="mt-3 bg-white border border-indigo-200 text-indigo-700 px-4 py-1.5 rounded-lg text-sm font-bold shadow-sm hover:bg-indigo-50 w-full" onClick={() => alert('Summary ready to be sent to Doctor!')}>Send to Doctor</button>
                      </div>
                    )}
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

