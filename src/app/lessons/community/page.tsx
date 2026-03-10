import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import Link from 'next/link'
import { RECOMMEND_PLATFORMS_LIST, FOLLOW_PLATFORMS, safeUrl } from '@/lib/recommendPlatforms'

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
  role?: string | null
}

function MemberCard({ member, badge, currentUserId, adminSettings }: {
  member: Member
  badge?: string
  currentUserId: string
  adminSettings?: Record<string, string | null>
}) {
  const isAdmin = member.role === 'admin'
  const isSelf = member.id === currentUserId

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-gray-100 border border-gray-200 overflow-hidden shrink-0 flex items-center justify-center">
          {member.avatar_url
            ? <img src={member.avatar_url} alt="" className="w-full h-full object-cover" />
            : <span className="text-gray-400 text-xl">👤</span>
          }
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-gray-900">{member.full_name || 'חבר קהילה'}</p>
            {badge && <span className="text-xs bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded-full shrink-0">{badge}</span>}
          </div>
          {member.bio && <p className="text-xs text-gray-500 line-clamp-2 mt-0.5">{member.bio}</p>}
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

      {/* Admin follow links (from admin_settings) */}
      {isAdmin && adminSettings && (
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-gray-100">
          {RECOMMEND_PLATFORMS_LIST.filter(p => adminSettings[p.key]).map(p => (
            <a
              key={p.key}
              href={safeUrl(adminSettings[p.key])!}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 px-2.5 py-1.5 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 transition"
            >
              <img src={`https://www.google.com/s2/favicons?domain=${p.domain}&sz=32`} alt="" className="w-3 h-3" />
              {p.label}
            </a>
          ))}
          {FOLLOW_PLATFORMS.filter(p => adminSettings[p.key]).map(p => (
            <a
              key={p.key}
              href={safeUrl(adminSettings[p.key])!}
              target="_blank"
              rel="noopener noreferrer"
              title={p.label}
              className="w-7 h-7 flex items-center justify-center rounded-lg bg-gray-100 hover:bg-gray-200 transition"
            >
              <img src={`https://www.google.com/s2/favicons?domain=${p.domain}&sz=32`} alt={p.label} className="w-4 h-4" />
            </a>
          ))}
        </div>
      )}

      {/* Personal social links (non-admin) */}
      {!isAdmin && (member.website_url || member.facebook_url || member.instagram_url || member.linkedin_url) && (
        <div className="flex items-center gap-2 pt-1 border-t border-gray-100">
          {member.linkedin_url && (
            <a href={safeUrl(member.linkedin_url)!} target="_blank" rel="noopener noreferrer">
              <img src="https://www.google.com/s2/favicons?domain=linkedin.com&sz=32" alt="LinkedIn" className="w-4 h-4" />
            </a>
          )}
          {member.facebook_url && (
            <a href={safeUrl(member.facebook_url)!} target="_blank" rel="noopener noreferrer">
              <img src="https://www.google.com/s2/favicons?domain=facebook.com&sz=32" alt="Facebook" className="w-4 h-4" />
            </a>
          )}
          {member.instagram_url && (
            <a href={safeUrl(member.instagram_url)!} target="_blank" rel="noopener noreferrer">
              <img src="https://www.google.com/s2/favicons?domain=instagram.com&sz=32" alt="Instagram" className="w-4 h-4" />
            </a>
          )}
          {member.website_url && (
            <a href={safeUrl(member.website_url)!} target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-600 hover:underline">אתר</a>
          )}
        </div>
      )}

      {/* Chat button — not for self */}
      {!isSelf && (
        <Link
          href={`/lessons/chat/${member.id}`}
          className="flex items-center justify-center gap-2 px-3 py-2 bg-gray-50 hover:bg-indigo-50 text-gray-600 hover:text-indigo-700 rounded-lg text-sm transition border border-gray-200 hover:border-indigo-200"
        >
          💬 שלח הודעה
        </Link>
      )}
    </div>
  )
}

export default async function CommunityPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: cohortData } = await supabase
    .from('user_cohorts')
    .select('cohort_id')
    .eq('user_id', user.id)
    .single()

  const cohortId = cohortData?.cohort_id

  const adminSupabase = createAdminClient()
  const [{ data: me }, { data: admins }, { data: cohortUsers }, { data: others }, { data: adminSettings }] = await Promise.all([
    supabase.from('users').select('id, full_name, avatar_url, bio, systems, niches, website_url, facebook_url, instagram_url, linkedin_url, profile_visibility, role').eq('id', user.id).single(),
    adminSupabase.from('users').select('id, full_name, avatar_url, bio, systems, niches, website_url, facebook_url, instagram_url, linkedin_url, profile_visibility, role').eq('role', 'admin'),
    cohortId ? adminSupabase.from('user_cohorts').select('user_id').eq('cohort_id', cohortId) : Promise.resolve({ data: [] as any[] }),
    adminSupabase.from('users').select('id, full_name, avatar_url, bio, systems, niches, website_url, facebook_url, instagram_url, linkedin_url, profile_visibility, role').neq('id', user.id).neq('role', 'admin').in('profile_visibility', ['cohort', 'course', 'community']),
    supabase.from('admin_settings').select('google_review_url, facebook_page_url, facebook_follow_url, instagram_url, linkedin_url, youtube_url, tiktok_url, autotuesday_url').eq('id', 1).single(),
  ])

  const cohortMemberIds = new Set((cohortUsers || []).map((u: any) => u.user_id as string))
  const visibleOthers = (others || []).filter((m: any) => cohortMemberIds.has(m.id)) as Member[]
  const adminList = (admins || []) as Member[]
  const selfMember = me as Member | null
  const isSelfAdmin = me?.role === 'admin'
  const settings = adminSettings as Record<string, string | null> | null

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">הקהילה</h1>
        <p className="text-sm text-gray-500 mt-1">חברי הקורס</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {adminList.map(admin => (
          <MemberCard key={admin.id} member={admin} badge="מרצה" currentUserId={user.id} adminSettings={settings || {}} />
        ))}
        {selfMember && !isSelfAdmin && (
          <MemberCard key={selfMember.id} member={selfMember} badge="אתה" currentUserId={user.id} />
        )}
        {visibleOthers.map(member => (
          <MemberCard key={member.id} member={member} currentUserId={user.id} />
        ))}
      </div>

      {visibleOthers.length === 0 && !isSelfAdmin && (
        <p className="text-xs text-gray-400 text-center mt-6">
          אין חברים נוספים גלויים — ניתן לשנות הגדרות פרופיל כדי להיות גלוי לאחרים
        </p>
      )}
    </div>
  )
}
