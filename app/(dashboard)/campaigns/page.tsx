import { createClient } from '@/lib/supabase/server'
import CampaignsClient from './CampaignsClient'

export default async function CampaignsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const [{ data: campaigns }, { data: scenarios }] = await Promise.all([
    supabase.from('campaigns').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
    supabase.from('scenarios').select('id, name').eq('user_id', user.id).order('created_at', { ascending: false }),
  ])

  return (
    <CampaignsClient
      initialCampaigns={campaigns ?? []}
      scenarios={scenarios ?? []}
      userId={user.id}
    />
  )
}
