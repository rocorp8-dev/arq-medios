import { createClient } from '@/lib/supabase/server'
import WebhooksClient from './WebhooksClient'

export default async function WebhooksPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: config } = await supabase
    .from('webhook_config')
    .select('*')
    .eq('user_id', user.id)
    .single()

  const { data: logs } = await supabase
    .from('webhook_logs')
    .select('*, content:content_id(title, type)')
    .eq('user_id', user.id)
    .order('sent_at', { ascending: false })
    .limit(20)

  return <WebhooksClient config={config} logs={logs ?? []} userId={user.id} />
}
