import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ProfileForm from '@/components/ProfileForm'

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('full_name, phone, avatar_url, bio, systems, niches, website_url, facebook_url, instagram_url, linkedin_url, profile_visibility')
    .eq('id', user.id)
    .single()

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">הפרופיל שלי</h1>
        <p className="text-sm text-gray-500 mt-1">ערוך את הפרטים שלך</p>
      </div>
      <ProfileForm
        profile={{
          full_name: profile?.full_name || '',
          email: user.email || '',
          phone: profile?.phone || null,
          avatar_url: profile?.avatar_url || null,
          bio: profile?.bio || null,
          systems: profile?.systems || [],
          niches: profile?.niches || [],
          website_url: profile?.website_url || null,
          facebook_url: profile?.facebook_url || null,
          instagram_url: profile?.instagram_url || null,
          linkedin_url: profile?.linkedin_url || null,
          profile_visibility: profile?.profile_visibility || 'private',
        }}
        userId={user.id}
        backHref="/lessons"
      />
    </div>
  )
}
