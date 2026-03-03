import { createClient } from '@/lib/supabase/server'
import AutomationsClient from './AutomationsClient'

export default async function AutomationsPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { data: scenarios } = await supabase
        .from('scenarios')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

    return <AutomationsClient initialScenarios={scenarios ?? []} userId={user.id} />
}
