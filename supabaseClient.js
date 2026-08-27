import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

console.log('[supabaseClient] VITE_SUPABASE_URL =', supabaseUrl);
console.log('[supabaseClient] VITE_SUPABASE_ANON_KEY =', supabaseAnonKey ? 'present' : 'missing');

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default supabase;
