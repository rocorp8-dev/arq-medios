import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import ContentEditor from './ContentEditor'

export default async function ContentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: content } = await supabase
    .from('content')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!content) notFound()

  const { data: webhookConfig } = await supabase
    .from('webhook_config')
    .select('make_webhook_url')
    .eq('user_id', user.id)
    .single()

  return <ContentEditor content={content} webhookUrl={webhookConfig?.make_webhook_url ?? null} />
}
