import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    const body = await req.json();
    console.log('MP Webhook received:', JSON.stringify(body, null, 2));

    const { type, data } = body;

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (type === 'payment') {
      // Fetch payment details from Mercado Pago
      const paymentRes = await fetch(`https://api.mercadopago.com/v1/payments/${data.id}`, {
        headers: { 'Authorization': `Bearer ${MERCADOPAGO_ACCESS_TOKEN}` },
      });

      if (paymentRes.ok) {
        const payment = await paymentRes.json();
        console.log('Payment details:', payment.id, payment.status);

        // Find subscription by preapproval_id or metadata
        if (payment.metadata?.preapproval_id) {
          // Insert payment record
          await supabase.rpc('insert_payment_from_webhook', {
            _mercado_pago_payment_id: String(payment.id),
            _mercado_pago_subscription_id: payment.metadata.preapproval_id,
            _amount: payment.transaction_amount,
            _status: payment.status,
            _payment_date: payment.date_approved || new Date().toISOString(),
          });

          // Update subscription status based on payment
          if (payment.status === 'approved') {
            await supabase.rpc('upsert_subscription_from_webhook', {
              _mercado_pago_subscription_id: payment.metadata.preapproval_id,
              _status: 'active',
            });
          }
        }
      }
    } else if (type === 'subscription_preapproval') {
      // Fetch preapproval details
      const preapprovalRes = await fetch(`https://api.mercadopago.com/preapproval/${data.id}`, {
        headers: { 'Authorization': `Bearer ${MERCADOPAGO_ACCESS_TOKEN}` },
      });

      if (preapprovalRes.ok) {
        const preapproval = await preapprovalRes.json();
        console.log('Preapproval details:', preapproval.id, preapproval.status);

        let mappedStatus = 'pending';
        switch (preapproval.status) {
          case 'authorized': mappedStatus = 'active'; break;
          case 'paused': mappedStatus = 'pending'; break;
          case 'cancelled': mappedStatus = 'canceled'; break;
          default: mappedStatus = preapproval.status;
        }

        await supabase.rpc('upsert_subscription_from_webhook', {
          _mercado_pago_subscription_id: String(preapproval.id),
          _status: mappedStatus,
          _next_billing_date: preapproval.next_payment_date || null,
        });
      }
    }

    return new Response(JSON.stringify({ status: 'ok' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(JSON.stringify({ status: 'error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
