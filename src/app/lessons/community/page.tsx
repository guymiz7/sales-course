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
}

export default async function CommunityPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: cohortData } = await supabase
    .from('user_cohorts')
    .select('cohort_id, cohorts(course_id)')
    .eq('user_id', user.id)
    .single()

  const cohortId = cohortData?.cohort_id
  const courseId = (cohortData?.cohorts as any)?.course_id

  // Get members in same cohort (or course) who have set visibility
  let membersQuery = supabase
    .from('users')
    .select('id, full_name, avatar_url, bio, systems, niches, website_url, facebook_url, instagram_url, linkedin_url, profile_visibility')
    .neq('id', user.id)
    .in('profile_visibility', ['cohort', 'course', 'community'])
    .neq('role', 'admin')

  const { data: allMembers } = await membersQuery

  // Filter: cohort members see cohort+course+community; filter by actual cohort membership
  let cohortMemberIds: Set<string> = new Set()
  if (cohortId) {
    const { data: cohortUsers } = await supabase
      .from('user_cohorts')
      .select('user_id')
      .eq('cohort_id', cohortId)
    cohortMemberIds = new Set((cohortUsers || []).map(u => u.user_id))
  }

  const members: Member[] = (allMembers || []).filter(m => {
    if (m.profile_visibility === 'cohort') return cohortMemberIds.has(m.id)
    if (m.profile_visibility === 'course' || m.profile_visibility === 'community') return cohortMemberIds.has(m.id)
    return false
  })

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">הקהילה</h1>
        <p className="text-sm text-gray-500 mt-1">חברי הקורס שבחרו להיות גלויים</p>
      </div>

      {members.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">👥</p>
          <p className="text-sm">אין חברים גלויים בקהילה עדיין</p>
          <p className="text-xs mt-1">ניתן לשנות הגדרות פרופיל כדי להיות גלוי לחברים אחרים</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {members.map(member => (
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
                  <p className="font-semibold text-gray-900 truncate">{member.full_name || 'חבר קהילה'}</p>
                  {member.bio && (
                    <p className="text-xs text-gray-500 line-clamp-2 mt-0.5">{member.bio}</p>
                  )}
                </div>
              </div>

              {/* Tags */}
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

              {/* Social links */}
              {(member.website_url || member.facebook_url || member.instagram_url || member.linkedin_url) && (
                <div className="flex items-center gap-2 pt-1 border-t border-gray-100">
                  {member.linkedin_url && (
                    <a href={member.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-blue-600 transition">
                      <img src="https://www.google.com/s2/favicons?domain=linkedin.com&sz=32" alt="LinkedIn" className="w-4 h-4" />
                    </a>
                  )}
                  {member.facebook_url && (
                    <a href={member.facebook_url} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-blue-700 transition">
                      <img src="https://www.google.com/s2/favicons?domain=facebook.com&sz=32" alt="Facebook" className="w-4 h-4" />
                    </a>
                  )}
                  {member.instagram_url && (
                    <a href={member.instagram_url} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-pink-500 transition">
                      <img src="https://www.google.com/s2/favicons?domain=instagram.com&sz=32" alt="Instagram" className="w-4 h-4" />
                    </a>
                  )}
                  {member.website_url && (
                    <a href={member.website_url} target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-600 hover:underline truncate">
                      אתר
                    </a>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
