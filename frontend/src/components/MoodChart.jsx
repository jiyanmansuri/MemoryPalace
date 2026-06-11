import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

export default function MoodChart({ elderId }) {
  // Mock data for the last 7 days
  const data = [
    { day: 'Mon', mood: 4, label: 'Happy' },
    { day: 'Tue', mood: 3, label: 'Calm' },
    { day: 'Wed', mood: 4, label: 'Happy' },
    { day: 'Thu', mood: 2, label: 'Tired' },
    { day: 'Fri', mood: 3, label: 'Calm' },
    { day: 'Sat', mood: 1, label: 'Lonely' },
    { day: 'Sun', mood: 4, label: 'Happy' }
  ]

  const customTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-900/90 backdrop-blur text-white px-4 py-3 rounded-xl shadow-xl border border-gray-700">
          <p className="font-bold text-gray-300 text-sm mb-1">{label}</p>
          <div className="flex items-center gap-2">
            <span className="text-2xl">
              {payload[0].payload.mood === 5 ? '🤩' :
               payload[0].payload.mood === 4 ? '😀' :
               payload[0].payload.mood === 3 ? '😌' :
               payload[0].payload.mood === 2 ? '🥱' : '😔'}
            </span>
            <span className="font-semibold">{payload[0].payload.label}</span>
          </div>
        </div>
      )
    }
    return null
  }

  return (
    <div className="h-full w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
          <defs>
            <linearGradient id="colorMood" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#4F46E5" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
          <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12, fontWeight: 500}} dy={10} />
          <YAxis 
            domain={[1, 5]} 
            ticks={[1, 2, 3, 4, 5]} 
            tickFormatter={(val) => {
              const emojiMap = {1: '😔', 2: '🥱', 3: '😌', 4: '😀', 5: '🤩'}
              return emojiMap[val] || ''
            }}
            axisLine={false} 
            tickLine={false}
            dx={-10}
            style={{ fontSize: '1.2rem' }}
          />
          <Tooltip content={customTooltip} cursor={{ stroke: '#e5e7eb', strokeWidth: 2, strokeDasharray: '4 4' }} />
          <Area type="monotone" dataKey="mood" stroke="#4F46E5" strokeWidth={3} fillOpacity={1} fill="url(#colorMood)" activeDot={{ r: 8, strokeWidth: 0, fill: '#F5C842' }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
