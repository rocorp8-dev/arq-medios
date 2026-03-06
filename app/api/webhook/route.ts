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
  let scenarioAccessToken: string | null = null
  let scenarioChannels: string[] = []

  if (scenarioId) {
    const { data: scenario } = await supabase
      .from('scenarios')
      .select('facebook_page_id, instagram_business_id, access_token, channels')
      .eq('id', scenarioId)
      .eq('user_id', user.id)
      .single()

    if (scenario) {
      if (scenario.facebook_page_id) fbPageId = scenario.facebook_page_id
      if (scenario.instagram_business_id) igBusId = scenario.instagram_business_id
      if (scenario.access_token) scenarioAccessToken = scenario.access_token
      if (scenario.channels) scenarioChannels = scenario.channels
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

  // (targetWebhookUrl may be null if using direct IG API — checked later)

  // Format payload for Make.com according to Spec "Web to Social Media via AI"
  const socialData = formatForSocial(content)

  // Build images array — auto-upload any data: URLs to Supabase storage
  let slidesBody = content.body as any[]
  let bodyUpdated = false

  if (content.type === 'carousel') {
    slidesBody = await Promise.all(
      slidesBody.map(async (slide: any, i: number) => {
        if (slide.image_url?.startsWith('data:')) {
          const publicUrl = await uploadDataUrl(supabase, slide.image_url, content.id, i)
          if (publicUrl) {
            bodyUpdated = true
            return { ...slide, image_url: publicUrl }
          }
        }
        return slide
      })
    )
    // Persist the upgraded URLs so next publish doesn't re-upload
    if (bodyUpdated) {
      await supabase.from('content').update({ body: slidesBody }).eq('id', content.id)
    }
  }

  const imagesArray = content.type === 'carousel'
    ? slidesBody
      .filter((img: any) => img.image_url && !img.image_url.startsWith('data:'))
      .map((s: any) => ({ 
        image_url: s.image_url,
        media_type: "IMAGE" // Requerido por el módulo 'Create a carousel post' de Make
      }))
    : (socialData.image_url ? [{ image_url: socialData.image_url, media_type: "IMAGE" }] : [])

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

  // ── Instagram Direct Carousel (Graph API) ───────────────────────────────────
  // If the scenario has an access_token and the content is a carousel with valid images,
  // publish directly to Instagram (bypassing Make.com for IG).
  // Make.com still receives the payload for Facebook if configured.
  const igImages = imagesArray.filter((img: any) => img.image_url && !img.image_url.startsWith('data:'))
  let igPublished = false

  if (scenarioAccessToken && content.type === 'carousel' && igBusId && igImages.length >= 2) {
    try {
      const igResult = await publishCarouselToInstagram(
        igBusId,
        scenarioAccessToken,
        igImages.map((img: any) => img.image_url),
        payload.caption
      )
      igPublished = true
      await supabase.from('webhook_logs').insert({
        user_id: user.id,
        content_id: contentId,
        webhook_url: `instagram-graph-api://${igBusId}`,
        status: 'delivered',
        response_data: igResult,
      })
    } catch (err: any) {
      console.error('Instagram Graph API error:', err)
      await supabase.from('webhook_logs').insert({
        user_id: user.id,
        content_id: contentId,
        webhook_url: `instagram-graph-api://${igBusId}`,
        status: 'failed',
        response_data: { error: err.message },
      })
      return NextResponse.json({ error: `Error publicando carrusel en Instagram: ${err.message}` }, { status: 500 })
    }
  }

  // ── Make.com Webhook ─────────────────────────────────────────────────────────
  // Skip Make.com if: IG already published AND scenario is IG-only (no Facebook)
  const hasFB = scenarioChannels.includes('facebook')
  const skipMakeCom = igPublished && !hasFB

  if (!skipMakeCom) {
    if (!targetWebhookUrl) {
      if (igPublished) {
        // IG was published directly, no Make.com needed
        await supabase.from('content').update({
          status: 'published',
          published_at: new Date().toISOString()
        }).eq('id', contentId)
        return NextResponse.json({ success: true, status: 'delivered', via: 'instagram-graph-api' })
      }
      return NextResponse.json({ error: 'No se encontró un destino (Fábrica) configurado' }, { status: 400 })
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

      await supabase.from('webhook_logs').insert({
        user_id: user.id,
        content_id: contentId,
        webhook_url: targetWebhookUrl,
        status: webhookStatus,
        response_data: responseData,
      })

      if (!res.ok) {
        return NextResponse.json({
          success: false,
          error: `Make.com respondió con error ${res.status}: ${JSON.stringify(responseData)}`,
          status: webhookStatus
        }, { status: res.status })
      }
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

  await supabase.from('content').update({
    status: 'published',
    published_at: new Date().toISOString()
  }).eq('id', contentId)

  return NextResponse.json({
    success: true,
    status: 'delivered',
    via: igPublished ? (skipMakeCom ? 'instagram-graph-api' : 'instagram-graph-api+make') : 'make'
  })
}

/** Publishes a multi-image carousel to Instagram via Graph API (3-step flow) */
async function publishCarouselToInstagram(
  igUserId: string,
  accessToken: string,
  imageUrls: string[],
  caption: string
): Promise<{ id: string }> {
  const base = `https://graph.facebook.com/v19.0`
  const token = encodeURIComponent(accessToken)

  // Step 1: Create item containers (one per image)
  const containerIds: string[] = []
  for (const imageUrl of imageUrls) {
    const url = `${base}/${igUserId}/media?image_url=${encodeURIComponent(imageUrl)}&is_carousel_item=true&access_token=${token}`
    const res = await fetch(url, { method: 'POST' })
    const data = await res.json()
    if (!res.ok || !data.id) throw new Error(`IG container error: ${JSON.stringify(data)}`)
    containerIds.push(data.id)
  }

  // Step 2: Create carousel container
  const carouselUrl = `${base}/${igUserId}/media?media_type=CAROUSEL&children=${containerIds.join(',')}&caption=${encodeURIComponent(caption)}&access_token=${token}`
  const carouselRes = await fetch(carouselUrl, { method: 'POST' })
  const carouselData = await carouselRes.json()
  if (!carouselRes.ok || !carouselData.id) throw new Error(`IG carousel container error: ${JSON.stringify(carouselData)}`)

  // Step 3: Publish carousel
  const publishUrl = `${base}/${igUserId}/media_publish?creation_id=${carouselData.id}&access_token=${token}`
  const publishRes = await fetch(publishUrl, { method: 'POST' })
  const publishData = await publishRes.json()
  if (!publishRes.ok || !publishData.id) throw new Error(`IG publish error: ${JSON.stringify(publishData)}`)

  return { id: publishData.id }
}

/** Uploads a data: base64 URL to Supabase storage and returns the public URL */
async function uploadDataUrl(supabase: any, dataUrl: string, contentId: string, slideIndex: number): Promise<string | null> {
  try {
    const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/)
    if (!match) return null
    const mimeType = match[1]
    const base64 = match[2]
    const ext = mimeType.split('/')[1]?.split('+')[0] || 'png'
    const path = `content/${contentId}/slide-${slideIndex}-${Date.now()}.${ext}`
    const buffer = Buffer.from(base64, 'base64')
    const { error } = await supabase.storage.from('media').upload(path, buffer, { contentType: mimeType, upsert: true })
    if (error) return null
    const { data: { publicUrl } } = supabase.storage.from('media').getPublicUrl(path)
    return publicUrl
  } catch {
    return null
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
    const subtitle = slides[0]?.title || ''
    const caption = `${content.title}\n\n${subtitle}\n\n💾 Guarda este post\n📩 Comparte con alguien que lo necesite\n\n#contentmarketing #socialmedia #marketingdigital`

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
