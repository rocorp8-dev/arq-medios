import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import TrendsClient from './TrendsClient'

export const metadata = { title: 'Tendencias del Nicho — Arq Medios' }

export default async function TrendsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: topics } = await supabase
    .from('topics')
    .select('id, title, category')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  return <TrendsClient initialTopics={topics || []} userId={user.id} />
}
