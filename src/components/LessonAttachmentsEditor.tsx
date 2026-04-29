'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface LessonAttachment {
  id: string
  lesson_id: string
  name: string
  url: string
  type: 'file' | 'image' | 'video' | 'audio' | 'url'
  order_num: number
}

const TYPE_OPTIONS: { value: LessonAttachment['type']; label: string; icon: string }[] = [
  { value: 'url', label: 'קישור', icon: '🔗' },
  { value: 'file', label: 'קובץ', icon: '📄' },
  { value: 'image', label: 'תמונה', icon: '🖼' },
  { value: 'video', label: 'וידאו', icon: '🎬' },
  { value: 'audio', label: 'סאונד', icon: '🎵' },
]

function detectType(url: string, fileName?: string): LessonAttachment['type'] {
  const target = (fileName || url).toLowerCase()
  if (/\.(jpg|jpeg|png|gif|webp|svg)(\?|$)/.test(target)) return 'image'
  if (/\.(mp4|webm|mov|m4v|avi)(\?|$)/.test(target)) return 'video'
  if (/\.(mp3|wav|m4a|ogg|aac)(\?|$)/.test(target)) return 'audio'
  if (/\.(pdf|docx?|xlsx?|pptx?|zip|rar|csv|txt)(\?|$)/.test(target)) return 'file'
  return 'url'
}

export default function LessonAttachmentsEditor({ lessonId }: { lessonId: string }) {
  const supabase = createClient()
  const [items, setItems] = useState<LessonAttachment[]>([])
  const [loading, setLoading] = useState(false)
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState('')
  const [newUrl, setNewUrl] = useState('')
  const [newType, setNewType] = useState<LessonAttachment['type']>('url')
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    let active = true
    supabase
      .from('lesson_attachments')
      .select('*')
      .eq('lesson_id', lessonId)
      .order('order_num')
      .then(({ data }) => { if (active) setItems((data as any) || []) })
    return () => { active = false }
  }, [lessonId])

  async function uploadFile(file: File) {
    const ext = file.name.split('.').pop()
    const path = `${lessonId}/attachments/${Date.now()}.${ext}`
    setUploading(true)
    const { error } = await supabase.storage.from('lesson-files').upload(path, file, { upsert: true })
    if (error) { setUploading(false); alert('שגיאה בהעלאה: ' + error.message); return }
    const { data } = supabase.storage.from('lesson-files').getPublicUrl(path)
    setNewUrl(data.publicUrl)
    setNewType(detectType(data.publicUrl, file.name))
    if (!newName.trim()) setNewName(file.name.replace(/\.[^.]+$/, ''))
    setUploading(false)
  }

  async function addItem() {
    if (!newName.trim() || !newUrl.trim()) return
    setLoading(true)
    const nextOrder = items.length > 0 ? Math.max(...items.map(i => i.order_num)) + 1 : 0
    const { data, error } = await supabase
      .from('lesson_attachments')
      .insert({ lesson_id: lessonId, name: newName.trim(), url: newUrl.trim(), type: newType, order_num: nextOrder })
      .select()
      .single()
    setLoading(false)
    if (error) { alert('שגיאה: ' + error.message); return }
    if (data) setItems(prev => [...prev, data as any])
    setNewName(''); setNewUrl(''); setNewType('url'); setAdding(false)
  }

  async function deleteItem(id: string) {
    if (!confirm('למחוק את הקובץ?')) return
    setItems(prev => prev.filter(i => i.id !== id))
    await supabase.from('lesson_attachments').delete().eq('id', id)
  }

  async function move(id: string, dir: -1 | 1) {
    const idx = items.findIndex(i => i.id === id)
    const target = idx + dir
    if (target < 0 || target >= items.length) return
    const reordered = [...items]
    ;[reordered[idx], reordered[target]] = [reordered[target], reordered[idx]]
    const updated = reordered.map((it, i) => ({ ...it, order_num: i }))
    setItems(updated)
    await Promise.all(updated.map(it =>
      supabase.from('lesson_attachments').update({ order_num: it.order_num }).eq('id', it.id)
    ))
  }

  return (
    <div className="border-t border-gray-100 mt-2 pt-2">
      <div className="flex items-center justify-between mb-1.5">
        <p className="text-xs font-semibold text-gray-700">📎 קבצים נוספים ({items.length})</p>
        {!adding && (
          <button
            onClick={() => setAdding(true)}
            className="text-xs text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 px-2 py-0.5 rounded transition"
          >
            + הוסף
          </button>
        )}
      </div>

      {items.length > 0 && (
        <div className="space-y-1 mb-2">
          {items.map((item, i) => {
            const opt = TYPE_OPTIONS.find(o => o.value === item.type)
            return (
              <div key={item.id} className="flex items-center gap-1.5 bg-gray-50 rounded px-2 py-1.5 text-xs">
                <span className="shrink-0">{opt?.icon || '📄'}</span>
                <span className="flex-1 truncate text-gray-800">{item.name}</span>
                <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline shrink-0">פתח</a>
                <button onClick={() => move(item.id, -1)} disabled={i === 0} className="text-gray-400 hover:text-gray-600 disabled:opacity-20" title="למעלה">↑</button>
                <button onClick={() => move(item.id, 1)} disabled={i === items.length - 1} className="text-gray-400 hover:text-gray-600 disabled:opacity-20" title="למטה">↓</button>
                <button onClick={() => deleteItem(item.id)} className="text-gray-400 hover:text-red-600" title="מחק">🗑</button>
              </div>
            )
          })}
        </div>
      )}

      {adding && (
        <div className="bg-indigo-50/50 border border-indigo-100 rounded p-2 space-y-1.5">
          <input
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder="שם להצגה (לדוגמא: מצגת השיעור)"
            className="w-full text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-400"
          />
          <div className="flex gap-1.5">
            <input
              value={newUrl}
              onChange={e => { setNewUrl(e.target.value); setNewType(detectType(e.target.value)) }}
              placeholder="הדבק קישור או העלה קובץ"
              className="flex-1 text-xs font-mono border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-400"
            />
            <label className={`cursor-pointer text-xs px-2 py-1 rounded transition whitespace-nowrap ${uploading ? 'bg-gray-200 text-gray-400' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              {uploading ? 'מעלה...' : 'העלה'}
              <input type="file" className="hidden" disabled={uploading} onChange={e => { const f = e.target.files?.[0]; if (f) uploadFile(f) }} />
            </label>
          </div>
          <div className="flex gap-1 flex-wrap">
            {TYPE_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setNewType(opt.value)}
                className={`px-2 py-0.5 rounded text-xs transition ${newType === opt.value ? 'bg-indigo-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
              >
                {opt.icon} {opt.label}
              </button>
            ))}
          </div>
          <div className="flex gap-1.5 justify-end">
            <button
              onClick={() => { setAdding(false); setNewName(''); setNewUrl(''); setNewType('url') }}
              className="text-xs text-gray-500 hover:text-gray-700 px-2 py-0.5"
            >
              ביטול
            </button>
            <button
              onClick={addItem}
              disabled={loading || !newName.trim() || !newUrl.trim()}
              className="text-xs bg-indigo-600 text-white px-3 py-0.5 rounded hover:bg-indigo-700 disabled:opacity-40"
            >
              {loading ? 'מוסיף...' : 'הוסף'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
