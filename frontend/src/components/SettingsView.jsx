import { useState } from 'react'

export default function SettingsView() {
  const [notifications, setNotifications] = useState({ sms: true, email: false, push: true })
  
  return (
    <div className="flex flex-col gap-8 max-w-3xl">
      <div className="bento-card">
        <h3 className="text-xl font-bold text-gray-900 mb-6">Notification Preferences</h3>
        <div className="flex flex-col gap-4">
          <label className="flex items-center justify-between p-4 border border-gray-100 rounded-2xl cursor-pointer hover:bg-gray-50 transition-colors">
            <div>
              <p className="font-bold text-gray-900">Push Notifications</p>
              <p className="text-sm text-gray-500 font-medium">Receive alerts directly on your device</p>
            </div>
            <input type="checkbox" checked={notifications.push} onChange={() => setNotifications({...notifications, push: !notifications.push})} className="w-5 h-5 accent-family-primary" />
          </label>
          <label className="flex items-center justify-between p-4 border border-gray-100 rounded-2xl cursor-pointer hover:bg-gray-50 transition-colors">
            <div>
              <p className="font-bold text-gray-900">SMS Alerts</p>
              <p className="text-sm text-gray-500 font-medium">For critical missed medicines</p>
            </div>
            <input type="checkbox" checked={notifications.sms} onChange={() => setNotifications({...notifications, sms: !notifications.sms})} className="w-5 h-5 accent-family-primary" />
          </label>
          <label className="flex items-center justify-between p-4 border border-gray-100 rounded-2xl cursor-pointer hover:bg-gray-50 transition-colors">
            <div>
              <p className="font-bold text-gray-900">Email Digest</p>
              <p className="text-sm text-gray-500 font-medium">Weekly summary of Ramabai's mood and activity</p>
            </div>
            <input type="checkbox" checked={notifications.email} onChange={() => setNotifications({...notifications, email: !notifications.email})} className="w-5 h-5 accent-family-primary" />
          </label>
        </div>
      </div>

      <div className="bento-card">
        <h3 className="text-xl font-bold text-gray-900 mb-6">Elder Profile (Ramabai)</h3>
        <div className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Display Language</label>
            <select className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-family-primary/20 focus:border-family-primary outline-none bg-white font-medium">
              <option value="gu">Gujarati & English (Bilingual)</option>
              <option value="en">English Only</option>
              <option value="hi">Hindi</option>
            </select>
            <p className="text-xs text-gray-500 mt-2 font-medium">This changes the interface language on Ramabai's tablet.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
