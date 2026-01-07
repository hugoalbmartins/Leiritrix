import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

console.log('Supabase initialization:', {
  url: supabaseUrl ? 'Configured' : 'Missing',
  key: supabaseAnonKey ? 'Configured' : 'Missing',
  mode: import.meta.env.MODE
});

if (!supabaseUrl || !supabaseAnonKey) {
  const errorMsg = `
    ❌ ERRO DE CONFIGURAÇÃO - Variáveis de ambiente Supabase não encontradas!

    As seguintes variáveis são obrigatórias:
    - VITE_SUPABASE_URL: ${supabaseUrl ? '✓ Configurada' : '✗ Não encontrada'}
    - VITE_SUPABASE_ANON_KEY: ${supabaseAnonKey ? '✓ Configurada' : '✗ Não encontrada'}

    ${typeof window !== 'undefined' ? 'Se está a executar no Vercel, certifique-se de que adicionou as variáveis de ambiente no dashboard e fez redeploy.' : ''}
  `;
  console.error(errorMsg);
  throw new Error('Configuração Supabase incompleta. Verifique as variáveis de ambiente.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});
