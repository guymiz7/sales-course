'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import clsx from 'clsx'

interface PollOption {
  text: string
}

interface Poll {
  id: string
  question: string
  options: PollOption[]
  is_active: boolean
  created_at: string
  created_by: string
}

interface Vote {
  poll_id: string
  user_id: string
  option_index: number
}

interface Props {
  cohortId: string
  currentUserId: string
  currentUserRole: 'admin' | 'student'
}

export default function PollsPanel({ cohortId, currentUserId, currentUserRole }: Props) {
  const supabase = createClient()
  const isAdmin = currentUserRole === 'admin'

  const [polls, setPolls] = useState<Poll[]>([])
  const [votes, setVotes] = useState<Vote[]>([])
  const [loading, setLoading] = useState(true)

  // Create poll form
  const [showCreate, setShowCreate] = useState(false)
  const [question, setQuestion] = useState('')
  const [options, setOptions] = useState(['', ''])
  const [creating, setCreating] = useState(false)

  // Edit poll
  const [editingPollId, setEditingPollId] = useState<string | null>(null)
  const [editQuestion, setEditQuestion] = useState('')
  const [editOptions, setEditOptions] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  // Delete confirm
  const [deletingPollId, setDeletingPollId] = useState<string | null>(null)

  useEffect(() => {
    loadPolls()
  }, [cohortId])

  async function loadPolls() {
    setLoading(true)
    const [{ data: pollsData }, { data: votesData }] = await Promise.all([
      supabase.from('chat_polls').select('*').eq('cohort_id', cohortId).order('created_at', { ascending: false }),
      supabase.from('chat_poll_votes').select('poll_id, user_id, option_index'),
    ])
    setPolls((pollsData || []) as Poll[])
    setVotes((votesData || []) as Vote[])
    setLoading(false)
  }

  async function createPoll() {
    const q = question.trim()
    const opts = options.map(o => o.trim()).filter(Boolean)
    if (!q || opts.length < 2) return
    setCreating(true)
    const { data: newPoll } = await supabase.from('chat_polls').insert({
      cohort_id: cohortId,
      created_by: currentUserId,
      question: q,
      options: opts.map(text => ({ text })),
    }).select('id').single()
    // Auto-send poll as chat message
    if (newPoll) {
      await supabase.from('chat_messages').insert({
        cohort_id: cohortId,
        user_id: currentUserId,
        content: `📊 סקר: ${q}`,
        poll_id: newPoll.id,
      })
    }
    setQuestion('')
    setOptions(['', ''])
    setShowCreate(false)
    setCreating(false)
    loadPolls()
  }

  async function vote(pollId: string, optionIndex: number) {
    const existing = votes.find(v => v.poll_id === pollId && v.user_id === currentUserId)
    if (existing) {
      // Change vote
      await supabase.from('chat_poll_votes').update({ option_index: optionIndex }).eq('poll_id', pollId).eq('user_id', currentUserId)
    } else {
      await supabase.from('chat_poll_votes').insert({ poll_id: pollId, user_id: currentUserId, option_index: optionIndex })
    }
    setVotes(prev => {
      const filtered = prev.filter(v => !(v.poll_id === pollId && v.user_id === currentUserId))
      return [...filtered, { poll_id: pollId, user_id: currentUserId, option_index: optionIndex }]
    })
  }

  async function togglePoll(pollId: string, active: boolean) {
    await supabase.from('chat_polls').update({ is_active: active }).eq('id', pollId)
    setPolls(prev => prev.map(p => p.id === pollId ? { ...p, is_active: active } : p))
  }

  function startEdit(poll: Poll) {
    setEditingPollId(poll.id)
    setEditQuestion(poll.question)
    setEditOptions(poll.options.map(o => o.text))
  }

  async function saveEdit() {
    if (!editingPollId) return
    const q = editQuestion.trim()
    const opts = editOptions.map(o => o.trim()).filter(Boolean)
    if (!q || opts.length < 2) return
    setSaving(true)
    await supabase.from('chat_polls').update({
      question: q,
      options: opts.map(text => ({ text })),
    }).eq('id', editingPollId)
    setPolls(prev => prev.map(p => p.id === editingPollId ? { ...p, question: q, options: opts.map(text => ({ text })) } : p))
    setEditingPollId(null)
    setSaving(false)
  }

  async function deletePoll(pollId: string) {
    await supabase.from('chat_poll_votes').delete().eq('poll_id', pollId)
    await supabase.from('chat_polls').delete().eq('id', pollId)
    setPolls(prev => prev.filter(p => p.id !== pollId))
    setVotes(prev => prev.filter(v => v.poll_id !== pollId))
    setDeletingPollId(null)
  }

  function addOption() {
    if (options.length >= 5) return
    setOptions([...options, ''])
  }

  function removeOption(i: number) {
    if (options.length <= 2) return
    setOptions(options.filter((_, idx) => idx !== i))
  }

  if (loading) {
    return <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">טוען סקרים...</div>
  }

  return (
    <div className="flex flex-col flex-1 bg-white overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <h2 className="font-bold text-gray-800 text-sm">סקרים</h2>
        {isAdmin && (
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 transition font-medium"
          >
            {showCreate ? 'ביטול' : '+ סקר חדש'}
          </button>
        )}
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="p-4 border-b border-gray-100 bg-gray-50/50 space-y-3">
          <input
            value={question}
            onChange={e => setQuestion(e.target.value)}
            placeholder="שאלת הסקר..."
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
          <div className="space-y-2">
            {options.map((opt, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-xs text-gray-400 w-4 shrink-0">{i + 1}.</span>
                <input
                  value={opt}
                  onChange={e => {
                    const newOpts = [...options]
                    newOpts[i] = e.target.value
                    setOptions(newOpts)
                  }}
                  placeholder={`אופציה ${i + 1}`}
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
                {options.length > 2 && (
                  <button onClick={() => removeOption(i)} className="text-gray-400 hover:text-red-500 text-sm">✕</button>
                )}
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2">
            {options.length < 5 && (
              <button onClick={addOption} className="text-xs text-indigo-600 hover:text-indigo-800 transition">
                + הוסף אופציה
              </button>
            )}
            <div className="flex-1" />
            <button
              onClick={createPoll}
              disabled={!question.trim() || options.filter(o => o.trim()).length < 2 || creating}
              className="text-xs bg-indigo-600 text-white px-4 py-1.5 rounded-lg hover:bg-indigo-700 disabled:opacity-40 transition font-medium"
            >
              {creating ? '...' : 'פרסם סקר'}
            </button>
          </div>
        </div>
      )}

      {/* Polls list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {polls.length === 0 && (
          <p className="text-center text-gray-400 text-sm py-12">אין סקרים עדיין</p>
        )}
        {polls.map(poll => {
          const pollVotes = votes.filter(v => v.poll_id === poll.id)
          const myVote = pollVotes.find(v => v.user_id === currentUserId)
          const totalVotes = pollVotes.length

          const isEditing = editingPollId === poll.id

          return (
            <div key={poll.id} className={clsx('border rounded-xl p-4', poll.is_active ? 'border-gray-200' : 'border-gray-100 opacity-60')}>
              {isEditing ? (
                /* Edit form */
                <div className="space-y-3">
                  <input
                    value={editQuestion}
                    onChange={e => setEditQuestion(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    placeholder="שאלת הסקר..."
                  />
                  {editOptions.map((opt, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="text-xs text-gray-400 w-4 shrink-0">{i + 1}.</span>
                      <input
                        value={opt}
                        onChange={e => { const n = [...editOptions]; n[i] = e.target.value; setEditOptions(n) }}
                        placeholder={`אופציה ${i + 1}`}
                        className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                      />
                      {editOptions.length > 2 && (
                        <button onClick={() => setEditOptions(editOptions.filter((_, idx) => idx !== i))} className="text-gray-400 hover:text-red-500 text-sm">✕</button>
                      )}
                    </div>
                  ))}
                  <div className="flex items-center gap-2">
                    {editOptions.length < 5 && (
                      <button onClick={() => setEditOptions([...editOptions, ''])} className="text-xs text-indigo-600 hover:text-indigo-800 transition">+ אופציה</button>
                    )}
                    <div className="flex-1" />
                    <button onClick={() => setEditingPollId(null)} className="text-xs text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition">ביטול</button>
                    <button
                      onClick={saveEdit}
                      disabled={!editQuestion.trim() || editOptions.filter(o => o.trim()).length < 2 || saving}
                      className="text-xs bg-indigo-600 text-white px-4 py-1.5 rounded-lg hover:bg-indigo-700 disabled:opacity-40 transition font-medium"
                    >
                      {saving ? '...' : 'שמור'}
                    </button>
                  </div>
                </div>
              ) : (
                /* Normal view */
                <>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <h3 className="font-semibold text-gray-900 text-sm">{poll.question}</h3>
                    {isAdmin && (
                      <div className="flex items-center gap-1 shrink-0">
                        <button onClick={() => startEdit(poll)} className="text-xs text-gray-400 hover:text-indigo-600" title="ערוך סקר">✏️</button>
                        <button onClick={() => setDeletingPollId(poll.id)} className="text-xs text-gray-400 hover:text-red-500" title="מחק סקר">🗑️</button>
                        <button
                          onClick={() => togglePoll(poll.id, !poll.is_active)}
                          className="text-xs text-gray-400 hover:text-gray-600"
                          title={poll.is_active ? 'סגור סקר' : 'פתח סקר'}
                        >
                          {poll.is_active ? '🔒' : '🔓'}
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    {(poll.options as PollOption[]).map((opt, i) => {
                      const optVotes = pollVotes.filter(v => v.option_index === i).length
                      const pct = totalVotes > 0 ? Math.round((optVotes / totalVotes) * 100) : 0
                      const isMyVote = myVote?.option_index === i

                      return (
                        <button
                          key={i}
                          onClick={() => poll.is_active && vote(poll.id, i)}
                          disabled={!poll.is_active}
                          className={clsx(
                            'w-full rounded-lg px-3 py-2 text-sm text-right relative overflow-hidden transition',
                            isMyVote ? 'border-2 border-indigo-400 bg-indigo-50' : 'border border-gray-200 hover:border-gray-300',
                            !poll.is_active && 'cursor-default'
                          )}
                        >
                          <div
                            className={clsx('absolute inset-y-0 right-0 transition-all duration-500', isMyVote ? 'bg-indigo-100' : 'bg-gray-50')}
                            style={{ width: `${pct}%` }}
                          />
                          <div className="relative flex items-center justify-between gap-2">
                            <span className={clsx('font-medium', isMyVote ? 'text-indigo-700' : 'text-gray-700')}>
                              {opt.text}
                            </span>
                            <span className={clsx('text-xs shrink-0', isMyVote ? 'text-indigo-600 font-bold' : 'text-gray-400')}>
                              {pct}% ({optVotes})
                            </span>
                          </div>
                        </button>
                      )
                    })}
                  </div>

                  <div className="flex items-center justify-between mt-2">
                    <p className="text-xs text-gray-400">{totalVotes} הצבעות</p>
                    <p className="text-xs text-gray-400">
                      {new Date(poll.created_at).toLocaleDateString('he-IL', { day: 'numeric', month: 'short' })}
                    </p>
                  </div>
                </>
              )}
            </div>
          )
        })}
      </div>

      {/* Delete confirm modal */}
      {deletingPollId && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setDeletingPollId(null)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-xs w-full p-5 text-center space-y-3" dir="rtl" onClick={e => e.stopPropagation()}>
            <p className="font-bold text-gray-900">מחיקת סקר</p>
            <p className="text-sm text-gray-600">האם אתה בטוח? כל ההצבעות ימחקו לצמיתות.</p>
            <div className="flex items-center gap-2 justify-center">
              <button onClick={() => setDeletingPollId(null)} className="text-sm text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition">ביטול</button>
              <button onClick={() => deletePoll(deletingPollId)} className="text-sm bg-red-600 text-white px-5 py-1.5 rounded-lg hover:bg-red-700 transition font-medium">מחק</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
