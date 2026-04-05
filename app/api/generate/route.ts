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
[{"slide_number":1,"title":"...","body":"...","design_notes":"...","image_prompt":"[ENGLISH ONLY] Write the image prompt EXACTLY following this photorealistic template: 'Hyper-detailed photorealistic 8k RAW photo: [describe subject and action], [describe background]. VERY IMPORTANT: There MUST be a large, bold, highly legible typography organically integrated into the scene that literally reads the exact Spanish words: \\\"[INSERT EXACT SPANISH TITLE HERE]\\\" (DO NOT translate this text to English, write the exact Spanish characters). Cinematic lighting, 35mm lens f/1.8'."}]

El body debe ser conciso (máximo 20 palabras por slide). Las design_notes deben incluir indicaciones de color, tipografía y elementos visuales.`

const REEL_PROMPT = `Eres un experto en marketing digital y contenido viral para redes sociales.
Genera un guion de Reel siguiendo EXACTAMENTE la estructura "El Problema Invisible":

1. Gancho: Declaración que cuestione la situación actual del espectador.
2. Problema Invisible: Por qué les afecta aunque no lo sepan.
3. Evidencia: Síntomas comunes que demuestran que el problema es real.
4. Solución: Presenta la estrategia como la salida simple.
5. CTA: Instrucción para interacción o conversión inmediata.

