import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Navbar from '@/components/Navbar'
import FormRenderer from '@/components/FormRenderer'

interface Props {
  params: Promise<{ formId: string }>
}

export default async function FormPage({ params }: Props) {
  const { formId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('full_name, role')
    .eq('id', user.id)
    .single()

  if (profile?.role === 'pending') redirect('/pending')

  const [{ data: form }, { data: response }] = await Promise.all([
    supabase.from('forms').select('id, title, description, schema').eq('id', formId).single(),
    supabase.from('form_responses').select('data, submitted_at').eq('form_id', formId).eq('user_id', user.id).single(),
  ])

  if (!form) notFound()

  return (
    <>
      <Navbar userName={profile?.full_name || ''} role="student" />
      <FormRenderer
        form={form as any}
        initialData={(response?.data as any) || {}}
        submittedAt={response?.submitted_at || null}
        userId={user.id}
      />
    </>
  )
}
