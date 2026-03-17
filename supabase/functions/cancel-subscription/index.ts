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

    const { subscriptionId, mercadoPagoSubscriptionId, isAdmin = false } = await req.json();

    if (!subscriptionId) {
      throw new Error('subscriptionId is required');
    }

    // If not admin, verify user owns the subscription
    if (!isAdmin) {
      const { data: sub } = await supabase
        .from('subscriptions')
        .select('user_id')
        .eq('id', subscriptionId)
        .maybeSingle();

      if (!sub || sub.user_id !== user.id) {
        throw new Error('Unauthorized: you do not own this subscription');
      }
    } else {
      // Verify caller is actually admin using service role
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

      const { data: roleData } = await supabaseAdmin
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle();

      if (!roleData) {
        throw new Error('Unauthorized: admin role required');
      }
    }

    // Cancel on Mercado Pago if we have an MP subscription ID
    if (mercadoPagoSubscriptionId) {
      const mpResponse = await fetch(
        `https://api.mercadopago.com/preapproval/${mercadoPagoSubscriptionId}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${MERCADOPAGO_ACCESS_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ status: 'cancelled' }),
        }
      );

      if (!mpResponse.ok) {
        const errorText = await mpResponse.text();
        console.error('MP cancel error:', errorText);
        // Continue even if MP fails - we still update our DB
      } else {
        console.log('MP subscription cancelled:', mercadoPagoSubscriptionId);
      }
    }

    // Update subscription status in database
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAdminClient = createClient(supabaseUrl, supabaseServiceKey);

    const { error: updateError } = await supabaseAdminClient
      .from('subscriptions')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('id', subscriptionId);

    if (updateError) {
      console.error('Update error:', updateError);
      throw new Error('Failed to update subscription status');
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Subscription cancelled successfully',
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
