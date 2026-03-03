import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    try {
        const supabase = await createClient();

        // Webhook de fal.ai no tiene auth de usuario en el header, 
        // pero podemos verificar un secret si lo configuramos en la URL de fal.ai
        // Ej: /api/generate/video/webhook?secret=MI_SECRET
        const { searchParams } = new URL(req.url);
        const secret = searchParams.get('secret');

        // Por ahora omitimos validación de secret para facilitar la demo, 
        // pero en prod se debería usar process.env.FAL_WEBHOOK_SECRET

        const body = await req.json();
        const { request_id, status, payload, user_id } = body;

        // Fal.ai envía el status 'COMPLETED' cuando termina
        if (status === 'COMPLETED' && payload?.video?.url) {
            const videoUrl = payload.video.url;

            // 1. Guardar en la tabla media (Patrón Multimedia v4.1)
            const { error: mediaError } = await supabase.from('media').insert({
                user_id: user_id, // Lo pasamos en el webhook_url de fal.ai
                url: videoUrl,
                name: `AI Video ${request_id.slice(0, 8)}`,
                type: 'video',
                prompt: payload._prompt || 'AI Generated Video',
                favorite: false
            });

            if (mediaError) {
                console.error('Webhook error saving media:', mediaError);
            }
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Fal.ai Webhook Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
