'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface SocialLinks {
  google_review_url: string
  facebook_page_url: string
  facebook_follow_url: string
  linkedin_url: string
  youtube_url: string
  tiktok_url: string
}

interface Props {
  webhookUrl: string | null
  apiKey: string
  socialLinks: SocialLinks
}

export default function AdminSettingsForm({ webhookUrl, apiKey, socialLinks: initialSocial }: Props) {
  const supabase = createClient()
  const [url, setUrl] = useState(webhookUrl || '')
  const [saved, setSaved] = useState(false)
  const [copied, setCopied] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [social, setSocial] = useState(initialSocial)
  const [socialSaved, setSocialSaved] = useState(false)

  async function saveSocial() {
    await supabase.from('admin_settings').update({
      google_review_url: social.google_review_url || null,
      facebook_page_url: social.facebook_page_url || null,
      facebook_follow_url: social.facebook_follow_url || null,
      linkedin_url: social.linkedin_url || null,
      youtube_url: social.youtube_url || null,
      tiktok_url: social.tiktok_url || null,
    }).eq('id', 1)
    setSocialSaved(true)
    setTimeout(() => setSocialSaved(false), 2000)
  }
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''

  async function save() {
    await supabase.from('admin_settings').update({ webhook_url: url || null }).eq('id', 1)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const [currentKey, setCurrentKey] = useState(apiKey)

  async function regenerateKey() {
    if (!confirm('להחליף את מפתח ה-API? המפתח הישן יפסיק לעבוד מיד.')) return
    const newKey = crypto.randomUUID()
    await supabase.from('admin_settings').update({ api_key: newKey }).eq('id', 1)
    setCurrentKey(newKey)
    setShowKey(true)
  }

  function copy(text: string, key: string) {
    navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(''), 2000)
  }

  const exampleReply = `curl -X POST ${baseUrl}/api/admin/reply \\
  -H "Content-Type: application/json" \\
  -d '{"question_id":"ID","content":"תשובה שלך","api_key":"${apiKey}"}'`

  const exampleApprove = `curl -X POST ${baseUrl}/api/admin/approve \\
  -H "Content-Type: application/json" \\
  -d '{"user_id":"ID","api_key":"${apiKey}"}'`

  return (
    <div className="space-y-8 max-w-2xl">

      {/* API Key */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-sm font-semibold text-gray-800 mb-3">מפתח API</h2>
        <p className="text-xs text-gray-500 mb-3">השתמש במפתח זה בכל קריאת API מרחוק.</p>
        <div className="flex items-center gap-2">
          <code className="flex-1 bg-gray-50 border border-gray-200 rounded px-3 py-2 text-xs font-mono text-gray-700 truncate">
            {showKey ? currentKey : '••••••••••••••••••••••••••••••••••••'}
          </code>
          <button
            onClick={() => setShowKey(v => !v)}
            className="shrink-0 px-3 py-2 text-xs bg-gray-100 hover:bg-gray-200 rounded transition"
            title={showKey ? 'הסתר' : 'הצג'}
          >
            {showKey ? '🙈' : '👁'}
          </button>
          <button
            onClick={() => copy(currentKey, 'key')}
            className="shrink-0 px-3 py-2 text-xs bg-gray-100 hover:bg-gray-200 rounded transition"
          >
            {copied === 'key' ? '✓ הועתק' : 'העתק'}
          </button>
          <button
            onClick={regenerateKey}
            className="shrink-0 px-3 py-2 text-xs bg-red-50 hover:bg-red-100 text-red-600 rounded transition"
          >
            החלף מפתח
          </button>
        </div>
      </div>

      {/* Webhook URL */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-sm font-semibold text-gray-800 mb-1">כתובת Webhook</h2>
        <p className="text-xs text-gray-500 mb-3">
          כשנשאלת שאלה חדשה או נרשם ממתין חדש — המערכת תשלח POST לכתובת זו עם כל הפרטים.
        </p>
        <div className="flex gap-2">
          <input
            type="url"
            value={url}
            onChange={e => setUrl(e.target.value)}
            placeholder="https://..."
            className="flex-1 border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            dir="ltr"
          />
          <button
            onClick={save}
            className="px-4 py-2 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700 transition"
          >
            {saved ? '✓ נשמר' : 'שמור'}
          </button>
        </div>
      </div>

      {/* Webhook Payload Example */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-sm font-semibold text-gray-800 mb-3">פורמט Webhook שתקבל</h2>
        <div className="space-y-3">
          <div>
            <p className="text-xs text-gray-500 mb-1">שאלה חדשה:</p>
            <pre className="bg-gray-50 border border-gray-200 rounded p-3 text-xs overflow-x-auto text-gray-700 text-left" dir="ltr">{JSON.stringify({
              type: "new_question",
              id: "uuid",
              content: "תוכן השאלה",
              student_name: "שם התלמיד",
              lesson_title: "שיעור 3 — כותרת",
              reply_url: `${baseUrl}/api/admin/reply`
            }, null, 2)}</pre>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">ממתין לאישור:</p>
            <pre className="bg-gray-50 border border-gray-200 rounded p-3 text-xs overflow-x-auto text-gray-700 text-left" dir="ltr">{JSON.stringify({
              type: "pending_user",
              id: "uuid",
              full_name: "שם התלמיד",
              email: "email@example.com",
              approve_url: `${baseUrl}/api/admin/approve`
            }, null, 2)}</pre>
          </div>
        </div>
      </div>

      {/* Recommend Guy - Social Links */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-sm font-semibold text-gray-800 mb-1">קישורי "המלץ על גיא"</h2>
        <p className="text-xs text-gray-500 mb-4">קישורים אלו יופיעו בפוטר האתר לכל המשתמשים. השאר ריק כדי להסתיר.</p>
        <div className="space-y-3">
          {([
            { key: 'google_review_url', label: 'המלצה בגוגל' },
            { key: 'facebook_page_url', label: 'המלצה בפייסבוק' },
            { key: 'facebook_follow_url', label: 'עמוד פייסבוק (עקוב)' },
            { key: 'linkedin_url', label: 'לינקדאין (עקוב)' },
            { key: 'youtube_url', label: 'יוטיוב (עקוב)' },
            { key: 'tiktok_url', label: 'טיקטוק (עקוב)' },
          ] as { key: keyof typeof social; label: string }[]).map(({ key, label }) => (
            <div key={key}>
              <label className="text-xs text-gray-500 block mb-1">{label}</label>
              <input
                value={social[key]}
                onChange={e => setSocial(prev => ({ ...prev, [key]: e.target.value }))}
                placeholder="https://..."
                dir="ltr"
                className="w-full border border-gray-200 rounded px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
          ))}
        </div>
        <button
          onClick={saveSocial}
          className="mt-4 px-4 py-2 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700 transition"
        >
          {socialSaved ? '✓ נשמר' : 'שמור קישורים'}
        </button>
      </div>

      {/* API Examples */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-sm font-semibold text-gray-800 mb-3">דוגמאות API</h2>
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-gray-500">תשובה לשאלה:</p>
              <button onClick={() => copy(exampleReply, 'reply')} className="text-xs text-gray-400 hover:text-gray-600">
                {copied === 'reply' ? '✓ הועתק' : 'העתק'}
              </button>
            </div>
            <pre className="bg-gray-50 border border-gray-200 rounded p-3 text-xs overflow-x-auto text-gray-700 text-left" dir="ltr">{exampleReply}</pre>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-gray-500">אישור משתמש:</p>
              <button onClick={() => copy(exampleApprove, 'approve')} className="text-xs text-gray-400 hover:text-gray-600">
                {copied === 'approve' ? '✓ הועתק' : 'העתק'}
              </button>
            </div>
            <pre className="bg-gray-50 border border-gray-200 rounded p-3 text-xs overflow-x-auto text-gray-700 text-left" dir="ltr">{exampleApprove}</pre>
          </div>
        </div>
      </div>

    </div>
  )
}
