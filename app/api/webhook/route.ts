import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { contentId, scenarioId, webhookUrl, customCaption } = await request.json()

  // Get content
  const { data: content } = await supabase
    .from('content')
    .select('*')
    .eq('id', contentId)
    .eq('user_id', user.id)
    .single()

  if (!content) return NextResponse.json({ error: 'Content not found' }, { status: 404 })

  // Fetch specific scenario configuration if available
  let fbPageId = "<<INSERT_PAGE_ID_IN_MAKE>>"
  let igBusId = "<<INSERT_INSTAGRAM_ID_IN_MAKE>>"

  if (scenarioId) {
    const { data: scenario } = await supabase
      .from('scenarios')
      .select('facebook_page_id, instagram_business_id')
      .eq('id', scenarioId)
      .eq('user_id', user.id)
      .single()

    if (scenario) {
      if (scenario.facebook_page_id) fbPageId = scenario.facebook_page_id
      if (scenario.instagram_business_id) igBusId = scenario.instagram_business_id
    }
  }

  // Determine which webhook to use
  let targetWebhookUrl = webhookUrl

  if (!targetWebhookUrl) {
    // Fallback to legacy config
    const { data: config } = await supabase
      .from('webhook_config')
      .select('make_webhook_url')
      .eq('user_id', user.id)
      .single()

    targetWebhookUrl = config?.make_webhook_url
  }

  if (!targetWebhookUrl) {
    return NextResponse.json({ error: 'No se encontró un destino (Fábrica) configurado' }, { status: 400 })
  }

  // Format payload for Make.com according to Spec "Web to Social Media via AI"
  const socialData = formatForSocial(content)

  // Build images array
  const imagesArray = content.type === 'carousel'
    ? (content.body as any[])
      .map((s: any) => ({ image_url: s.image_url }))
      .filter((img: any) => img.image_url && !img.image_url.startsWith('data:'))
    : (socialData.image_url ? [{ image_url: socialData.image_url }] : [])

  // First image URL as a direct top-level field — used by Make.com HTTP download modules
  const firstImageUrl = imagesArray[0]?.image_url || null

  // Specification: Flat structure in root for direct mapping in Make.com
  const payload = {
    // Social IDs (Fetched from DB or Placeholders)
    page_id: fbPageId,
    instagram_id: igBusId,

    // Post Content
    title: content.title,
    caption: stripUrls(customCaption || socialData.caption), // User-edited caption takes priority; URLs always stripped
    image_url: firstImageUrl,   // Primera imagen directa → para HTTP download / Instagram / Facebook Photo URL
    link_url: `https://arq-medios.com/content/${content.id}`, // Referencia de la página — separado de la imagen
    url: `https://arq-medios.com/content/${content.id}`, // Alias legacy de link_url

    // Media: Carousel or single image
    // Spec: images must be a list of objects with { image_url: "..." }
    images: imagesArray,

    // Internal Metadata for tracking (Optional, in root)
    content_id: content.id,
    type: content.type,
    platform: content.platform,
    ai_system: "Ro_Saas Factory - Banana 2"
  }

  try {
    const res = await fetch(targetWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    let responseData = null
    try {
      const text = await res.text()
      try { responseData = JSON.parse(text) } catch { responseData = { raw: text } }
    } catch { responseData = { status: res.status } }

    const webhookStatus = res.ok ? 'delivered' : 'failed'

    // Log the webhook
    await supabase.from('webhook_logs').insert({
      user_id: user.id,
      content_id: contentId,
      webhook_url: targetWebhookUrl,
      status: webhookStatus,
      response_data: responseData,
    })

    if (!res.ok) {
      // Provide detailed error instead of "Unknown"
      return NextResponse.json({
        success: false,
        error: `Make.com respondió con error ${res.status}: ${JSON.stringify(responseData)}`,
        status: webhookStatus
      }, { status: res.status })
    }

    await supabase.from('content').update({
      status: 'published',
      published_at: new Date().toISOString()
    }).eq('id', contentId)

    return NextResponse.json({ success: true, status: webhookStatus })
  } catch (err: any) {
    console.error('Webhook fetch error:', err)
    await supabase.from('webhook_logs').insert({
      user_id: user.id,
      content_id: contentId,
      webhook_url: targetWebhookUrl,
      status: 'failed',
      response_data: { error: err.message || 'Connection failed' },
    })
    return NextResponse.json({
      error: `Error de conexión: ${err.message || 'No se pudo contactar con el destino'}. Verifica la URL del Webhook.`
    }, { status: 500 })
  }
}

/** Removes any URLs from a caption so Facebook/Instagram don't generate link preview cards */
function stripUrls(text: string): string {
  return text
    .replace(/https?:\/\/[^\s]+/g, '')  // remove http/https URLs
    .replace(/[ \t]+\n/g, '\n')          // clean trailing spaces before newlines
    .replace(/\n{3,}/g, '\n\n')          // collapse triple+ newlines to double
    .trim()
}

function formatForSocial(content: any) {
  if (content.type === 'carousel') {
    const slides = content.body as Array<{ slide_number: number; title: string; body: string; design_notes: string; image_url?: string }>
    const caption = `${content.title}\n\n${slides.map(s => `📌 Slide ${s.slide_number}: ${s.title}`).join('\n')}\n\n💾 Guarda este post\n📩 Comparte con alguien que lo necesite\n\n#contentmarketing #socialmedia #marketingdigital`

    return {
      caption,
      main_content: slides.map(s => `SLIDE ${s.slide_number}\n${s.title.toUpperCase()}\n\n${s.body}\n\n[Diseño: ${s.design_notes}]`).join('\n\n---\n\n'),
      image_url: slides.find(s => s.image_url && !s.image_url.startsWith('data:'))?.image_url
    }
  }

  const sections = content.body as Array<{ section: string; label: string; text: string }>
  return {
    main_content: sections.map(s => `[${s.label}]\n${s.text}`).join('\n\n'),
    caption: `${content.title}\n\n💬 ¿Te identificas? Comenta abajo\n📩 Comparte con alguien que lo necesite\n\n#reels #contentcreator #marketingdigital`,
    image_url: undefined
  }
}
