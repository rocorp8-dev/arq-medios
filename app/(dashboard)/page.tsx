import { createClient } from '@/lib/supabase/server'
import DashboardClient from './DashboardClient'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const [
    { data: topics },
    { data: content },
    { data: campaigns },
    { data: costs }
  ] = await Promise.all([
    supabase.from('topics').select('id, status').eq('user_id', user.id),
    supabase.from('content').select('id, type, status, title, created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(200),
    supabase.from('campaigns').select('id, status').eq('user_id', user.id),
    supabase.from('ai_costs').select('total_cost_usd').eq('user_id', user.id)
  ])

  const totalTopics = topics?.length ?? 0
  const pendingTopics = topics?.filter(t => t.status === 'draft' || t.status === 'ready').length ?? 0
  const totalContent = content?.length ?? 0
  const publishedContent = content?.filter(c => c.status === 'published').length ?? 0
  const activeCampaigns = campaigns?.filter(c => c.status === 'active').length ?? 0
  const totalSpent = costs?.reduce((acc, c) => acc + Number(c.total_cost_usd), 0) ?? 0


  // Chart: content created per day, last 7 days
  const now = new Date()
  const chartData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now)
    d.setDate(d.getDate() - (6 - i))
    const dayStr = d.toISOString().split('T')[0]
    const label = d.toLocaleDateString('es', { weekday: 'short' })
    const count = content?.filter(c => c.created_at.startsWith(dayStr)).length ?? 0
    return { dia: label, total: count }
  })

  const recentContent = (content ?? []).slice(0, 5)

  return (
    <DashboardClient
      totalTopics={totalTopics}
      pendingTopics={pendingTopics}
      totalContent={totalContent}
      publishedContent={publishedContent}
      activeCampaigns={activeCampaigns}
      totalSpent={totalSpent}
      chartData={chartData}
      recentContent={recentContent}
    />
  )
}
