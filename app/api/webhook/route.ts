import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { contentId } = await request.json()

  // Get content
  const { data: content } = await supabase
    .from('content')
    .select('*')
    .eq('id', contentId)
    .eq('user_id', user.id)
    .single()

  if (!content) return NextResponse.json({ error: 'Content not found' }, { status: 404 })

  // Get webhook config
  const { data: config } = await supabase
    .from('webhook_config')
    .select('make_webhook_url')
    .eq('user_id', user.id)
    .single()

  if (!config?.make_webhook_url) {
    return NextResponse.json({ error: 'Webhook URL no configurada' }, { status: 400 })
  }

  // Format payload for Make.com
  const payload = {
    type: content.type,
    title: content.title,
    platform: content.platform,
    status: content.status,
    body: content.body,
    created_at: content.created_at,
    formatted: formatForSocial(content),
  }

  try {
    const res = await fetch(config.make_webhook_url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    const webhookStatus = res.ok ? 'delivered' : 'failed'
    let responseData = null
    try { responseData = await res.json() } catch { responseData = { status: res.status } }

    // Log the webhook
    await supabase.from('webhook_logs').insert({
      user_id: user.id,
      content_id: contentId,
      webhook_url: config.make_webhook_url,
      status: webhookStatus,
      response_data: responseData,
    })

    if (webhookStatus === 'delivered') {
      await supabase.from('content').update({ status: 'published', published_at: new Date().toISOString() }).eq('id', contentId)
    }

    return NextResponse.json({ success: res.ok, status: webhookStatus })
  } catch (err) {
    await supabase.from('webhook_logs').insert({
      user_id: user.id,
      content_id: contentId,
      webhook_url: config.make_webhook_url,
      status: 'failed',
      response_data: { error: 'Connection failed' },
    })
    return NextResponse.json({ error: 'Failed to send webhook' }, { status: 500 })
  }
}

function formatForSocial(content: { type: string; title: string; body: unknown }) {
  if (content.type === 'carousel') {
    const slides = content.body as Array<{ slide_number: number; title: string; body: string; design_notes: string }>
    return {
      caption: `${content.title}\n\n${slides.map(s => `📌 Slide ${s.slide_number}: ${s.title}`).join('\n')}\n\n💾 Guarda este post\n📩 Comparte con alguien que lo necesite\n\n#contentmarketing #socialmedia #marketingdigital`,
      slides: slides.map(s => ({ text: `${s.title}\n\n${s.body}`, design: s.design_notes })),
    }
  }

  const sections = content.body as Array<{ section: string; label: string; text: string }>
  return {
    script: sections.map(s => `[${s.label}]\n${s.text}`).join('\n\n'),
    caption: `${content.title}\n\n💬 ¿Te identificas? Comenta abajo\n📩 Comparte con alguien que lo necesite\n\n#reels #contentcreator #marketingdigital`,
  }
}
