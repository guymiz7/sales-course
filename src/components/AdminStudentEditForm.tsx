'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface Student {
  id: string
  full_name: string | null
  email: string | null
  bio: string | null
  avatar_url: string | null
  role: string | null
  profile_visibility: string | null
  website_url: string | null
  facebook_url: string | null
  instagram_url: string | null
  linkedin_url: string | null
  systems: string[] | null
  niches: string[] | null
}

interface Cohort {
  cohort_id: string
  cohorts: { id: string; name: string; courses: { name: string } | null } | null
}

interface CohortOption {
  id: string
  name: string
  courses: { name: string } | null
}

interface Props {
  student: Student
  cohorts: Cohort[]
  allCohorts: CohortOption[]
}

export default function AdminStudentEditForm({ student, cohorts, allCohorts }: Props) {
  const router = useRouter()
  const supabase = createClient()

  const [fullName, setFullName] = useState(student.full_name || '')
  const [email, setEmail] = useState(student.email || '')
  const [password, setPassword] = useState('')
  const [bio, setBio] = useState(student.bio || '')
  const [role, setRole] = useState(student.role || 'student')
  const [visibility, setVisibility] = useState(student.profile_visibility || 'cohort')
  const [websiteUrl, setWebsiteUrl] = useState(student.website_url || '')
  const [facebookUrl, setFacebookUrl] = useState(student.facebook_url || '')
  const [instagramUrl, setInstagramUrl] = useState(student.instagram_url || '')
  const [linkedinUrl, setLinkedinUrl] = useState(student.linkedin_url || '')
  const [systemsText, setSystemsText] = useState((student.systems || []).join('\n'))
  const [nichesText, setNichesText] = useState((student.niches || []).join('\n'))

  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const [currentCohorts, setCurrentCohorts] = useState(cohorts)
  const [cohortLoading, setCohortLoading] = useState(false)

  async function save() {
    setSaving(true)
    setError('')
    const body: Record<string, any> = {
      userId: student.id,
      full_name: fullName,
      email,
      bio,
      role,
      profile_visibility: visibility,
      website_url: websiteUrl,
      facebook_url: facebookUrl,
      instagram_url: instagramUrl,
      linkedin_url: linkedinUrl,
      systems: systemsText.split('\n').map(s => s.trim()).filter(Boolean),
      niches: nichesText.split('\n').map(s => s.trim()).filter(Boolean),
    }
    if (password) body.password = password

    const res = await fetch('/api/admin/edit-student', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    setSaving(false)
    if (!res.ok) {
      const data = await res.json()
      setError(data.error || 'שגיאה בשמירה')
      return
    }
    setSaved(true)
    setPassword('')
    setTimeout(() => setSaved(false), 3000)
    router.refresh()
  }

  async function removeCohort(cohortId: string) {
    setCohortLoading(true)
    await supabase.from('user_cohorts').delete().eq('user_id', student.id).eq('cohort_id', cohortId)
    setCurrentCohorts(prev => prev.filter(c => c.cohort_id !== cohortId))
    setCohortLoading(false)
  }

  async function addCohort(cohortId: string) {
    if (!cohortId) return
    setCohortLoading(true)
    await supabase.from('user_cohorts').upsert({ user_id: student.id, cohort_id: cohortId }, { onConflict: 'user_id,cohort_id', ignoreDuplicates: true })
    const added = allCohorts.find(c => c.id === cohortId)
    if (added) setCurrentCohorts(prev => [...prev, { cohort_id: cohortId, cohorts: { id: cohortId, name: added.name, courses: added.courses } }])
    setCohortLoading(false)
  }

  const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      {children}
    </div>
  )

  const inputCls = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"

  return (
    <div className="space-y-6">

      {/* Basic info */}
      <section className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-800">פרטים בסיסיים</h2>
        <Field label="שם מלא">
          <input value={fullName} onChange={e => setFullName(e.target.value)} className={inputCls} />
        </Field>
        <Field label="אימייל">
          <input value={email} onChange={e => setEmail(e.target.value)} dir="ltr" className={inputCls} />
        </Field>
        <Field label="סיסמא חדשה (השאר ריק אם אין שינוי)">
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" dir="ltr" className={inputCls} autoComplete="new-password" />
        </Field>
        <Field label="תפקיד">
          <select value={role} onChange={e => setRole(e.target.value)} className={inputCls}>
            <option value="student">תלמיד</option>
            <option value="pending">ממתין</option>
            <option value="admin">מנהל</option>
          </select>
        </Field>
      </section>

      {/* Profile */}
      <section className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-800">פרופיל</h2>
        <Field label="ביו">
          <textarea value={bio} onChange={e => setBio(e.target.value)} rows={3} className={inputCls} />
        </Field>
        <Field label="נראות בקהילה">
          <select value={visibility} onChange={e => setVisibility(e.target.value)} className={inputCls}>
            <option value="community">כולם</option>
            <option value="cohort">מחזור בלבד</option>
            <option value="course">קורס בלבד</option>
            <option value="hidden">מוסתר</option>
          </select>
        </Field>
        <Field label="מערכות (שורה אחת לכל מערכת)">
          <textarea value={systemsText} onChange={e => setSystemsText(e.target.value)} rows={3} placeholder="Go High Level&#10;Zapier&#10;..." className={inputCls} dir="ltr" />
        </Field>
        <Field label="נישות (שורה אחת לכל נישה)">
          <textarea value={nichesText} onChange={e => setNichesText(e.target.value)} rows={3} placeholder="Real Estate&#10;E-Commerce&#10;..." className={inputCls} dir="ltr" />
        </Field>
      </section>

      {/* Social links */}
      <section className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-800">קישורים חברתיים</h2>
        <Field label="אתר אישי">
          <input value={websiteUrl} onChange={e => setWebsiteUrl(e.target.value)} placeholder="https://..." dir="ltr" className={inputCls} />
        </Field>
        <Field label="פייסבוק">
          <input value={facebookUrl} onChange={e => setFacebookUrl(e.target.value)} placeholder="https://facebook.com/..." dir="ltr" className={inputCls} />
        </Field>
        <Field label="אינסטגרם">
          <input value={instagramUrl} onChange={e => setInstagramUrl(e.target.value)} placeholder="https://instagram.com/..." dir="ltr" className={inputCls} />
        </Field>
        <Field label="לינקדאין">
          <input value={linkedinUrl} onChange={e => setLinkedinUrl(e.target.value)} placeholder="https://linkedin.com/in/..." dir="ltr" className={inputCls} />
        </Field>
      </section>

      {/* Cohorts */}
      <section className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
        <h2 className="text-sm font-semibold text-gray-800">מחזורים</h2>
        <div className="flex flex-wrap gap-2">
          {currentCohorts.map(c => (
            <span key={c.cohort_id} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs rounded-full">
              {c.cohorts?.courses?.name && <span className="text-indigo-400">{c.cohorts.courses.name} —</span>}
              {c.cohorts?.name || c.cohort_id}
              <button onClick={() => removeCohort(c.cohort_id)} disabled={cohortLoading} className="text-indigo-300 hover:text-red-500 transition font-bold leading-none">✕</button>
            </span>
          ))}
        </div>
        <select
          className="text-xs border border-gray-200 rounded px-2 py-1.5 bg-white"
          defaultValue=""
          onChange={e => { addCohort(e.target.value); e.target.value = '' }}
          disabled={cohortLoading}
        >
          <option value="">+ הוסף למחזור</option>
          {allCohorts
            .filter(c => !currentCohorts.find(cc => cc.cohort_id === c.id))
            .map(c => (
              <option key={c.id} value={c.id}>
                {c.courses?.name ? `${c.courses.name} — ` : ''}{c.name}
              </option>
            ))}
        </select>
      </section>

      {/* Save */}
      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">{error}</p>}
      <div className="flex gap-3">
        <button
          onClick={save}
          disabled={saving}
          className="px-6 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition"
        >
          {saving ? 'שומר...' : saved ? '✓ נשמר' : 'שמור שינויים'}
        </button>
        <a href="/admin/students" className="px-4 py-2.5 text-sm text-gray-500 hover:text-gray-700 transition">ביטול</a>
      </div>
    </div>
  )
}
