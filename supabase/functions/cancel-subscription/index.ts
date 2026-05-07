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

    // 1. Buscar o ID da assinatura do Mercado Pago na base de dados
    const { data: subscription, error: fetchError } = await supabaseClient
      .from('subscriptions')
      .select('mercado_pago_subscription_id')
      .eq('id', subscriptionId)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !subscription) {
      throw new Error('Assinatura não encontrada ou sem permissão');
    }

    const mpSubscriptionId = subscription.mercado_pago_subscription_id;

    // 2. Comunicar com o Mercado Pago para cancelar a cobrança na operadora
    if (mpSubscriptionId) {
      const mpToken = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN');
      if (!mpToken) throw new Error('Token do Mercado Pago não configurado no servidor');

      // A API de assinaturas do MP usa o endpoint /preapproval/
      const mpResponse = await fetch(`https://api.mercadopago.com/preapproval/${mpSubscriptionId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${mpToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: 'cancelled' })
      });

      if (!mpResponse.ok) {
        const errorData = await mpResponse.json();
        console.error('Erro retornado pelo Mercado Pago:', errorData);
        throw new Error('Não foi possível cancelar a assinatura na operadora de pagamento.');
      }
    }

    // 3. Atualizar a base de dados local confirmando o cancelamento
    const { error: updateError } = await supabaseClient
      .from('subscriptions')
      .update({ 
        cancel_at_period_end: true,
        status: 'canceled' // Atualiza o status localmente para refletir o cancelamento
      })
      .eq('id', subscriptionId)
      .eq('user_id', user.id); 

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