import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { data, error } = await supabase
        .from('media')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100)

    if (error) {
        console.error('Error fetching media:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data, {
        headers: {
            'Cache-Control': 'private, max-age=60, stale-while-revalidate=120'
        }
    })
}

export async function POST(request: Request) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { url, name, type, prompt } = await request.json()

    const { data, error } = await supabase
        .from('media')
        .insert({
            user_id: user.id,
            url,
            name,
            type,
            prompt,
            favorite: false
        })
        .select()
        .single()

    if (error) {
        console.error('Error creating media:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
}

export async function PATCH(request: Request) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { id, favorite } = await request.json()

    const { data, error } = await supabase
        .from('media')
        .update({ favorite })
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single()

    if (error) {
        console.error('Error updating media:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
}

export async function DELETE(request: Request) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 })

    const { error } = await supabase
        .from('media')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id)

    if (error) {
        console.error('Error deleting media:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
}
