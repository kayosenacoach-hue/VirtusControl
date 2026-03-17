import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function sendWhatsAppMessage(phone: string, message: string) {
  const uazapiUrl = Deno.env.get('UAZAPI_URL');
  const uazapiToken = Deno.env.get('UAZAPI_TOKEN');

  if (!uazapiUrl || !uazapiToken) {
    console.error('Uazapi credentials not configured');
    return false;
  }

  try {
    const baseUrl = uazapiUrl.replace(/\/$/, '');
    const response = await fetch(`${baseUrl}/send/text`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Token': uazapiToken,
      },
      body: JSON.stringify({ number: phone, text: message }),
    });

    if (response.ok) {
      console.log('WhatsApp message sent to:', phone);
      return true;
    } else {
      const error = await response.text();
      console.error('Uazapi send error:', response.status, error);
      return false;
    }
  } catch (error) {
    console.error('Error sending WhatsApp message:', error);
    return false;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userName, userPhone, companyName } = await req.json();

    if (!userName || !userPhone || !companyName) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: userName, userPhone, companyName' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Normalize phone number
    let normalizedPhone = userPhone.replace(/\D/g, '');
    if (!normalizedPhone.startsWith('55') && normalizedPhone.length <= 11) {
      normalizedPhone = '55' + normalizedPhone;
    }

    // 1. Send welcome message to the new user
    const welcomeMessage = `🎉 *Bem-vindo ao VirtusControl!*

Olá, ${userName}! Sua conta foi criada com sucesso para a empresa *${companyName}*.

Sou o assistente financeiro da *VirtusControl* e estou aqui para te ajudar a organizar suas finanças de forma simples e eficiente.

📸 *Como funciona:*
• Envie fotos de comprovantes e notas fiscais aqui no WhatsApp
• Eu extraio automaticamente os dados (valor, data, descrição)
• Você revisa e aprova tudo pelo painel do VirtusControl

💡 *Dica:* Tire fotos nítidas e bem iluminadas dos comprovantes para uma leitura mais precisa.

Estou pronto para começar! Quando quiser, é só enviar seu primeiro comprovante. 🚀`;

    await sendWhatsAppMessage(normalizedPhone, welcomeMessage);

    // 2. Notify all admin/owner users
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Find admins with WhatsApp numbers
    const { data: admins, error: adminError } = await supabase
      .from('profiles')
      .select('full_name, whatsapp_number, role')
      .in('role', ['admin', 'owner'])
      .not('whatsapp_number', 'is', null);

    if (adminError) {
      console.error('Error fetching admins:', adminError);
    }

    if (admins && admins.length > 0) {
      const adminMessage = `🔔 *Novo cadastro no VirtusControl!*

📋 *Dados do cliente:*
• Nome: ${userName}
• Empresa: ${companyName}
• WhatsApp: ${userPhone}

O cliente já recebeu a mensagem de boas-vindas e está pronto para usar o sistema.`;

      // Send to all admins (but not to the user themselves)
      for (const admin of admins) {
        if (admin.whatsapp_number) {
          let adminPhone = admin.whatsapp_number.replace(/\D/g, '');
          if (!adminPhone.startsWith('55') && adminPhone.length <= 11) {
            adminPhone = '55' + adminPhone;
          }
          // Don't notify the user themselves if they're also an admin
          if (adminPhone !== normalizedPhone) {
            await sendWhatsAppMessage(adminPhone, adminMessage);
          }
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in notify-new-signup:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
