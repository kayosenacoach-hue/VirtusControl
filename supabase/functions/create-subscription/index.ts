import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const MERCADOPAGO_ACCESS_TOKEN = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN');
    if (!MERCADOPAGO_ACCESS_TOKEN) {
      throw new Error('MERCADOPAGO_ACCESS_TOKEN not configured');
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('Not authenticated');
    }

    const { entityId, planName = 'pro', price = 39, cardTokenId } = await req.json();

    if (!entityId) {
      throw new Error('entityId is required');
    }

    if (!cardTokenId) {
      throw new Error('cardTokenId is required for transparent checkout');
    }

    const email = user.email;

    // Create preapproval (subscription) with card_token_id for transparent checkout
    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + 7);

    const mpBody: Record<string, unknown> = {
      reason: `VirtusControl - Plano ${planName.charAt(0).toUpperCase() + planName.slice(1)}`,
      auto_recurring: {
        frequency: 1,
        frequency_type: 'months',
        transaction_amount: price,
        currency_id: 'BRL',
        free_trial: {
          frequency: 7,
          frequency_type: 'days',
        },
      },
      payer_email: email,
      card_token_id: cardTokenId,
      back_url: `${req.headers.get('origin') || 'https://vision-expense-track.lovable.app'}/`,
      status: 'authorized',
    };

    const mpResponse = await fetch('https://api.mercadopago.com/preapproval', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MERCADOPAGO_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(mpBody),
    });

    if (!mpResponse.ok) {
      const errorText = await mpResponse.text();
      console.error('Mercado Pago error:', errorText);
      throw new Error(`Mercado Pago API error: ${mpResponse.status} - ${errorText}`);
    }

    const mpData = await mpResponse.json();
    console.log('MP Subscription created:', mpData.id, 'status:', mpData.status);

    // Save subscription in database using service role
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const { error: insertError } = await supabaseAdmin
      .from('subscriptions')
      .insert({
        entity_id: entityId,
        user_id: user.id,
        mercado_pago_subscription_id: mpData.id,
        plan_name: planName,
        price: price,
        status: mpData.status === 'authorized' ? 'active' : 'pending',
        trial_end: trialEnd.toISOString(),
      });

    if (insertError) {
      console.error('Insert error:', insertError);
      throw new Error('Failed to save subscription');
    }

    return new Response(JSON.stringify({
      subscription_id: mpData.id,
      status: mpData.status,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
