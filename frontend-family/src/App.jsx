import { useState, useEffect } from 'react'
import Dashboard from './components/Dashboard'
import FamilyGroup from './components/FamilyGroup'
import SettingsView from './components/SettingsView'
import { LayoutDashboard, Users, Settings, Bell, Search, HeartPulse } from 'lucide-react'

export default function App() {
  const [currentView, setCurrentView] = useState('overview')
  const [alerts, setAlerts] = useState([])
  const [showNotifications, setShowNotifications] = useState(false)
  
  const elderId = 1
  const familyGroupId = 1

  useEffect(() => {
    const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'
    fetch(`${API_BASE}/api/medicine/today?user_id=${elderId}`)
      .then(res => res.json())
      .then(data => {
        const missed = data.filter(m => !m.taken && new Date() - new Date(m.scheduled_at) > 3600000)
        if (missed.length > 0) {
          setAlerts(missed.map(m => `Missed medicine: ${m.name} (${m.dose}) at ${new Date(m.scheduled_at).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}`))
        }
      })
      .catch(e => console.error(e))
  }, [elderId])

  return (
    <div className="min-h-screen bg-family-bg flex overflow-hidden">
      {/* Sleek Sidebar */}
      <aside className="w-64 glass-sidebar hidden md:flex flex-col z-20">
        <div className="p-6 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-family-primary to-indigo-400 flex items-center justify-center shadow-glow">
            <HeartPulse className="text-white" size={24} />
          </div>
          <h1 className="text-xl font-bold font-display text-gray-900 tracking-tight">MemoryPalace</h1>
        </div>
        
        <nav className="flex-1 px-4 py-4 space-y-2">
          <button onClick={() => setCurrentView('overview')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold transition-colors ${currentView === 'overview' ? 'bg-family-primary/10 text-family-primary' : 'text-family-muted hover:bg-gray-50'}`}>
            <LayoutDashboard size={20} />
            Overview
          </button>
          <button onClick={() => setCurrentView('family')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold transition-colors ${currentView === 'family' ? 'bg-family-primary/10 text-family-primary' : 'text-family-muted hover:bg-gray-50'}`}>
            <Users size={20} />
            Family Group
          </button>
          <button onClick={() => setCurrentView('settings')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold transition-colors ${currentView === 'settings' ? 'bg-family-primary/10 text-family-primary' : 'text-family-muted hover:bg-gray-50'}`}>
            <Settings size={20} />
            Settings
          </button>
        </nav>
        
        <div className="p-6 border-t border-gray-100">
          <div className="flex items-center gap-3">
            <img src="/arjun_avatar.png" alt="Arjun" className="w-10 h-10 rounded-full shadow-sm object-cover bg-gray-200" onError={(e) => { e.target.src = 'https://ui-avatars.com/api/?name=Arjun+Patel&background=F5C842&color=fff' }} />
            <div>
              <p className="text-sm font-bold text-gray-900">Arjun Patel</p>
              <p className="text-xs text-family-muted">Family Admin</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
        {/* Top Header */}
        <header className="h-20 bg-white/50 backdrop-blur-md border-b border-gray-100 flex items-center justify-between px-8 z-30">
          <div className="flex items-center gap-4 bg-white px-4 py-2 rounded-full border border-gray-200 shadow-sm w-96">
            <Search size={18} className="text-gray-400" />
            <input type="text" placeholder="Search memories, events..." className="bg-transparent border-none outline-none text-sm w-full" />
          </div>
          <div className="flex items-center gap-4 relative">
            <button 
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 text-gray-400 hover:text-family-primary transition-colors"
            >
              <Bell size={24} />
              {alerts.length > 0 && (
                <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
              )}
            </button>
            
            {/* Notifications Dropdown */}
            {showNotifications && (
              <div className="absolute top-12 right-0 w-80 bg-white rounded-2xl shadow-xl border border-gray-100 p-4 z-50 animate-fade-in">
                <h3 className="font-bold text-gray-900 mb-3 px-2">Notifications</h3>
                {alerts.length === 0 ? (
                  <p className="text-gray-500 text-sm px-2 py-4">No new notifications.</p>
                ) : (
                  <div className="flex flex-col gap-2 max-h-64 overflow-y-auto">
                    {alerts.map((a, i) => (
                      <div key={i} className="bg-red-50 p-3 rounded-xl border border-red-100">
                        <p className="text-red-700 text-sm font-medium">{a}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </header>
        
        {/* Scrollable Main Area */}
        <main className="flex-1 overflow-y-auto p-8 relative z-10">
          <div className="max-w-6xl mx-auto">
            <div className="flex justify-between items-end mb-8">
              <div>
                <h2 className="text-3xl font-bold font-display text-gray-900">
                  {currentView === 'overview' ? 'Welcome back, Arjun' : 
                   currentView === 'family' ? 'Family Group' : 'Settings'}
                </h2>
                <p className="text-family-muted mt-1">
                  {currentView === 'overview' ? 'Here is how Ramabai is doing today.' : 
                   currentView === 'family' ? 'Manage your caregiving circle.' : 'Adjust app preferences.'}
                </p>
              </div>
            </div>
            
            <div className="animate-fade-in">
              {currentView === 'overview' && <Dashboard familyGroupId={familyGroupId} elderId={elderId} alerts={alerts} setAlerts={setAlerts} />}
              {currentView === 'family' && <FamilyGroup />}
              {currentView === 'settings' && <SettingsView />}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
