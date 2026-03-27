import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

async function sendWhatsAppMessage(phone: string, message: string) {
  const uazapiUrl = Deno.env.get('UAZAPI_URL');
  const uazapiToken = Deno.env.get('UAZAPI_TOKEN');

  if (!uazapiUrl || !uazapiToken) {
    console.error('Credenciais Uazapi não configuradas');
    return false;
  }

  try {
    const baseUrl = uazapiUrl.replace(/\/$/, '');
    const response = await fetch(`${baseUrl}/message/sendText`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': uazapiToken
      },
      body: JSON.stringify({
        number: phone,
        options: { delay: 1200, presence: 'composing' },
        textMessage: { text: message }
      })
    });

    if (!response.ok) throw new Error(`Erro na API: ${response.status}`);
    return true;
  } catch (error) {
    console.error('Erro ao enviar WhatsApp:', error);
    return false;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { userName, userPhone, companyName } = body;

    if (!userName || !userPhone || !companyName) {
      return new Response(
        JSON.stringify({ error: 'Faltam dados obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const adminPhone = '5585981631652';

    const messageText = `🎉 *Novo Cliente Registrado!*\n\n` +
                        `*Nome:* ${userName}\n` +
                        `*Empresa:* ${companyName}\n` +
                        `*Telefone do Cliente:* ${userPhone}`;

    await sendWhatsAppMessage(adminPhone, messageText);

    return new Response(
      JSON.stringify({ success: true, message: "Webhook executado" }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});