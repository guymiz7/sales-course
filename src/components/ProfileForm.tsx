'use client'
import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Profile {
  full_name: string
  email: string
  phone: string | null
  avatar_url: string | null
  bio: string | null
  systems: string[]
  niches: string[]
  website_url: string | null
  facebook_url: string | null
  instagram_url: string | null
  linkedin_url: string | null
  recommendation_url: string | null
  profile_visibility: string
}

interface Props {
  profile: Profile
  userId: string
  backHref: string
}

export default function ProfileForm({ profile: initial, userId, backHref }: Props) {
  const supabase = createClient()

  const [fullName, setFullName] = useState(initial.full_name || '')
  const [phone, setPhone] = useState(initial.phone || '')
  const [bio, setBio] = useState(initial.bio || '')
  const [systems, setSystems] = useState<string[]>(initial.systems || [])
  const [niches, setNiches] = useState<string[]>(initial.niches || [])
  const [systemInput, setSystemInput] = useState('')
  const [nicheInput, setNicheInput] = useState('')
  const [websiteUrl, setWebsiteUrl] = useState(initial.website_url || '')
  const [facebookUrl, setFacebookUrl] = useState(initial.facebook_url || '')
  const [instagramUrl, setInstagramUrl] = useState(initial.instagram_url || '')
  const [linkedinUrl, setLinkedinUrl] = useState(initial.linkedin_url || '')
  const [recommendationUrl, setRecommendationUrl] = useState(initial.recommendation_url || '')
  const [visibility, setVisibility] = useState(initial.profile_visibility || 'private')
  const [avatarUrl, setAvatarUrl] = useState(initial.avatar_url || '')
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [emailPassword, setEmailPassword] = useState('')

  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null)

  function flash(text: string, ok: boolean) {
    setMsg({ text, ok })
    setTimeout(() => setMsg(null), 4000)
  }

  async function uploadAvatar(file: File) {
    if (file.size > 5 * 1024 * 1024) { flash('התמונה גדולה מדי (מקסימום 5MB)', false); return }
    setUploading(true)
    const ext = file.name.split('.').pop()
    const path = `${userId}/avatar.${ext}`
    const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true })
    if (error) { flash('שגיאה בהעלאת תמונה', false); setUploading(false); return }
    const { data } = supabase.storage.from('avatars').getPublicUrl(path)
    const url = data.publicUrl + '?t=' + Date.now()
    setAvatarUrl(url)
    await supabase.from('users').update({ avatar_url: data.publicUrl }).eq('id', userId)
    setUploading(false)
    flash('תמונה עודכנה', true)
  }

  function addTag(value: string, list: string[], setList: (v: string[]) => void, setInput: (v: string) => void) {
    const trimmed = value.trim()
    if (trimmed && !list.includes(trimmed)) setList([...list, trimmed])
    setInput('')
  }

  async function saveProfile() {
    setSaving(true)
    const { error } = await supabase.from('users').update({
      full_name: fullName,
      phone: phone || null,
      bio: bio || null,
      systems,
      niches,
      website_url: websiteUrl || null,
      facebook_url: facebookUrl || null,
      instagram_url: instagramUrl || null,
      linkedin_url: linkedinUrl || null,
      recommendation_url: recommendationUrl || null,
      profile_visibility: visibility,
    }).eq('id', userId)
    setSaving(false)
    if (error) flash('שגיאה בשמירה', false)
    else flash('הפרופיל עודכן בהצלחה', true)
  }

  async function changePassword() {
    if (newPassword !== confirmPassword) { flash('הסיסמאות אינן תואמות', false); return }
    if (newPassword.length < 6) { flash('סיסמה חייבת להיות לפחות 6 תווים', false); return }
    const { error: authError } = await supabase.auth.signInWithPassword({ email: initial.email, password: currentPassword })
    if (authError) { flash('סיסמה נוכחית שגויה', false); return }
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) flash('שגיאה בשינוי סיסמה', false)
    else { flash('סיסמה שונתה בהצלחה', true); setCurrentPassword(''); setNewPassword(''); setConfirmPassword('') }
  }

  async function changeEmail() {
    if (!newEmail) { flash('הכנס מייל חדש', false); return }
    const { error: authError } = await supabase.auth.signInWithPassword({ email: initial.email, password: emailPassword })
    if (authError) { flash('סיסמה שגויה', false); return }
    const { error } = await supabase.auth.updateUser({ email: newEmail })
    if (error) flash('שגיאה בשינוי מייל', false)
    else { flash('נשלח אימות למייל החדש — יש לאשר לפני שהמייל ישתנה', true); setNewEmail(''); setEmailPassword('') }
  }

  return (
    <div className="space-y-6 max-w-2xl">

      {msg && (
        <div className={`p-3 rounded-lg text-sm text-center font-medium ${msg.ok ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {msg.text}
        </div>
      )}

      {/* Avatar + Basic */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-sm font-semibold text-gray-800 mb-4">פרטים אישיים</h2>

        <div className="flex items-center gap-4 mb-5">
          <div
            className="w-20 h-20 rounded-full bg-gray-100 border-2 border-gray-200 overflow-hidden cursor-pointer relative flex items-center justify-center shrink-0"
            onClick={() => fileRef.current?.click()}
          >
            {avatarUrl
              ? <img src={avatarUrl} alt="תמונת פרופיל" className="w-full h-full object-cover" />
              : <span className="text-4xl text-gray-300">👤</span>
            }
            {uploading && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-white text-xs">טוען...</div>
            )}
          </div>
          <div>
            <button onClick={() => fileRef.current?.click()} className="text-sm text-indigo-600 hover:underline font-medium">החלף תמונה</button>
            <p className="text-xs text-gray-400 mt-0.5">JPG, PNG — עד 5MB</p>
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && uploadAvatar(e.target.files[0])} />
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs text-gray-500 block mb-1">שם מלא</label>
            <input value={fullName} onChange={e => setFullName(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">מייל</label>
            <input value={initial.email} disabled dir="ltr" className="w-full border border-gray-100 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-400" />
            <p className="text-xs text-gray-400 mt-1">לשינוי מייל — ראה סעיף אבטחה למטה</p>
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">טלפון</label>
            <input value={phone} onChange={e => setPhone(e.target.value)} type="tel" dir="ltr" placeholder="050-0000000" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
          </div>
        </div>
      </div>

      {/* Bio */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-sm font-semibold text-gray-800 mb-3">על עצמי</h2>
        <textarea
          value={bio}
          onChange={e => setBio(e.target.value)}
          rows={4}
          placeholder="ספר/י על עצמך, הניסיון שלך, מה אתה עושה..."
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
        />
      </div>

      {/* Expertise */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-sm font-semibold text-gray-800 mb-4">מומחיות</h2>
        <div className="space-y-5">

          <div>
            <label className="text-xs text-gray-500 block mb-2">מערכות בהן אני מומחה <span className="text-gray-400">(Fireberry, Make, Origami...)</span></label>
            <div className="flex flex-wrap gap-1.5 mb-2 min-h-[28px]">
              {systems.map(s => (
                <span key={s} className="flex items-center gap-1 bg-indigo-50 text-indigo-700 text-xs px-2.5 py-1 rounded-full border border-indigo-100">
                  {s}
                  <button onClick={() => setSystems(systems.filter(t => t !== s))} className="hover:text-indigo-900 text-indigo-400 font-bold leading-none">×</button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                value={systemInput}
                onChange={e => setSystemInput(e.target.value)}
                onKeyDown={e => (e.key === 'Enter' || e.key === ',') && (e.preventDefault(), addTag(systemInput, systems, setSystems, setSystemInput))}
                placeholder="הקלד ולחץ Enter"
                className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
              <button onClick={() => addTag(systemInput, systems, setSystems, setSystemInput)} className="px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-sm hover:bg-indigo-100 transition">הוסף</button>
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-500 block mb-2">נישות בהן אני מומחה <span className="text-gray-400">(גני ילדים, נדל״ן, חנות חיות...)</span></label>
            <div className="flex flex-wrap gap-1.5 mb-2 min-h-[28px]">
              {niches.map(n => (
                <span key={n} className="flex items-center gap-1 bg-purple-50 text-purple-700 text-xs px-2.5 py-1 rounded-full border border-purple-100">
                  {n}
                  <button onClick={() => setNiches(niches.filter(t => t !== n))} className="hover:text-purple-900 text-purple-400 font-bold leading-none">×</button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                value={nicheInput}
                onChange={e => setNicheInput(e.target.value)}
                onKeyDown={e => (e.key === 'Enter' || e.key === ',') && (e.preventDefault(), addTag(nicheInput, niches, setNiches, setNicheInput))}
                placeholder="הקלד ולחץ Enter"
                className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
              <button onClick={() => addTag(nicheInput, niches, setNiches, setNicheInput)} className="px-3 py-1.5 bg-purple-50 text-purple-600 rounded-lg text-sm hover:bg-purple-100 transition">הוסף</button>
            </div>
          </div>

        </div>
      </div>

      {/* Social Links */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-sm font-semibold text-gray-800 mb-4">קישורים</h2>
        <div className="space-y-3">
          {[
            { label: 'אתר אינטרנט', value: websiteUrl, set: setWebsiteUrl, placeholder: 'https://yoursite.com' },
            { label: 'פייסבוק', value: facebookUrl, set: setFacebookUrl, placeholder: 'https://facebook.com/...' },
            { label: 'אינסטגרם', value: instagramUrl, set: setInstagramUrl, placeholder: 'https://instagram.com/...' },
            { label: 'לינקדאין', value: linkedinUrl, set: setLinkedinUrl, placeholder: 'https://linkedin.com/in/...' },
            { label: 'לינק להמלצה עליי', value: recommendationUrl, set: setRecommendationUrl, placeholder: 'https://g.page/... או כתובת פייסבוק/אתר' },
          ].map(({ label, value, set, placeholder }) => (
            <div key={label}>
              <label className="text-xs text-gray-500 block mb-1">{label}</label>
              <input value={value} onChange={e => set(e.target.value)} placeholder={placeholder} dir="ltr" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            </div>
          ))}
        </div>
      </div>

      {/* Visibility */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-sm font-semibold text-gray-800 mb-1">פרטיות פרופיל</h2>
        <p className="text-xs text-gray-500 mb-3">מי יכול לראות את הפרופיל שלך בקהילה?</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            { value: 'private', label: 'פרטי', desc: 'רק אני' },
            { value: 'cohort', label: 'מחזור', desc: 'חברי המחזור שלי' },
            { value: 'course', label: 'קורס', desc: 'כל משתתפי הקורס' },
            { value: 'community', label: 'קהילה', desc: 'כולם' },
          ].map(opt => (
            <button
              key={opt.value}
              onClick={() => setVisibility(opt.value)}
              className={`border rounded-lg p-3 text-right transition ${visibility === opt.value ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-gray-300'}`}
            >
              <div className={`text-sm font-medium ${visibility === opt.value ? 'text-indigo-700' : 'text-gray-700'}`}>{opt.label}</div>
              <div className="text-xs text-gray-400 mt-0.5">{opt.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Save */}
      <button
        onClick={saveProfile}
        disabled={saving}
        className="w-full py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition"
      >
        {saving ? 'שומר...' : 'שמור פרופיל'}
      </button>

      {/* Security */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-sm font-semibold text-gray-800 mb-4">אבטחה</h2>

        {/* Change Password */}
        <div className="mb-5 pb-5 border-b border-gray-100">
          <h3 className="text-xs font-medium text-gray-700 mb-3">שינוי סיסמה</h3>
          <div className="space-y-2">
            <input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} placeholder="סיסמה נוכחית" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="סיסמה חדשה (לפחות 6 תווים)" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="אימות סיסמה חדשה" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            <button onClick={changePassword} className="px-4 py-2 bg-gray-800 text-white text-sm rounded-lg hover:bg-gray-900 transition">שנה סיסמה</button>
          </div>
        </div>

        {/* Change Email */}
        <div>
          <h3 className="text-xs font-medium text-gray-700 mb-1">שינוי כתובת מייל</h3>
          <p className="text-xs text-gray-400 mb-3">מייל אימות יישלח לכתובת החדשה. שינוי יאושר רק לאחר לחיצה על הקישור.</p>
          <div className="space-y-2">
            <input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="מייל חדש" dir="ltr" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            <input type="password" value={emailPassword} onChange={e => setEmailPassword(e.target.value)} placeholder="סיסמה נוכחית לאישור" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            <button onClick={changeEmail} className="px-4 py-2 bg-gray-800 text-white text-sm rounded-lg hover:bg-gray-900 transition">שנה מייל</button>
          </div>
        </div>
      </div>

    </div>
  )
}
