import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://gcslxfqgsvdrhvwrmszt.supabase.co';
const supabaseAnonKey = 'sb_publishable_3Ae_1OOc7jzelRWsoUWSPQ_RFg2G78q';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    'Erro Crítico: As variáveis VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY não foram configuradas no arquivo .env!'
  );
}

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey
);