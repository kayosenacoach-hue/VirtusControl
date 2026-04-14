import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Resposta rápida para o Preflight (CORS)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Cabeçalho de autorização em falta');

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    // Verifica quem é o utilizador que está a pedir o cancelamento
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) throw new Error('Não autorizado');

    const { subscriptionId } = await req.json();

    if (!subscriptionId) {
      throw new Error('O ID da assinatura é obrigatório');
    }

    // Como não usamos Stripe, atualizamos APENAS a base de dados local!
    // Marcamos para cancelar no fim do período (ou pode alterar para status: 'canceled' se quiser corte imediato)
    const { error: updateError } = await supabaseClient
      .from('subscriptions')
      .update({ cancel_at_period_end: true })
      .eq('id', subscriptionId)
      .eq('user_id', user.id); // Segurança: garante que só cancela se for o dono

    if (updateError) {
       console.error('Erro ao atualizar a base de dados:', updateError);
       throw updateError;
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error: any) {
    console.error('Erro ao cancelar assinatura:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});