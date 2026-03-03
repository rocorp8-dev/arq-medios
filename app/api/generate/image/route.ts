import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { prompt } = await request.json()
    const apiKey = process.env.OPENROUTER_API_KEY

    if (!apiKey) {
        return NextResponse.json({ error: 'Faltan credenciales' }, { status: 500 })
    }

    try {
        const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'google/gemini-3-pro-image-preview',
                messages: [{ role: 'user', content: prompt }],
                modalities: ['image'],
                max_tokens: 1000,
                image_config: {
                    aspect_ratio: '4:5'
                }
            }),
        })

        if (!res.ok) {
            console.error('Single image gen error:', await res.text())
            return NextResponse.json({ error: 'Error en la generación' }, { status: 500 })
        }

        const data = await res.json()
        const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url || null

        if (!imageUrl) {
            return NextResponse.json({ error: 'No se generó la imagen' }, { status: 500 })
        }

        // Save to media table as 'generated'
        await supabase.from('media').insert({
            user_id: user.id,
            url: imageUrl,
            name: `Generada: ${prompt.substring(0, 20)}...`,
            type: 'generated',
            prompt: prompt,
            favorite: false
        })

        // Track AI Costs
        await supabase.from('ai_costs').insert({
            user_id: user.id,
            model_used: 'google/gemini-3-pro-image-preview',
            type: 'single_image',
            total_cost_usd: 0.03,
            metadata: { prompt: prompt.substring(0, 50) }
        })

        return NextResponse.json({ url: imageUrl })
    } catch (err) {
        console.error('Image generation fetch error:', err)
        return NextResponse.json({ error: 'Error de conexión' }, { status: 500 })
    }
}
