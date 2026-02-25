import { createClient } from '@/lib/supabase/server'
import SprintsClient from './SprintsClient'

export default async function SprintsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: sprints } = await supabase
    .from('sprints')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  return <SprintsClient initialSprints={sprints ?? []} userId={user.id} />
}
