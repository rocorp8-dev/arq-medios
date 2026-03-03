import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { contentId, webhookUrl } = await request.json()

  // Get content
  const { data: content } = await supabase
    .from('content')
    .select('*')
    .eq('id', contentId)
    .eq('user_id', user.id)
    .single()

  if (!content) return NextResponse.json({ error: 'Content not found' }, { status: 404 })

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

  // Format payload for Make.com / n8n
  // We add AI Metadata for better tracking in the destination
  const socialData = formatForSocial(content)

  const payload = {
    meta: {
      content_id: content.id,
      type: content.type,
      title: content.title,
      platform: content.platform,
      user_email: user.email,
    },
    // Pattern Banana: Observability data
    ai_metadata: {
      system: "Ro_Saas Factory - Banana 2",
      model_mix: content.type === 'carousel' ? 'Groq Llama 3 + Nano Banana Pro' : 'Groq Llama 3',
    },
    // Ready to use for Automation
    automation: {
      caption: socialData.caption,
      main_content: socialData.main_content,
      // We avoid sending internal 'body' because it can contain huge base64 strings
      media_urls: content.type === 'carousel'
        ? (content.body as any[]).map(s => s.image_url).filter(url => url && !url.startsWith('data:'))
        : [],
    }
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
  } catch (err) {
    await supabase.from('webhook_logs').insert({
      user_id: user.id,
      content_id: contentId,
      webhook_url: targetWebhookUrl,
      status: 'failed',
      response_data: { error: 'Connection failed' },
    })
    return NextResponse.json({ error: 'Failed to send webhook' }, { status: 500 })
  }
}

function formatForSocial(content: { type: string; title: string; body: unknown }) {
  if (content.type === 'carousel') {
    const slides = content.body as Array<{ slide_number: number; title: string; body: string; design_notes: string }>
    const caption = `${content.title}\n\n${slides.map(s => `📌 Slide ${s.slide_number}: ${s.title}`).join('\n')}\n\n💾 Guarda este post\n📩 Comparte con alguien que lo necesite\n\n#contentmarketing #socialmedia #marketingdigital`

    return {
      caption,
      main_content: slides.map(s => `SLIDE ${s.slide_number}\n${s.title.toUpperCase()}\n\n${s.body}\n\n[Diseño: ${s.design_notes}]`).join('\n\n---\n\n'),
    }
  }

  const sections = content.body as Array<{ section: string; label: string; text: string }>
  return {
    main_content: sections.map(s => `[${s.label}]\n${s.text}`).join('\n\n'),
    caption: `${content.title}\n\n💬 ¿Te identificas? Comenta abajo\n📩 Comparte con alguien que lo necesite\n\n#reels #contentcreator #marketingdigital`,
  }
}
