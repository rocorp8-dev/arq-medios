import { createClient } from '@/lib/supabase/server'
import TeamMembersClient from './TeamMembersClient'

export default async function TeamMembersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: members } = await supabase
    .from('team_members')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  return <TeamMembersClient initialMembers={members ?? []} userId={user.id} />
}
