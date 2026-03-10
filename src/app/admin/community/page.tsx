import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { safeUrl } from '@/lib/recommendPlatforms'

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
  phone: string | null
  profile_visibility: string | null
  role: string | null
}

export default async function AdminCommunityPage() {
  const supabase = await createClient()

  const { data: members } = await supabase
    .from('users')
    .select('id, full_name, avatar_url, bio, systems, niches, website_url, facebook_url, instagram_url, linkedin_url, phone, profile_visibility, role')
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
            {/* Header */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gray-100 border border-gray-200 overflow-hidden shrink-0 flex items-center justify-center">
                {member.avatar_url
                  ? <img src={member.avatar_url} alt="" className="w-full h-full object-cover" />
                  : <span className="text-gray-400 text-xl">👤</span>
                }
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-gray-900">{member.full_name || 'משתמש'}</p>
                  {member.role === 'admin' && (
                    <span className="text-xs bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded-full shrink-0">מרצה</span>
                  )}
                  <span className="text-xs text-gray-400">
                    {member.profile_visibility === 'private' ? '🔒'
                      : member.profile_visibility === 'cohort' ? '👥'
                      : member.profile_visibility === 'course' ? '📚'
                      : member.profile_visibility === 'community' ? '🌐'
                      : '—'}
                  </span>
                </div>
                {member.phone && (
                  <p className="text-xs text-gray-500 mt-0.5" dir="ltr">{member.phone}</p>
                )}
              </div>
            </div>

            {/* Bio */}
            {member.bio && (
              <p className="text-xs text-gray-600 leading-relaxed">{member.bio}</p>
            )}

            {/* Tags */}
            {((member.systems && member.systems.length > 0) || (member.niches && member.niches.length > 0)) && (
              <div className="flex flex-wrap gap-1">
                {(member.systems || []).map(s => (
                  <span key={s} className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">{s}</span>
                ))}
                {(member.niches || []).map(n => (
                  <span key={n} className="text-xs bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full">{n}</span>
                ))}
              </div>
            )}

            {/* Links */}
            {(member.website_url || member.facebook_url || member.instagram_url || member.linkedin_url) && (
              <div className="flex items-center gap-2 pt-1 border-t border-gray-100 flex-wrap">
                {member.website_url && (
                  <a href={safeUrl(member.website_url)!} target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-600 hover:underline truncate max-w-[120px]">
                    🌐 {member.website_url.replace(/^https?:\/\//, '')}
                  </a>
                )}
                {member.linkedin_url && (
                  <a href={safeUrl(member.linkedin_url)!} target="_blank" rel="noopener noreferrer" title="LinkedIn">
                    <img src="https://www.google.com/s2/favicons?domain=linkedin.com&sz=32" alt="LinkedIn" className="w-4 h-4" />
                  </a>
                )}
                {member.facebook_url && (
                  <a href={safeUrl(member.facebook_url)!} target="_blank" rel="noopener noreferrer" title="Facebook">
                    <img src="https://www.google.com/s2/favicons?domain=facebook.com&sz=32" alt="Facebook" className="w-4 h-4" />
                  </a>
                )}
                {member.instagram_url && (
                  <a href={safeUrl(member.instagram_url)!} target="_blank" rel="noopener noreferrer" title="Instagram">
                    <img src="https://www.google.com/s2/favicons?domain=instagram.com&sz=32" alt="Instagram" className="w-4 h-4" />
                  </a>
                )}
              </div>
            )}

            {/* Chat button (not for admin) */}
            {member.role !== 'admin' && (
              <Link
                href={`/admin/chat?dm=${member.id}`}
                className="flex items-center justify-center gap-2 px-3 py-2 bg-gray-50 hover:bg-indigo-50 text-gray-600 hover:text-indigo-700 rounded-lg text-sm transition border border-gray-200 hover:border-indigo-200"
              >
                💬 שלח הודעה
              </Link>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
