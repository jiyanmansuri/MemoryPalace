import { useState } from 'react'
import { UserPlus, MoreVertical, Heart, ShieldAlert } from 'lucide-react'

export default function FamilyGroup() {
  const [showInvite, setShowInvite] = useState(false)
  const [email, setEmail] = useState('')

  const handleInvite = (e) => {
    e.preventDefault()
    alert(`Invite sent to ${email}!`)
    setShowInvite(false)
    setEmail('')
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-end">
        <button 
          onClick={() => setShowInvite(true)}
          className="bg-family-primary text-white px-5 py-2.5 rounded-xl font-bold hover:bg-indigo-700 transition-colors flex items-center gap-2 shadow-sm active:scale-95"
        >
          <UserPlus size={18} /> Invite Member
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bento-card">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center text-3xl">👵</div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">Ramabai <ShieldAlert size={16} className="text-blue-500" /></h3>
                <p className="text-family-muted font-medium">Elder (Primary Care Receiver)</p>
              </div>
            </div>
            <button className="text-gray-400 hover:text-gray-600"><MoreVertical size={20} /></button>
          </div>
        </div>

        <div className="bento-card">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <img src="/arjun_avatar.png" className="w-16 h-16 rounded-full bg-gray-200 object-cover" onError={(e) => { e.target.src = 'https://ui-avatars.com/api/?name=Arjun+Patel&background=F5C842&color=fff' }} />
              <div>
                <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">Arjun Patel <Heart size={16} className="text-red-500" /></h3>
                <p className="text-family-muted font-medium">Admin (You)</p>
              </div>
            </div>
            <button className="text-gray-400 hover:text-gray-600"><MoreVertical size={20} /></button>
          </div>
        </div>
      </div>

      {showInvite && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl">
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Invite Family Member</h3>
            <p className="text-gray-500 mb-6 font-medium">They will receive an email to join your care circle.</p>
            <form onSubmit={handleInvite} className="flex flex-col gap-4">
              <input required type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email Address" className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-family-primary/20 focus:border-family-primary outline-none" />
              <div className="flex justify-end gap-3 mt-2">
                <button type="button" onClick={() => setShowInvite(false)} className="px-5 py-2.5 text-gray-500 font-bold hover:bg-gray-50 rounded-xl">Cancel</button>
                <button type="submit" className="px-5 py-2.5 bg-family-primary text-white font-bold rounded-xl shadow-sm hover:bg-indigo-700 active:scale-95">Send Invite</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
