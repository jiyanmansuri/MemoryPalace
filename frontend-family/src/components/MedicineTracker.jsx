import { useState, useEffect } from 'react'
import { Plus, X } from 'lucide-react'

export default function MedicineTracker({ elderId }) {
  const [medicines, setMedicines] = useState([])
  const [showAddModal, setShowAddModal] = useState(false)
  const [newMed, setNewMed] = useState({ name: '', dose: '', schedule: '09:00', color_hex: '#4F46E5' })

  const fetchMedicines = () => {
    const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'
    fetch(`${API_BASE}/api/medicine/today?user_id=${elderId}`)
      .then(res => res.json())
      .then(data => setMedicines(data))
      .catch(e => console.error(e))
  }

  useEffect(() => {
    fetchMedicines()
  }, [elderId])

  const handleAddMedicine = async (e) => {
    e.preventDefault()
    try {
      const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'
      await fetch(`${API_BASE}/api/medicine/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: elderId,
          name: newMed.name,
          dose: newMed.dose,
          schedule: newMed.schedule,
          color_hex: newMed.color_hex
        })
      })
      setShowAddModal(false)
      setNewMed({ name: '', dose: '', schedule: '09:00', color_hex: '#4F46E5' })
      fetchMedicines() // Refresh the list
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Header action */}
      <div className="flex justify-end">
        <button 
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1 text-sm font-semibold text-family-primary hover:text-indigo-700 bg-indigo-50 px-3 py-1.5 rounded-lg active:scale-95 transition-all"
        >
          <Plus size={16} /> Add Medicine
        </button>
      </div>

      {medicines.length === 0 ? (
        <p className="text-gray-400 font-medium">No medicines scheduled today.</p>
      ) : (
        medicines.map((med, idx) => {
          const isOverdue = !med.taken && new Date() > new Date(med.scheduled_at)
          return (
            <div key={idx} className="group flex items-center justify-between p-4 rounded-2xl border border-gray-100 bg-white shadow-sm hover:shadow-md transition-all">
              <div className="flex items-center gap-4">
                <div 
                  className="w-2 h-12 rounded-full" 
                  style={{ backgroundColor: med.color_hex || '#ccc' }}
                ></div>
                <div>
                  <p className="font-bold text-gray-900">{med.name} <span className="text-gray-400 text-xs ml-1 font-medium bg-gray-50 px-2 py-1 rounded-md">{med.dose}</span></p>
                  <p className="text-sm text-gray-500 font-medium mt-1">{new Date(med.scheduled_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                </div>
              </div>
              <div>
                {med.taken ? (
                  <span className="px-3 py-1.5 rounded-lg bg-green-50 text-green-700 text-xs font-bold border border-green-100">Taken</span>
                ) : isOverdue ? (
                  <span className="px-3 py-1.5 rounded-lg bg-red-50 text-red-700 text-xs font-bold border border-red-100 animate-pulse">Overdue</span>
                ) : (
                  <span className="px-3 py-1.5 rounded-lg bg-gray-50 text-gray-600 text-xs font-bold border border-gray-100">Upcoming</span>
                )}
              </div>
            </div>
          )
        })
      )}

      {/* Add Medicine Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-900">Add New Medicine</h3>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
            </div>
            <form onSubmit={handleAddMedicine} className="flex flex-col gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Medicine Name</label>
                <input required type="text" value={newMed.name} onChange={e => setNewMed({...newMed, name: e.target.value})} className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-family-primary/20 focus:border-family-primary outline-none" placeholder="e.g. Lisinopril" />
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Dose</label>
                  <input required type="text" value={newMed.dose} onChange={e => setNewMed({...newMed, dose: e.target.value})} className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-family-primary/20 focus:border-family-primary outline-none" placeholder="e.g. 10mg" />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Time (HH:MM)</label>
                  <input required type="time" value={newMed.schedule} onChange={e => setNewMed({...newMed, schedule: e.target.value})} className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-family-primary/20 focus:border-family-primary outline-none" />
                </div>
              </div>
              <button type="submit" className="mt-4 bg-family-primary text-white font-bold py-3 rounded-xl hover:bg-indigo-700 transition-colors active:scale-95">Save Medicine</button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
