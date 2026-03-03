const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    console.log("Creating 'media' table and 'media' bucket...");

    // Create table via SQL RPC if available, or just log instructions
    // Since I can't easily run arbitrary SQL via the client without an RPC function, 
    // I will try to use the 'query' or similar if it exists, but usually it doesn't.
    // Instead, I'll check if I can create the table by inserting into a non-existent table 
    // which won't work.

    // Actually, I'll just create the Bucket first.
    const { data: bucket, error: bucketError } = await supabase.storage.createBucket('media', {
        public: true,
        fileSizeLimit: 5242880, // 5MB
        allowedMimeTypes: ['image/png', 'image/jpeg', 'image/webp']
    });

    if (bucketError && !bucketError.message.includes('already exists')) {
        console.error("Error creating bucket:", bucketError);
    } else {
        console.log("Bucket 'media' is ready.");
    }

    console.log("Please make sure a 'media' table exists with the following structure:");
    console.log(`
    CREATE TABLE media (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID REFERENCES auth.users(id),
      url TEXT NOT NULL,
      name TEXT,
      type TEXT CHECK (type IN ('upload', 'combined', 'generated')),
      prompt TEXT,
      favorite BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    ALTER TABLE media ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "Users can see their own media" ON media FOR SELECT USING (auth.uid() = user_id);
    CREATE POLICY "Users can insert their own media" ON media FOR INSERT WITH CHECK (auth.uid() = user_id);
  `);
}

run();
