import React, { useState, useEffect } from 'react'
import { UtensilsCrossed, BookOpen, Scissors, Languages, Globe, Calendar, User } from 'lucide-react'

export default function FamilyCircles({ familyGroupId }) {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)

  const categoryIcons = {
    "Grandma’s Kitchen": UtensilsCrossed,
    "Tales from Our Roots": BookOpen,
    "Handmade & Heirlooms": Scissors,
    "Multilingual Support": Languages
  }

  const categoryColors = {
    "Grandma’s Kitchen": "bg-[#e8dcc4] text-[#8b5a2b]",
    "Tales from Our Roots": "bg-[#dceddd] text-[#3c5a3d]",
    "Handmade & Heirlooms": "bg-[#f4dfd4] text-[#9b4a3a]",
    "Multilingual Support": "bg-[#dcebf4] text-[#2c4e6b]"
  }

  const fetchPosts = () => {
    setLoading(true)
    const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'
    fetch(`${API_BASE}/api/circle/list?family_group_id=${familyGroupId}`)
      .then(res => res.json())
      .then(data => {
        setPosts(data)
        setLoading(false)
      })
      .catch(err => {
        console.error(err)
        setLoading(false)
      })
  }

  useEffect(() => {
    fetchPosts()
  }, [familyGroupId])

  return (
    <div className="flex flex-col gap-6 animate-fade-in max-w-4xl mx-auto pb-12">
      <div className="bg-white border border-gray-100 rounded-3xl p-8 shadow-sm">
        <div className="flex items-center gap-3 mb-2">
          <Globe className="text-family-primary" size={28} />
          <h2 className="text-2xl font-bold text-gray-900 font-display">Elder Circles Feed</h2>
        </div>
        <p className="text-family-muted font-medium">
          See the creative recipes, stories, and crafts shared by elders in your family. These posts keep you connected to their heritage and daily reflections.
        </p>
        <div className="mt-3 bg-blue-50/50 border border-blue-100 rounded-xl p-3.5 flex items-center gap-2 text-xs font-extrabold text-blue-700">
          🔒 Privacy Notice: This feed only displays posts shared by your direct relatives. General public posts from other elders are hidden to protect privacy.
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-family-primary"></div>
        </div>
      ) : posts.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-gray-100 shadow-sm">
          <BookOpen className="mx-auto text-gray-300 mb-4" size={48} />
          <h3 className="text-xl font-bold text-gray-700 mb-1">No Posts Yet</h3>
          <p className="text-gray-500 font-medium max-w-md mx-auto">
            Once your elders share stories, recipes, or crafts in their "Worldwide Circles" tab, they will appear here!
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {posts.map((post) => {
            const Icon = categoryIcons[post.category] || Globe
            const colorClass = categoryColors[post.category] || "bg-gray-100 text-gray-700"
            const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'
            const mediaUrl = post.media_path ? `${API_BASE}/${post.media_path}` : null

            return (
              <div key={post.id} className="bg-white border border-gray-100 rounded-3xl p-6 md:p-8 shadow-sm hover:shadow-md transition-shadow flex flex-col md:flex-row gap-6">
                <div className="flex-1 flex flex-col gap-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className={`px-4 py-1.5 rounded-full text-sm font-bold flex items-center gap-1.5 ${colorClass}`}>
                      <Icon size={16} />
                      {post.category}
                    </span>
                    <span className="text-gray-400 text-sm flex items-center gap-1">
                      <Calendar size={14} />
                      {new Date(post.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>

                  <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                    <User size={20} className="text-family-primary" />
                    Shared by {post.author_name}
                  </h3>

                  <p className="text-gray-700 text-lg leading-relaxed whitespace-pre-wrap">
                    {post.content_text}
                  </p>
                </div>

                {mediaUrl && (
                  <div className="md:w-64 w-full h-48 md:h-auto rounded-2xl overflow-hidden border border-gray-100 shadow-inner flex-shrink-0">
                    <img 
                      src={mediaUrl} 
                      alt="Uploaded media" 
                      className="w-full h-full object-cover" 
                      onError={(e) => { e.target.style.display = 'none' }}
                    />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
