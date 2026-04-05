import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  let q = searchParams.get('q')
  
  if (!q) return NextResponse.json({ error: 'Query required' }, { status: 400 })

  // Limpiar la query: quitar emojis, hashtags, signos, dejando solo letras, números y espacios
  q = q.replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim()
  if (!q || q.length < 3) q = "Noticias" // Fallback si la query se vacía demasiado

  const apiKey = process.env.NEWS_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'NEWS_API_KEY not configured' }, { status: 500 })

  try {
    // Forzar siempre México (country=mx) y español (lang=es)
    const url = `https://gnews.io/api/v4/search?q=${encodeURIComponent(q)}&lang=es&country=mx&max=6&sortby=publishedAt&token=${apiKey}`
    const res = await fetch(url, { next: { revalidate: 300 } })

    if (!res.ok) {
      const errText = await res.text()
      console.error('GNews API error:', res.status, errText)
      return NextResponse.json({ error: `GNews ${res.status}: ${errText}`, articles: [] })
    }

    const data = await res.json()
    if (data.errors) {
      console.error('GNews API error body:', data.errors)
      return NextResponse.json({ error: data.errors.join(', '), articles: [] })
    }

    const articles = (data.articles || []).slice(0, 6).map((a: any) => ({
      title: a.title,
      description: a.description || '',
      url: a.url,
      source: a.source?.name || 'Fuente desconocida',
      publishedAt: a.publishedAt,
      image: a.image || null,
    }))

    return NextResponse.json(articles, {
      headers: { 'Cache-Control': 'public, max-age=300, s-maxage=300, stale-while-revalidate=600' }
    })
  } catch (err: any) {
    console.error('News fetch error:', err)
    return NextResponse.json({ error: err.message || 'Error de conexión con GNews', articles: [] })
  }
}
