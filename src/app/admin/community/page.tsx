import { createClient } from '@/lib/supabase/server'

interface Member {
  id: string
  full_name: string | null
  avatar_url: string | null
  bio: string | null
  systems: string[] | null
  niches: string[] | null
  website_url: string | null
  facebook_url: string | null
  instagram_url: string | null
  linkedin_url: string | null
  profile_visibility: string | null
  role: string | null
}

export default async function AdminCommunityPage() {
  const supabase = await createClient()

  const { data: members } = await supabase
    .from('users')
    .select('id, full_name, avatar_url, bio, systems, niches, website_url, facebook_url, instagram_url, linkedin_url, profile_visibility, role')
    .neq('role', 'pending')
    .order('role', { ascending: false }) // admin first

  const all = (members || []) as Member[]

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">קהילה</h1>
        <p className="text-sm text-gray-500 mt-1">כל משתמשי הפלטפורמה ({all.length})</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {all.map(member => (
          <div key={member.id} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gray-100 border border-gray-200 overflow-hidden shrink-0 flex items-center justify-center">
                {member.avatar_url
                  ? <img src={member.avatar_url} alt="" className="w-full h-full object-cover" />
                  : <span className="text-gray-400 text-xl">👤</span>
                }
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-gray-900 truncate">{member.full_name || 'משתמש'}</p>
                  {member.role === 'admin' && (
                    <span className="text-xs bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded-full shrink-0">מרצה</span>
                  )}
                </div>
                <p className="text-xs text-gray-400">
                  {member.profile_visibility === 'private' ? '🔒 פרטי'
                    : member.profile_visibility === 'cohort' ? '👥 גלוי למחזור'
                    : member.profile_visibility === 'course' ? '📚 גלוי לקורס'
                    : member.profile_visibility === 'community' ? '🌐 גלוי לקהילה'
                    : '—'}
                </p>
                {member.bio && <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">{member.bio}</p>}
              </div>
            </div>
            {((member.systems && member.systems.length > 0) || (member.niches && member.niches.length > 0)) && (
              <div className="flex flex-wrap gap-1">
                {(member.systems || []).slice(0, 3).map(s => (
                  <span key={s} className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">{s}</span>
                ))}
                {(member.niches || []).slice(0, 3).map(n => (
                  <span key={n} className="text-xs bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full">{n}</span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