Responde SOLO con un JSON array de 5 objetos con este formato:
[{"section":"gancho","label":"Gancho","text":"..."},{"section":"problema","label":"Problema Invisible","text":"..."},{"section":"evidencia","label":"Evidencia","text":"..."},{"section":"solucion","label":"Solución","text":"..."},{"section":"cta","label":"Call to Action","text":"..."}]`

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { topicId, topicTitle, topicDescription, type, newsContext } = await request.json()

  const apiKey = process.env.CEREBRAS_API_KEY
  if (!apiKey) {
    // Fallback: generate demo content without Cerebras
    const body = type === 'carousel'
      ? generateDemoCarousel(topicTitle)
      : generateDemoReel(topicTitle)

    const { data: content, error } = await supabase.from('content').insert({
      user_id: user.id,
      topic_id: topicId,
      type,
      title: topicTitle,
      body,
      status: 'draft',
      platform: 'both',
    }).select().single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(content)
  }

  const groqApiKey = process.env.GROQ_API_KEY
  if (!groqApiKey) return NextResponse.json({ error: 'Configura GROQ_API_KEY' }, { status: 500 })

  const systemPrompt = type === 'carousel' ? CAROUSEL_PROMPT : REEL_PROMPT
  const newsBlock = newsContext?.title
    ? `\n\nNOTICIA RECIENTE DEL DÍA (basa el contenido ESTRICTAMENTE en esto):\nTitular: ${newsContext.title}\nResumen: ${newsContext.description || ''}\nÁngulo requerido: Explica cómo esta noticia impacta directamente al cliente del nicho.`
    : ''
  const userPrompt = `Tema: ${topicTitle}${topicDescription ? `\nDescripción: ${topicDescription}` : ''}${newsBlock}`

  try {
    console.log('Generating with Groq AI...')
    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 3000,
        response_format: { type: 'json_object' }
      }),
    })

    if (!groqRes.ok) {
      throw new Error('Groq API Error')
    }

    const groqData = await groqRes.json()
    const raw = groqData.choices?.[0]?.message?.content ?? ''
    
    let body;
    try {
      const parsed = JSON.parse(raw);
      body = Array.isArray(parsed) ? parsed : (parsed.slides || parsed.content || []);
    } catch (e) {
      const jsonMatch = raw.match(/\[[\s\S]*\]/)
      body = jsonMatch ? JSON.parse(jsonMatch[0]) : null
    }

    if (!body || body.length === 0) {
      throw new Error('AI returned empty body')
    }

    const { data: content, error } = await supabase.from('content').insert({
      user_id: user.id,
      topic_id: topicId,
      type,
      title: topicTitle,
      body,
      status: 'draft',
      platform: 'both',
    }).select().single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    await supabase.from('ai_costs').insert({
      user_id: user.id,
      model_used: 'Groq Llama 3.3 70B',
      type: type === 'carousel' ? 'carousel_text' : 'reel_script',
      total_cost_usd: 0.0001,
      metadata: { topicId, provider: 'groq' }
    })

    return NextResponse.json(content)
  } catch (err) {
    console.error('Generation error:', err)
    return NextResponse.json({ error: 'Error del servidor de IA' }, { status: 500 })
  }
}

function generateDemoCarousel(title: string) {
  return [
    { slide_number: 1, title: '🎯 ' + title, body: '¿Sabías que el 90% comete este error sin saberlo?', design_notes: 'Fondo azul oscuro, texto blanco grande, tipografía bold', image_prompt: 'A premium professional look with dark blue background and target icon' },
    { slide_number: 2, title: 'El problema real', body: 'La mayoría publica contenido sin estrategia y espera resultados mágicos', design_notes: 'Fondo claro, texto oscuro, icono de alerta', image_prompt: 'Minimalist illustration of a person confused with social media icons' },
    { slide_number: 3, title: 'Errores comunes', body: '❌ No investigar a tu audiencia\n❌ Publicar sin horario fijo\n❌ Ignorar las métricas', design_notes: 'Lista con iconos rojos, fondo blanco', image_prompt: 'Red warning signs on a white clean background' },
    { slide_number: 4, title: 'Paso 1: Investiga', body: 'Dedica 15 minutos diarios a estudiar qué contenido funciona en tu nicho', design_notes: 'Número grande "1", acento azul', image_prompt: 'Magnifying glass over digital data, professional style' },
    { slide_number: 5, title: 'Paso 2: Planifica', body: 'Crea un calendario de contenido semanal con temas variados', design_notes: 'Número grande "2", acento verde', image_prompt: 'Clean digital calendar interface with colorful events' },
    { slide_number: 6, title: 'Paso 3: Crea', body: 'Usa plantillas probadas y adapta el contenido a tu voz única', design_notes: 'Número grande "3", acento púrpura', image_prompt: 'A creative workspace with artistic tools and a tablet' },
    { slide_number: 7, title: 'Paso 4: Mide', body: 'Revisa las métricas cada semana y ajusta tu estrategia', design_notes: 'Número grande "4", acento naranja', image_prompt: 'Professional bar charts and growth graphs' },
    { slide_number: 8, title: 'El secreto', body: 'La consistencia vence al talento. 30 días de contenido cambian todo.', design_notes: 'Fondo degradado, texto centrado, tipografía impactante', image_prompt: 'Abstract representation of growth and consistency, sunrise' },
    { slide_number: 9, title: 'Resultados reales', body: '📈 +300% alcance\n👥 +50% seguidores\n💬 +200% interacciones', design_notes: 'Métricas con iconos, fondo oscuro, texto verde', image_prompt: 'Infographic style dashboard showing 300% growth' },
    { slide_number: 10, title: '¿Listo para empezar?', body: '💾 GUARDA este post\n💬 Comenta GUÍA\n📩 Comparte con alguien que lo necesite', design_notes: 'CTA grande, botón visual, fondo llamativo con acento', image_prompt: 'Modern CTA button with save and share icons' },
  ]
}

function generateDemoReel(title: string) {
  return [
    { section: 'gancho', label: 'Gancho', text: `¿Estás haciendo todo bien y aún así no creces? Lo que te voy a contar sobre "${title}" cambiará tu perspectiva...` },
    { section: 'problema', label: 'Problema Invisible', text: 'El problema no es tu contenido. Es que estás usando una estrategia de 2020 en 2025. Los algoritmos cambiaron y nadie te avisó.' },
    { section: 'evidencia', label: 'Evidencia', text: 'Si publicas y nadie comenta... si tus stories no tienen respuestas... si tu alcance bajó un 70%... todo esto son síntomas del mismo problema.' },
    { section: 'solucion', label: 'Solución', text: 'La solución es simple: deja de publicar para ti y empieza a crear para tu audiencia. Investiga, planifica y sé consistente 30 días seguidos.' },
    { section: 'cta', label: 'Call to Action', text: 'Si esto te resonó, sígueme para más estrategias que SÍ funcionan. Y comenta "QUIERO" para recibir mi guía gratuita.' },
  ]
}
