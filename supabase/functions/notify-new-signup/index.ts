import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Função para garantir que o número tenha apenas dígitos e comece com 55 (Brasil)
function formatPhoneBR(phone: string) {
  let cleaned = phone.replace(/\D/g, ''); // Remove tudo que não for número (parênteses, traços, espaços)
  
  // Se o número tiver 10 ou 11 dígitos (apenas DDD + Número), adiciona o 55 na frente
  if (cleaned.length === 10 || cleaned.length === 11) {
    cleaned = '55' + cleaned;
  }
  
  return cleaned;
}

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
    console.error(`Erro ao enviar WhatsApp para ${phone}:`, error);
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

    // 1. Formata o número do cliente (Adiciona o 55 automaticamente se faltar)
    const formattedClientPhone = formatPhoneBR(userPhone);
    const adminPhone = '558581631652';

    // 2. Prepara a mensagem do Admin
    const adminMessageText = `🎉 *Novo Cliente Registrado!*\n\n` +
                        `*Nome:* ${userName}\n` +
                        `*Empresa:* ${companyName}\n` +
                        `*Telefone do Cliente:* ${formattedClientPhone}`;

    // 3. Prepara a mensagem de Boas-Vindas para o Cliente
    const clientMessageText = `Olá, ${userName}! 🎉\n\n` +
                        `Sua conta no *VirtusControl* foi criada com sucesso para a empresa *${companyName}*.\n\n` +
                        `Seja muito bem-vindo(a)! Se precisar de ajuda para dar os primeiros passos, é só chamar.`;

    // 4. Envia as duas mensagens
    await sendWhatsAppMessage(adminPhone, adminMessageText);
    await sendWhatsAppMessage(formattedClientPhone, clientMessageText);

    return new Response(
      JSON.stringify({ success: true, message: "Mensagens enviadas com sucesso" }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});