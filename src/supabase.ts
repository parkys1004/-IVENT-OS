import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    'Supabase environment variables are missing!\n' +
    'Please add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in the Settings > Secrets menu.'
  );
}

// Ensure the app doesn't crash on boot by providing fallback strings if keys are missing
// The actual queries will fail later with clear error messages
export const supabase = createClient(
  supabaseUrl || 'https://placeholder-url.supabase.co',
  supabaseAnonKey || 'placeholder-key'
);
