import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://placeholder.supabase.co";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "placeholder-anon-key";
const hasSupabaseConfig = Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY);

console.log('[supabaseClient] VITE_SUPABASE_URL =', import.meta.env.VITE_SUPABASE_URL ? 'present' : 'missing');
console.log('[supabaseClient] VITE_SUPABASE_ANON_KEY =', import.meta.env.VITE_SUPABASE_ANON_KEY ? 'present' : 'missing');

if (!hasSupabaseConfig) {
  console.warn('[supabaseClient] Missing Supabase env vars. The app will run in a limited offline mode until env vars are configured in Vercel.');
}

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});

export default supabase;
