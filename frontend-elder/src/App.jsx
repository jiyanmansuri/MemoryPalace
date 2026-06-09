import { useState } from 'react'
import { Home as HomeIcon, Mic, Pill } from 'lucide-react'
import Home from './components/Home'
import Memories from './components/Memories'
import Medicine from './components/Medicine'

export default function App() {
  const [currentTab, setCurrentTab] = useState('home')
  const elderId = 1 // Hardcoded for demo

  return (
    <div className="min-h-screen pb-32 flex flex-col relative">
      {/* Decorative Blobs for Glassmorphism Background */}
      <div className="absolute top-10 left-10 w-64 h-64 bg-white/40 rounded-full blur-3xl mix-blend-overlay animate-float pointer-events-none"></div>
      <div className="absolute bottom-40 right-10 w-80 h-80 bg-elder-saffron/30 rounded-full blur-3xl mix-blend-overlay animate-float pointer-events-none" style={{animationDelay: '2s'}}></div>

      {/* Header */}
      <header className="p-8 pt-12 flex justify-center items-center relative z-10">
        <h1 className="text-elder-brown text-4xl drop-shadow-md">MemoryPalace</h1>
      </header>

      {/* Main Content with subtle transition */}
      <main className="flex-1 p-6 px-8 pb-48 overflow-y-auto relative z-10 animate-fade-in">
        {currentTab === 'home' && <Home elderId={elderId} setCurrentTab={setCurrentTab} />}
        {currentTab === 'memories' && <Memories elderId={elderId} setCurrentTab={setCurrentTab} />}
        {currentTab === 'medicine' && <Medicine elderId={elderId} setCurrentTab={setCurrentTab} />}
      </main>

      {/* Floating Glassmorphic Bottom Nav */}
      <div className="fixed bottom-8 left-0 w-full px-6 z-50">
        <nav className="glass-panel rounded-full flex justify-around p-4 shadow-2xl border border-white/60">
          <button 
            onClick={() => setCurrentTab('home')}
            className={`flex flex-col items-center p-3 rounded-[2rem] transition-all duration-300 ${currentTab === 'home' ? 'bg-elder-saffron text-white shadow-md transform scale-110' : 'text-elder-brown hover:bg-white/50'}`}
          >
            <HomeIcon size={44} strokeWidth={currentTab === 'home' ? 3 : 2} />
            <span className="font-bold mt-2 text-xl tracking-wide">ઘર (Home)</span>
          </button>
          
          <button 
            onClick={() => setCurrentTab('memories')}
            className={`flex flex-col items-center p-3 rounded-[2rem] transition-all duration-300 ${currentTab === 'memories' ? 'bg-elder-saffron text-white shadow-md transform scale-110' : 'text-elder-brown hover:bg-white/50'}`}
          >
            <Mic size={44} strokeWidth={currentTab === 'memories' ? 3 : 2} />
            <span className="font-bold mt-2 text-xl tracking-wide">યાદો (Memories)</span>
          </button>
          
          <button 
            onClick={() => setCurrentTab('medicine')}
            className={`flex flex-col items-center p-3 rounded-[2rem] transition-all duration-300 ${currentTab === 'medicine' ? 'bg-elder-saffron text-white shadow-md transform scale-110' : 'text-elder-brown hover:bg-white/50'}`}
          >
            <Pill size={44} strokeWidth={currentTab === 'medicine' ? 3 : 2} />
            <span className="font-bold mt-2 text-xl tracking-wide">દવા (Medicine)</span>
          </button>
        </nav>
      </div>
    </div>
  )
}
