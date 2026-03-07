import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const PARRILLA_PROMPT = `Eres experto en marketing digital. Genera una parrilla de contenido semanal de 7 días para el tema indicado.

Cada día debe tener un ángulo DISTINTO y complementario usando estos arquetipos:
Día 1: Educativo / Tip práctico
Día 2: Rompiendo Mitos
Día 3: Caso de éxito / Storytelling
Día 4: Lista / Checklist
Día 5: Pregunta para engagement
Día 6: Detrás de cámaras / Proceso
Día 7: CTA / Oferta / Cierre de semana

Responde SOLO con un JSON array de 7 objetos, sin texto adicional:
[{"day":1,"angle":"Educativo","title":"Título del carrusel","description":"Descripción breve del contenido a generar"}]`

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { keyword, campaignName, startDate, scenarioId } = await request.json()
  if (!keyword || !campaignName || !startDate) {
    return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
  }

  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'GROQ_API_KEY no configurado' }, { status: 500 })
  }

  // 1. Generate 7-day plan with Groq
  let days: Array<{ day: number; angle: string; title: string; description: string }>

  try {
    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: PARRILLA_PROMPT },
          { role: 'user', content: `Tema: ${keyword}` },
        ],
        temperature: 0.8,
        max_tokens: 1000,
      }),
    })

    if (!groqRes.ok) {
      const errData = await groqRes.json().catch(() => ({}))
      console.error('Groq parrilla error:', groqRes.status, errData)
      return NextResponse.json({ error: 'Error generando parrilla con Groq' }, { status: 500 })
    }

    const groqData = await groqRes.json()
    const raw = groqData.choices?.[0]?.message?.content ?? ''
    const jsonMatch = raw.match(/\[[\s\S]*\]/)
    if (!jsonMatch) {
      console.error('No JSON array in Groq response:', raw)
      return NextResponse.json({ error: 'Respuesta inválida de Groq' }, { status: 500 })
    }
    days = JSON.parse(jsonMatch[0])
  } catch (err) {
    console.error('Groq fetch error:', err)
    return NextResponse.json({ error: 'Error conectando con Groq' }, { status: 500 })
  }

  // 2. Insert campaign
  const start = new Date(startDate)
  const end = new Date(start)
  end.setDate(end.getDate() + 6)

  const { data: campaign, error: campaignError } = await supabase
    .from('campaigns')
    .insert({
      user_id: user.id,
      name: campaignName,
      status: 'active',
      start_date: start.toISOString().split('T')[0],
      end_date: end.toISOString().split('T')[0],
      topic_keyword: keyword,
      scenario_id: scenarioId || null,
    })
    .select()
    .single()

  if (campaignError) {
    console.error('Campaign insert error:', campaignError)
    return NextResponse.json({ error: campaignError.message }, { status: 500 })
  }

  // 3. Insert 7 draft content records
  const contentRows = days.map((d) => {
    const date = new Date(start)
    date.setDate(date.getDate() + (d.day - 1))
    return {
      user_id: user.id,
      campaign_id: campaign.id,
      topic_id: null,
      type: 'carousel' as const,
      title: d.title,
      body: [] as unknown[],
      status: 'draft' as const,
      platform: 'both' as const,
      scheduled_at: date.toISOString(),
    }
  })

  const { data: contentItems, error: contentError } = await supabase
    .from('content')
    .insert(contentRows)
    .select('id, title, scheduled_at')

  if (contentError) {
    console.error('Content insert error:', contentError)
    // Rollback campaign
    await supabase.from('campaigns').delete().eq('id', campaign.id)
    return NextResponse.json({ error: contentError.message }, { status: 500 })
  }

  // 4. Build response
  const result = days.map((d, i) => ({
    day: d.day,
    angle: d.angle,
    title: d.title,
    description: d.description,
    date: contentItems![i].scheduled_at,
    contentId: contentItems![i].id,
  }))

  return NextResponse.json({ campaignId: campaign.id, days: result })
}
