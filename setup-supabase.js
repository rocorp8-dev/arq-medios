const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("❌ Faltan credenciales en .env.local (especialmente SUPABASE_SERVICE_ROLE_KEY)");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function setup() {
    console.log("🚀 Iniciando configuración automática de Supabase...");

    // 1. Configurar Storage
    console.log("📦 Configurando Storage...");
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();

    if (listError) {
        console.error("❌ Error al listar buckets:", listError.message);
    } else {
        const mediaBucket = buckets.find(b => b.name === 'media');

        if (!mediaBucket) {
            console.log("🆕 Creando bucket 'media'...");
            const { error: createError } = await supabase.storage.createBucket('media', {
                public: true,
                fileSizeLimit: 5242880, // 5MB
                allowedMimeTypes: ['image/png', 'image/jpeg', 'image/webp']
            });
            if (createError) console.error("❌ Error al crear bucket:", createError.message);
            else console.log("✅ Bucket 'media' creado como PÚBLICO.");
        } else {
            console.log("🔄 El bucket 'media' ya existe. Asegurando que sea PÚBLICO...");
            const { error: updateError } = await supabase.storage.updateBucket('media', { public: true });
            if (updateError) console.error("❌ Error al actualizar bucket:", updateError.message);
            else console.log("✅ Bucket 'media' actualizado a PÚBLICO.");
        }
    }

    console.log("\n--- PRÓXIMOS PASOS (MANUALES) ---");
    console.log("⚠️  Debido a las limitaciones de la API, debes ejecutar el siguiente SQL en tu Dashboard de Supabase (SQL Editor) para habilitar las cargas de archivos y crear la tabla:");
    console.log(`
-- 1. Crear tabla media si no existe
CREATE TABLE IF NOT EXISTS public.media (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    name TEXT,
    type TEXT CHECK (type IN ('upload', 'combined', 'generated')),
    prompt TEXT,
    favorite BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Habilitar RLS en la tabla
ALTER TABLE public.media ENABLE ROW LEVEL SECURITY;

-- 3. Políticas de la tabla media
CREATE POLICY "Users can manage their own media" ON public.media
    FOR ALL USING (auth.uid() = user_id);

-- 4. POLÍTICAS CRÍTICAS DE STORAGE (Para solucionar el error de subida)
-- Permitir insertar archivos
CREATE POLICY "Permitir subida a usuarios autenticados"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'media');

-- Permitir lectura (pública)
CREATE POLICY "Permitir lectura de archivos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'media');

-- Permitir borrar
CREATE POLICY "Permitir borrar archivos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'media' AND (auth.uid())::text = (storage.foldername(name))[1]);
  `);
}

setup();
