import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { imageUrls, instruction } = await request.json()
    const apiKey = process.env.OPENROUTER_API_KEY

    if (!apiKey) {
        return NextResponse.json({ error: 'Falta la API Key de OpenRouter' }, { status: 500 })
    }

    if (!imageUrls || imageUrls.length < 1) {
        return NextResponse.json({ error: 'Se necesita al menos una imagen' }, { status: 400 })
    }

    // Combine multiple images using Gemini 3 Pro Image (Nano Banana Pro)
    // We send them as multiple image messages or in the same message depending on API support
    // OpenRouter supports multiple image URLs in the content
    const messages = [
        {
            role: 'user',
            content: [
                { type: 'text', text: instruction || 'Genera una nueva imagen que combine estos elementos de forma creativa y profesional.' },
                ...imageUrls.map((url: string) => ({
                    type: 'image_url',
                    image_url: { url }
                }))
            ]
        }
    ]

    try {
        const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'google/gemini-3-pro-image-preview',
                messages,
                modalities: ['image'],
                max_tokens: 1000,
                image_config: {
                    aspect_ratio: '4:5'
                }
            }),
        })

        if (!res.ok) {
            const errText = await res.text()
            console.error('OpenRouter Combine error:', errText)
            return NextResponse.json({ error: 'Error en la generación multimodal' }, { status: 500 })
        }

        const data = await res.json()
        const generatedUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url || null

        if (!generatedUrl) {
            return NextResponse.json({ error: 'No se generó ninguna imagen' }, { status: 500 })
        }

        // Save to media table
        const { data: media, error: mediaError } = await supabase.from('media').insert({
            user_id: user.id,
            url: generatedUrl,
            name: `Combinación: ${instruction?.substring(0, 20)}...`,
            type: 'combined',
            prompt: instruction
        }).select().single()

        if (mediaError) {
            console.warn('Error saving to media table:', mediaError)
            // Return the URL anyway if DB fails
            return NextResponse.json({ url: generatedUrl })
        }

        // Track AI Costs
        await supabase.from('ai_costs').insert({
            user_id: user.id,
            model_used: 'google/gemini-3-pro-image-preview (Nano Banana Pro)',
            type: 'image_combination',
            total_cost_usd: 0.05,
            metadata: { images_count: imageUrls.length, instruction: instruction?.substring(0, 50) }
        })

        return NextResponse.json(media)
    } catch (err) {
        console.error('Combine fetch error:', err)
        return NextResponse.json({ error: 'Error de conexión con la IA' }, { status: 500 })
    }
}
