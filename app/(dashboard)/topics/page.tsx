import { createClient } from '@/lib/supabase/server'
import TopicsClient from './TopicsClient'

export default async function TopicsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: topics } = await supabase
    .from('topics')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  return <TopicsClient initialTopics={topics ?? []} userId={user.id} />
}
