import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export const supabasePersonel = createClient(supabaseUrl, supabaseKey, {
    auth: {
        storageKey: 'personel-session',
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
    },
})
