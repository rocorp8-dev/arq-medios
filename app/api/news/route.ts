import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q')
  if (!q) return NextResponse.json({ error: 'Query required' }, { status: 400 })

  const apiKey = process.env.NEWS_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'NEWS_API_KEY not configured' }, { status: 500 })

  try {
    const url = `https://gnews.io/api/v4/search?q=${encodeURIComponent(q)}&lang=es&country=mx&max=5&sortby=publishedAt&token=${apiKey}`
    const res = await fetch(url) // no cache — evitar cachear respuestas de error

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

    const articles = (data.articles || []).slice(0, 5).map((a: any) => ({
      title: a.title,
      description: a.description || '',
      url: a.url,
      source: a.source?.name || 'Fuente desconocida',
      publishedAt: a.publishedAt,
    }))
    return NextResponse.json(articles)
  } catch (err: any) {
    console.error('News fetch error:', err)
    return NextResponse.json({ error: err.message || 'Error de conexión con GNews', articles: [] })
  }
}
