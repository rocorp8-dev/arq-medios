const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function debug() {
    const { data, error } = await supabase
        .from('content')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)

    if (error) {
        console.error('Error:', error)
        return
    }

    console.log('Last content generated:')
    console.log(JSON.stringify(data?.[0], null, 2))

    if (data?.[0]?.body) {
        const body = data[0].body
        console.log('Body slides/sections:', body.length)
        body.forEach((slide, i) => {
            console.log(`Slide ${i + 1}: image_url=${slide.image_url ? 'PRESENT' : 'MISSING'}, image_prompt=${slide.image_prompt ? 'PRESENT' : 'MISSING'}`)
        })
    }
}

debug()
