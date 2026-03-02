import { createClient } from '@/lib/supabase/server'
import ContentClient from './ContentClient'

export default async function ContentPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: content } = await supabase
    .from('content')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  return <ContentClient initialContent={content ?? []} userId={user.id} />
}
