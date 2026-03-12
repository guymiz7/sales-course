'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import clsx from 'clsx'

interface PollOption { text: string }
interface Poll { id: string; question: string; options: PollOption[]; is_active: boolean }
interface Vote { poll_id: string; user_id: string; option_index: number }

interface Props {
  pollId: string
  currentUserId: string
}

export default function InlinePoll({ pollId, currentUserId }: Props) {
  const supabase = createClient()
  const [poll, setPoll] = useState<Poll | null>(null)
  const [votes, setVotes] = useState<Vote[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [{ data: p }, { data: v }] = await Promise.all([
        supabase.from('chat_polls').select('id, question, options, is_active').eq('id', pollId).single(),
        supabase.from('chat_poll_votes').select('poll_id, user_id, option_index').eq('poll_id', pollId),
      ])
      setPoll(p as Poll | null)
      setVotes((v || []) as Vote[])
      setLoading(false)
    }
    load()
  }, [pollId])

  async function vote(optionIndex: number) {
    if (!poll?.is_active) return
    const existing = votes.find(v => v.user_id === currentUserId)
    if (existing) {
      await supabase.from('chat_poll_votes').update({ option_index: optionIndex }).eq('poll_id', pollId).eq('user_id', currentUserId)
    } else {
      await supabase.from('chat_poll_votes').insert({ poll_id: pollId, user_id: currentUserId, option_index: optionIndex })
    }
    setVotes(prev => {
      const filtered = prev.filter(v => !(v.poll_id === pollId && v.user_id === currentUserId))
      return [...filtered, { poll_id: pollId, user_id: currentUserId, option_index: optionIndex }]
    })
  }

  if (loading) return <div className="text-xs text-gray-400 py-2">טוען סקר...</div>
  if (!poll) return null

  const myVote = votes.find(v => v.user_id === currentUserId)
  const totalVotes = votes.length

  return (
    <div className="mt-1 space-y-1.5 min-w-[220px]">
      <p className="font-semibold text-sm">{poll.question}</p>
      {(poll.options as PollOption[]).map((opt, i) => {
        const optVotes = votes.filter(v => v.option_index === i).length
        const pct = totalVotes > 0 ? Math.round((optVotes / totalVotes) * 100) : 0
        const isMyVote = myVote?.option_index === i

        return (
          <button
            key={i}
            onClick={() => vote(i)}
            disabled={!poll.is_active}
            className={clsx(
              'w-full rounded-lg px-3 py-1.5 text-xs text-right relative overflow-hidden transition',
              isMyVote ? 'border-2 border-indigo-400 bg-white/80' : 'border border-gray-300/60 bg-white/50 hover:bg-white/70',
              !poll.is_active && 'cursor-default'
            )}
          >
            <div
              className={clsx('absolute inset-y-0 right-0 transition-all duration-500', isMyVote ? 'bg-indigo-200/50' : 'bg-gray-200/40')}
              style={{ width: `${pct}%` }}
            />
            <div className="relative flex items-center justify-between gap-2">
              <span className={clsx('font-medium', isMyVote ? 'text-indigo-700' : 'text-gray-700')}>{opt.text}</span>
              <span className={clsx('text-[10px] shrink-0', isMyVote ? 'text-indigo-600 font-bold' : 'text-gray-400')}>
                {pct}%
              </span>
            </div>
          </button>
        )
      })}
      <p className="text-[10px] text-gray-400">{totalVotes} הצבעות{!poll.is_active && ' · סקר סגור'}</p>
    </div>
  )
}
