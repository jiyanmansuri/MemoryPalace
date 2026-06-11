import { useState, useEffect } from 'react'
import { Plus, X, Camera, Trash2 } from 'lucide-react'

export default function MedicineTracker({ elderId }) {
  const [medicines, setMedicines] = useState([])
  const [showAddModal, setShowAddModal] = useState(false)
  const [newMed, setNewMed] = useState({ name: '', dose: '', schedule: '09:00', color_hex: '#4F46E5' })
  const [selectedPhoto, setSelectedPhoto] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)

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

  const handlePhotoChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setSelectedPhoto(file)
      setPreviewUrl(URL.createObjectURL(file))
    }
  }

  const handleAddMedicine = async (e) => {
    e.preventDefault()
    try {
      const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'
      const formData = new FormData()
      formData.append('user_id', elderId)
      formData.append('name', newMed.name)
      formData.append('dose', newMed.dose)
      formData.append('schedule', newMed.schedule)
      formData.append('color_hex', newMed.color_hex)
      if (selectedPhoto) {
        formData.append('photo', selectedPhoto)
      }

      await fetch(`${API_BASE}/api/medicine/add`, {
        method: 'POST',
        body: formData
      })
      setShowAddModal(false)
      setNewMed({ name: '', dose: '', schedule: '09:00', color_hex: '#4F46E5' })
      setSelectedPhoto(null)
      setPreviewUrl(null)
      fetchMedicines()
    } catch (err) {
      console.error(err)
    }
  }

  const handleDeleteMedicine = async (medicineId) => {
    if (!window.confirm("Are you sure you want to remove this medicine?")) return
    try {
      const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'
      const res = await fetch(`${API_BASE}/api/medicine/delete/${medicineId}`, {
        method: 'DELETE'
      })
      if (res.ok) {
        fetchMedicines()
        window.dispatchEvent(new CustomEvent('medicine-taken-updated'))
      }
    } catch (err) {
      console.error(err)
    }
  }

  const getMedicinePhoto = (med) => {
    if (med.photo_path) {
      const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'
      return `${API_BASE}/${med.photo_path}`
    }
    const cleanName = med.name.toLowerCase().trim()
    if (cleanName.includes('amlodipine')) return '/amlodipine.png'
    if (cleanName.includes('metformin')) return '/metformin.png'
    if (cleanName.includes('heart booster')) return '/heart_booster.png'
    return '/default_pill.png'
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
                <img 
                  src={getMedicinePhoto(med)} 
                  alt={med.name} 
                  className={`w-12 h-12 rounded-xl object-cover border border-gray-100 ${med.taken ? 'opacity-60 grayscale' : ''}`}
                />
                <div>
                  <p className="font-bold text-gray-900">{med.name} <span className="text-gray-400 text-xs ml-1 font-medium bg-gray-50 px-2 py-1 rounded-md">{med.dose}</span></p>
                  <p className="text-sm text-gray-500 font-medium mt-1">{new Date(med.scheduled_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {med.taken ? (
                  <span className="px-3 py-1.5 rounded-lg bg-green-50 text-green-700 text-xs font-bold border border-green-100">Taken</span>
                ) : isOverdue ? (
                  <span className="px-3 py-1.5 rounded-lg bg-red-50 text-red-700 text-xs font-bold border border-red-100 animate-pulse">Overdue</span>
                ) : (
                  <span className="px-3 py-1.5 rounded-lg bg-gray-50 text-gray-600 text-xs font-bold border border-gray-100">Upcoming</span>
                )}
                <button
                  onClick={() => handleDeleteMedicine(med.medicine_id)}
                  className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg active:scale-95 transition-all"
                  title="Remove Medicine"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          )
        })
      )}

      {/* Add Medicine Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl p-5 w-full max-w-md shadow-2xl max-h-[95vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-900">Add New Medicine</h3>
              <button onClick={() => {
                setShowAddModal(false)
                setSelectedPhoto(null)
                setPreviewUrl(null)
              }} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <form onSubmit={handleAddMedicine} className="flex flex-col gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-0.5">Medicine Name</label>
                <input required type="text" value={newMed.name} onChange={e => setNewMed({...newMed, name: e.target.value})} className="w-full px-3 py-1.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-family-primary/20 focus:border-family-primary outline-none text-sm" placeholder="e.g. Lisinopril" />
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-gray-700 mb-0.5">Dose</label>
                  <input required type="text" value={newMed.dose} onChange={e => setNewMed({...newMed, dose: e.target.value})} className="w-full px-3 py-1.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-family-primary/20 focus:border-family-primary outline-none text-sm" placeholder="e.g. 10mg" />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-gray-700 mb-0.5">Time (HH:MM)</label>
                  <input required type="time" value={newMed.schedule} onChange={e => setNewMed({...newMed, schedule: e.target.value})} className="w-full px-3 py-1.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-family-primary/20 focus:border-family-primary outline-none text-sm" />
                </div>
              </div>

              {/* Photo Upload Section */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Medicine Photo (Optional)</label>
                <div className="flex items-center gap-3">
                  <label className="flex-1 flex flex-col items-center justify-center border border-dashed border-gray-300 hover:border-family-primary bg-gray-50 rounded-lg p-2.5 cursor-pointer hover:bg-indigo-50/20 transition-all text-center">
                    <input 
                      type="file" 
                      accept="image/*"
                      onChange={handlePhotoChange}
                      className="hidden" 
                    />
                    <Camera size={18} className="text-gray-400 mb-0.5" />
                    <span className="text-xs font-bold text-gray-600">Choose File</span>
                  </label>

                  {previewUrl && (
                    <div className="w-12 h-12 rounded-lg border border-gray-200 overflow-hidden relative shadow-sm flex-shrink-0">
                      <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                      <button 
                        type="button"
                        onClick={() => {
                          setSelectedPhoto(null)
                          setPreviewUrl(null)
                        }}
                        className="absolute top-0.5 right-0.5 p-0.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors shadow-sm"
                      >
                        <X size={10} />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <button type="submit" className="mt-2 bg-family-primary text-white font-bold py-2 rounded-lg hover:bg-indigo-700 transition-colors active:scale-95 text-sm shadow-sm">Save Medicine</button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
