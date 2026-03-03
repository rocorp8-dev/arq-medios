import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
    try {
        const supabase = await createClient();
        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const { prompt, model = 'fal-ai/hailuo-ai/t2v-02-standard', aspect_ratio = '9:16' } = await req.json();

        if (!prompt) {
            return NextResponse.json({ error: 'Prompt es requerido' }, { status: 400 });
        }

        const FAL_KEY = process.env.FAL_API_KEY;

        if (!FAL_KEY) {
            return NextResponse.json({ error: 'FAL_API_KEY no configurada' }, { status: 500 });
        }

        // Usamos fetch directo a fal.ai para mayor control y evitar dependencias extra
        const response = await fetch(`https://queue.fal.run/${model}`, {
            method: 'POST',
            headers: {
                'Authorization': `Key ${FAL_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                prompt: prompt,
                aspect_ratio: aspect_ratio,
                webhook_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://app-src-iota.vercel.app'}/api/generate/video/webhook`,
                user_id: user.id, // Para que el webhook sepa a quién pertenece el video
                _prompt: prompt // Guardamos el prompt original para el webhook
            }),
        });

        if (!response.ok) {
            const errorContent = await response.text();
            console.error('Fal.ai error:', errorContent);
            return NextResponse.json({ error: 'Error en generación de video' }, { status: 500 });
        }

        const result = await response.json();

        // Iniciar el tracking de costos (Lesson 12)
        // Nota: El costo del modelo standard es aprox $0.23 por video de 5s
        await supabase.from('ai_costs').insert({
            user_id: user.id,
            model_used: model,
            type: 'video',
            duration_seconds: 5,
            total_cost_usd: 0.23,
            metadata: { prompt, aspect_ratio, request_id: result.request_id }
        });

        return NextResponse.json({
            success: true,
            request_id: result.request_id,
            status_url: `https://queue.fal.run/${model}/requests/${result.request_id}`
        });

    } catch (error) {
        console.error('Video generation error:', error);
        return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
    }
}
