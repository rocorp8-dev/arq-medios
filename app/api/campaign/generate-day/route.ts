import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const CAROUSEL_PROMPT = `Eres un experto en marketing digital y contenido viral para redes sociales.
Genera un carrusel viral de 10 slides siguiendo EXACTAMENTE esta estructura:

Slide 1 (Gancho): Pregunta intrigante o promesa fuerte. Tipografía grande y color llamativo.
Slides 2-3 (Problema): Presenta un problema real y relatable con errores comunes.
Slides 4-7 (Contenido Útil): Solución en pasos prácticos. Máximo 20 palabras por slide. Usa listas.
Slides 8-9 (Revelación): Un aprendizaje crucial o resumen visual inesperado.
Slide 10 (CTA): Llamada a la acción clara: "Comenta GUÍA" o "Guarda este post".

Responde SOLO con un JSON array de 10 objetos con este formato:
[{"slide_number":1,"title":"...","body":"...","design_notes":"...","image_prompt":"[ENGLISH ONLY] Act as a Midjourney expert prompt engineer. Write a hyper-detailed photorealistic prompt for this slide specifying: 1) Main subject in action related to the slide topic, 2) Detailed environment and background, 3) Lighting style (e.g. cinematic lighting, volumetric light, golden hour, harsh shadows), 4) Camera and lens type (e.g. shot on 35mm lens, DSLR, f/1.8 bokeh, wide angle), 5) Visual style (e.g. ultra-realistic photography, 8k resolution, RAW photo, editorial style, hyper-detailed). NEVER include text, words, letters or numbers inside the image."}]

El body debe ser conciso (máximo 20 palabras por slide). Las design_notes deben incluir indicaciones de color, tipografía y elementos visuales.`

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
