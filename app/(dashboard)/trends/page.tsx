import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import TrendsClient from './TrendsClient'

export const metadata = { title: 'Tendencias del Nicho — Arq Medios' }

export default async function TrendsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: topics }, { data: campaigns }] = await Promise.all([
    supabase.from('topics').select('id, title, category').eq('user_id', user.id).order('created_at', { ascending: false }),
    supabase.from('campaigns').select('topic_keyword').eq('user_id', user.id).not('topic_keyword', 'is', null),
  ])

  const campaignKeywords = (campaigns ?? []).map(c => c.topic_keyword as string).filter(Boolean)

  return <TrendsClient initialTopics={topics || []} campaignKeywords={campaignKeywords} userId={user.id} />
}
