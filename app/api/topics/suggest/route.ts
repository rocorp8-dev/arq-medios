import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const SUGGEST_PROMPT = `Eres experto en marketing de contenidos. Basándote en la keyword y los titulares de noticias proporcionados, sugiere EXACTAMENTE 2 ideas de topics para redes sociales.

Cada topic debe:
- Tener un ángulo único y original (no repetir los titulares)
- Ser relevante para el nicho de la keyword
- Poder generar engagement en Instagram/Facebook
- Tener un título que genere curiosidad o resuelva un problema

Responde SOLO con un JSON array de 2 objetos, sin texto adicional:
[{"title":"...","description":"Descripción de 1-2 oraciones explicando el ángulo y valor del contenido","category":"..."}]

La categoría debe ser una sola palabra o frase corta (ej: Educativo, Caso de Éxito, Mitos, Tips, Tendencia, Estrategia).`

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { keyword, articleTitles } = await request.json()
  if (!keyword) return NextResponse.json({ error: 'keyword requerida' }, { status: 400 })

  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'GROQ_API_KEY no configurado' }, { status: 500 })

  const newsBlock = articleTitles?.length
    ? `\nNoticias recientes del sector:\n${articleTitles.slice(0, 3).map((t: string, i: number) => `${i + 1}. ${t}`).join('\n')}`
    : ''

  try {
    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: SUGGEST_PROMPT },
          { role: 'user', content: `Keyword: ${keyword}${newsBlock}` },
        ],
        temperature: 0.9,
        max_tokens: 500,
      }),
    })

    if (!groqRes.ok) return NextResponse.json({ error: 'Error con Groq' }, { status: 500 })

    const groqData = await groqRes.json()
    const raw = groqData.choices?.[0]?.message?.content ?? ''
    const jsonMatch = raw.match(/\[[\s\S]*\]/)
    if (!jsonMatch) return NextResponse.json({ error: 'Respuesta inválida' }, { status: 500 })

    const suggestions = JSON.parse(jsonMatch[0])
    return NextResponse.json(suggestions)
  } catch (err) {
    console.error('suggest error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
