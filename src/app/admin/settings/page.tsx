import { createClient } from '@/lib/supabase/server'
import AdminSettingsForm from '@/components/AdminSettingsForm'

export default async function SettingsPage() {
  const supabase = await createClient()

  const { data: settings } = await supabase
    .from('admin_settings')
    .select('webhook_url, api_key, google_review_url, facebook_page_url, facebook_follow_url, linkedin_url, youtube_url, tiktok_url, autotuesday_url')
    .eq('id', 1)
    .single()

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">הגדרות</h1>
        <p className="text-sm text-gray-500 mt-1">Webhook ו-API מרחוק</p>
      </div>
      <AdminSettingsForm
        webhookUrl={settings?.webhook_url || null}
        apiKey={settings?.api_key || ''}
        socialLinks={{
          google_review_url: settings?.google_review_url || '',
          facebook_page_url: settings?.facebook_page_url || '',
          facebook_follow_url: settings?.facebook_follow_url || '',
          linkedin_url: settings?.linkedin_url || '',
          youtube_url: settings?.youtube_url || '',
          tiktok_url: settings?.tiktok_url || '',
          autotuesday_url: settings?.autotuesday_url || '',
        }}
      />
    </div>
  )
}
