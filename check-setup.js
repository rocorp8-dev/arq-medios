const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("❌ Faltan credenciales en .env.local");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    console.log("🔍 Verificando configuración de Supabase...");

    // 1. Verificar Tabla 'media'
    const { error: tableError } = await supabase.from('media').select('count', { count: 'exact', head: true });
    if (tableError) {
        if (tableError.code === '42P01') {
            console.log("❌ ERROR: La tabla 'media' NO existe aún. Debes ejecutar el SQL que te pasé.");
        } else {
            console.log("⚠️  Error al consultar tabla media:", tableError.message);
        }
    } else {
        console.log("✅ TABLA: La tabla 'media' existe y es accesible.");
    }

    // 2. Verificar Bucket 'media'
    const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
    if (bucketError) {
        console.log("⚠️  Error al consultar buckets:", bucketError.message);
    } else {
        const mediaBucket = buckets.find(b => b.name === 'media');
        if (mediaBucket) {
            console.log(`✅ STORAGE: El bucket 'media' existe y está configurado como ${mediaBucket.public ? 'PÚBLICO' : 'PRIVADO'}.`);
            if (!mediaBucket.public) {
                console.log("👉 TIP: Cámbialo a PÚBLICO en Supabase > Storage > media > Bucket Settings.");
            }
        } else {
            console.log("❌ ERROR: El bucket 'media' NO existe.");
        }
    }

    console.log("\n--- Resumen ---");
    if (!tableError && buckets.find(b => b.name === 'media')) {
        console.log("🚀 ¡TODO LISTO! Ya puedes usar las funciones de Combinar y Subir.");
    } else {
        console.log("🛠️  Aún faltan ajustes por hacer en el panel de Supabase.");
    }
}

check();
