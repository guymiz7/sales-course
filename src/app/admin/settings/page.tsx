import { createClient } from '@/lib/supabase/server'
import AdminSettingsForm from '@/components/AdminSettingsForm'

export default async function SettingsPage() {
  const supabase = await createClient()

  const { data: settings } = await supabase
    .from('admin_settings')
    .select('webhook_url, api_key')
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
      />
    </div>
  )
}
