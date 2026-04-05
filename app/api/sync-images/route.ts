import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { contentId, results } = await request.json()
    if (!contentId || !Array.isArray(results)) {
      return NextResponse.json({ error: 'Faltan parámetros' }, { status: 400 })
    }

    const supabase = await createClient()

    // 1. Obtener el contenido actual
    const { data: content, error: fetchError } = await supabase
      .from('content')
      .select('body')
      .eq('id', contentId)
      .single()

    if (fetchError || !content) {
      return NextResponse.json({ error: 'Contenido no encontrado' }, { status: 404 })
    }

    // 2. Actualizar el body con las URLs de las imágenes
    // Se busca por index en la respuesta para evitar descuadres.
    const updatedBody = content.body.map((slide: any, index: number) => {
      const result = results.find((r: any) => r.index === index + 1)
      if (result && result.url) {
        return { ...slide, image_url: result.url }
      }
      return slide
    })

    // 3. Guardar cambios
    const { error: updateError } = await supabase
      .from('content')
      .update({ body: updatedBody, status: 'completed' })
      .eq('id', contentId)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error('Sync error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
