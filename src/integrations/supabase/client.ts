import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://zbnkitesgcvkqbidwqmj.supabase.co";

const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 
                        import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 
                        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpibmtpdGVzZ2N2a3FiaWR3cW1qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0Njc0MTEsImV4cCI6MjA4ODA0MzQxMX0.iPdQkzS6jv1QxgoTl53O6rwO6GlWwNtoMjvbUIa-Zys";

console.log("🔌 Iniciando conexão com Supabase...");

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});