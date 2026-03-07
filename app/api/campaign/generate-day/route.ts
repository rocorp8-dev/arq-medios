import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const CAROUSEL_PROMPT = `Eres un experto en marketing digital y contenido viral para redes sociales.
Genera un carrusel de EXACTAMENTE 3 slides de alto impacto:

Slide 1 (Gancho): Titular poderoso — una promesa, dato sorprendente o pregunta que detenga el scroll. Máximo 8 palabras. Muy visual.
Slide 2 (Valor): El mensaje principal condensado en su forma más directa y útil. Lista de 3 puntos o una revelación clave. Máximo 30 palabras.
Slide 3 (CTA): Llamada a la acción clara y específica. Ej: "Guarda esto", "Comenta SÍ si te pasó", "Escríbeme HOY". Máximo 12 palabras.

Responde SOLO con un JSON array de 3 objetos, sin texto adicional:
[{"slide_number":1,"title":"...","body":"...","design_notes":"...","image_prompt":"[ENGLISH ONLY] Hyper-detailed photorealistic prompt: main subject in action related to the topic, cinematic lighting, shot on 35mm lens f/1.8 bokeh, ultra-realistic photography 8k RAW. NEVER include text, words or numbers in the image."}]

El body debe ser conciso y directo. Las design_notes deben indicar color dominante, tipografía y composición visual.`

async function generateImage(prompt: string, apiKey: string) {
  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'google/gemini-3-pro-image-preview',
        messages: [{ role: 'user', content: prompt }],
        modalities: ['image'],
        max_tokens: 1000,
        image_config: { aspect_ratio: '4:5' },
      }),
    })
    if (!res.ok) return null
    const data = await res.json()
    return data.choices?.[0]?.message?.images?.[0]?.image_url?.url || null
  } catch {
    return null
  }
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { contentId, title, description } = await request.json()
  if (!contentId || !title) return NextResponse.json({ error: 'Faltan campos' }, { status: 400 })

  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'GROQ_API_KEY no configurado' }, { status: 500 })

  const userPrompt = `Tema: ${title}${description ? `\nDescripción: ${description}` : ''}`

  try {
    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: CAROUSEL_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.8,
        max_tokens: 2000,
      }),
    })

    let body
    if (groqRes.ok) {
      const groqData = await groqRes.json()
      const raw = groqData.choices?.[0]?.message?.content ?? ''
      const jsonMatch = raw.match(/\[[\s\S]*\]/)
      body = jsonMatch ? JSON.parse(jsonMatch[0]) : null
    }

    if (!body) {
      return NextResponse.json({ error: 'Error generando contenido' }, { status: 500 })
    }

    // Generate images if OpenRouter key available
    const orApiKey = process.env.OPENROUTER_API_KEY
    if (orApiKey) {
      const imagePromises = body.map(async (slide: { image_prompt?: string; [key: string]: unknown }) => {
        if (slide.image_prompt) {
          const imageUrl = await generateImage(slide.image_prompt, orApiKey)
          return { ...slide, image_url: imageUrl }
        }
        return slide
      })
      body = await Promise.all(imagePromises)
    }

    // Update existing content record
    const { data: updated, error } = await supabase
      .from('content')
      .update({ body, status: 'draft' })
      .eq('id', contentId)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Track cost
    const groqCost = 0.0005
    const imageCost = body.length * 0.03
    await supabase.from('ai_costs').insert({
      user_id: user.id,
      model_used: 'Groq Llama 3.3 70B + Gemini Pro Image',
      type: 'carousel_full',
      total_cost_usd: groqCost + imageCost,
      metadata: { contentId, images_count: body.length },
    })

    return NextResponse.json(updated)
  } catch (err) {
    console.error('generate-day error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
