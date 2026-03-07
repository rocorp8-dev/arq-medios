import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const url = searchParams.get('url')
  if (!url) return NextResponse.json({ error: 'url requerida' }, { status: 400 })

  // Only allow https URLs
  if (!url.startsWith('https://')) {
    return NextResponse.json({ error: 'URL inválida' }, { status: 400 })
  }

  try {
    const res = await fetch(url)
    if (!res.ok) return NextResponse.json({ error: 'Error fetching image' }, { status: res.status })

    const contentType = res.headers.get('content-type') || 'image/jpeg'
    const buffer = await res.arrayBuffer()

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400',
      },
    })
  } catch (err) {
    console.error('proxy-image error:', err)
    return NextResponse.json({ error: 'Error de conexión' }, { status: 500 })
  }
}
