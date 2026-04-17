import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export const supabasePatron = createClient(supabaseUrl, supabaseKey, {
    auth: {
        storageKey: 'patron-session',
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
    },
})
