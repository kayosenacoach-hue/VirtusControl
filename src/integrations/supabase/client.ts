import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://zbnkitesgcvkqbidwqmj.supabase.co"; 
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpibmtpdGVzZ2N2a3FiaWR3cW1qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0Njc0MTEsImV4cCI6MjA4ODA0MzQxMX0.iPdQkzS6jv1QxgoTl53O6rwO6GlWwNtoMjvbUIa-Zys";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});