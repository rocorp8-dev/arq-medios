import { createClient } from '@/lib/supabase/server'
import CampaignsClient from './CampaignsClient'

export default async function CampaignsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: campaigns } = await supabase
    .from('campaigns')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  return <CampaignsClient initialCampaigns={campaigns ?? []} userId={user.id} />
}
