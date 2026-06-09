import { useState, useEffect } from 'react'
import ActivityFeed from './ActivityFeed'
import MedicineTracker from './MedicineTracker'
import MoodChart from './MoodChart'
import { AlertTriangle, Activity, Pill, Mic } from 'lucide-react'

export default function Dashboard({ familyGroupId, elderId, alerts, setAlerts }) {
  const handleSendNudge = async (medicineName) => {
    try {
      const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'
      await fetch(`${API_BASE}/api/family/nudge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: elderId, message: `Reminder for medicine: ${medicineName}` })
      })
      // Remove alert from state after nudging
      setAlerts(prev => prev.filter(a => !a.includes(medicineName)))
    } catch (e) {
      console.error(e)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {alerts.length > 0 && (
        <div className="bg-red-50/80 backdrop-blur border border-red-100 p-5 rounded-2xl shadow-sm flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center text-red-500">
              <AlertTriangle size={24} />
            </div>
            <div>
              <h3 className="text-red-900 font-bold text-lg">Action Required</h3>
              {alerts.map((a, i) => <p key={i} className="text-red-700 text-sm">{a}</p>)}
            </div>
          </div>
          <button 
            onClick={() => handleSendNudge(alerts[0].split('medicine: ')[1].split(' (')[0])}
            className="bg-white border border-red-200 text-red-600 px-5 py-2.5 rounded-xl font-bold hover:bg-red-50 transition-colors shadow-sm active:scale-95"
          >
            Send Nudge
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Column */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* Mood Chart Bento */}
          <div className="bento-card col-span-2">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center text-family-primary">
                  <Activity size={20} />
                </div>
                <h2 className="text-xl font-bold text-gray-900">Mood Weekly Trend</h2>
              </div>
              <button 
                onClick={() => alert('Full 30-day History view is coming in V2!')}
                className="text-sm font-semibold text-family-primary hover:text-indigo-700 active:scale-95 transition-transform"
              >
                View History
              </button>
            </div>
            <div className="h-[280px]">
              <MoodChart elderId={elderId} />
            </div>
          </div>
          
          {/* Activity Feed Bento */}
          <div className="bento-card flex-1">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center text-orange-500">
                <Mic size={20} />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Live Activity Feed</h2>
            </div>
            <ActivityFeed familyGroupId={familyGroupId} />
          </div>
        </div>
        
        {/* Side Column */}
        <div className="flex flex-col gap-6">
          {/* Medicine Tracker Bento */}
          <div className="bento-card flex-1">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center text-green-500">
                <Pill size={20} />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Medicine Adherence</h2>
            </div>
            <MedicineTracker elderId={elderId} />
          </div>
        </div>
      </div>
    </div>
  )
}
