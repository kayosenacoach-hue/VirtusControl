import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://zbnkitesgcvkqbidwqmj.supabase.co"; 
const SUPABASE_KEY = "sb_publishable_pgrZbNzKYPEWKRTEjFlHZQ_XGFb3s5Z";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});