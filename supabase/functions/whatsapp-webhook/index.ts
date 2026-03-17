import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ZAPIMessage {
  phone: string;
  messageId: string;
  text?: { message: string };
  image?: { imageUrl: string; caption?: string; mimeType: string };
  document?: { documentUrl: string; fileName: string; mimeType: string };
  isGroup: boolean;
  fromMe: boolean;
}

async function downloadFile(url: string): Promise<{ base64: string; mimeType: string }> {
  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer();
  const uint8Array = new Uint8Array(arrayBuffer);
  
  let binary = '';
  for (let i = 0; i < uint8Array.length; i++) {
    binary += String.fromCharCode(uint8Array[i]);
  }
  const base64 = btoa(binary);
  
  const contentType = response.headers.get('content-type') || 'application/octet-stream';
  
  return { base64, mimeType: contentType };
}

async function analyzeDocument(imageBase64: string, mimeType: string): Promise<any> {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  
  if (!LOVABLE_API_KEY) {
    throw new Error('LOVABLE_API_KEY not configured');
  }

  const systemPrompt = `Você é um assistente especializado em extrair informações de comprovantes e notas fiscais brasileiras.
Analise a imagem e extraia as seguintes informações no formato JSON:
{
  "description": "descrição do gasto/serviço",
  "amount": valor numérico (ex: 150.50),
  "category": "categoria (Alimentação, Transporte, Hospedagem, Material de Escritório, Tecnologia, Marketing, Serviços, Utilities, Saúde, Educação, Outros)",
  "date": "data no formato YYYY-MM-DD",
  "supplier": "nome do fornecedor/estabelecimento",
  "document_number": "número do documento/nota fiscal se disponível"
}

Se não conseguir identificar algum campo, use null.
Responda APENAS com o JSON, sem texto adicional.`;

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: {
                url: `data:${mimeType};base64,${imageBase64}`,
              },
            },
            {
              type: 'text',
              text: 'Extraia as informações deste comprovante/nota fiscal.',
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('AI API error:', errorText);
    throw new Error(`AI API error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || '';
  
  // Parse JSON from response
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    return JSON.parse(jsonMatch[0]);
  }
  
  throw new Error('Could not parse AI response');
}

async function sendWhatsAppMessage(phone: string, message: string): Promise<void> {
  const instanceId = Deno.env.get('ZAPI_INSTANCE_ID');
  const token = Deno.env.get('ZAPI_TOKEN');
  const clientToken = Deno.env.get('ZAPI_CLIENT_TOKEN');
  
  if (!instanceId || !token) {
    console.error('Z-API credentials not configured');
    return;
  }

  try {
    const headers: Record<string, string> = { 
      'Content-Type': 'application/json' 
    };
    
    // Add client-token if configured
    if (clientToken) {
      headers['Client-Token'] = clientToken;
    }

    const response = await fetch(
      `https://api.z-api.io/instances/${instanceId}/token/${token}/send-text`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({
          phone: phone,
          message: message,
        }),
      }
    );
    
    if (!response.ok) {
      const error = await response.text();
      console.error('Z-API send error:', error);
    }
  } catch (error) {
    console.error('Error sending WhatsApp message:', error);
  }
}

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    
    console.log('Received webhook:', JSON.stringify(body, null, 2));
    
    // Z-API sends different event types
    // ReceivedCallback = new message received (we want these!)
    // MessageStatusCallback = delivery/read status (ignore)
    // notification types like PROFILE_NAME_UPDATED (ignore)
    
    // Skip if it's a notification (not a message)
    if (body.notification) {
      console.log('Ignoring notification:', body.notification);
      return new Response(JSON.stringify({ status: 'ignored_notification' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Skip status updates (ack = delivery status)
    if (body.ack !== undefined && !body.image && !body.document && !body.text) {
      console.log('Ignoring status update');
      return new Response(JSON.stringify({ status: 'ignored_status' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    const message = body as ZAPIMessage;
    
    // Ignore messages from groups or sent by us
    if (message.isGroup || message.fromMe) {
      return new Response(JSON.stringify({ status: 'ignored' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Check if messageId already processed (avoid duplicates)
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Check for duplicate by messageId in recent entries (last 24h)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: existingMessages } = await supabase
      .from('pending_whatsapp_expenses')
      .select('id')
      .gte('created_at', oneDayAgo)
      .limit(100);
    
    // We'll use messageId in extracted_data to track duplicates
    if (message.messageId) {
      const { data: duplicate } = await supabase
        .from('pending_whatsapp_expenses')
        .select('id')
        .contains('extracted_data', { messageId: message.messageId })
        .maybeSingle();
      
      if (duplicate) {
        console.log('Duplicate message ignored:', message.messageId);
        return new Response(JSON.stringify({ status: 'duplicate_ignored' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    const phone = message.phone;
    let fileUrl: string | null = null;
    let mimeType = 'image/jpeg';

    // Check for image or document
    if (message.image?.imageUrl) {
      fileUrl = message.image.imageUrl;
      mimeType = message.image.mimeType || 'image/jpeg';
    } else if (message.document?.documentUrl) {
      fileUrl = message.document.documentUrl;
      mimeType = message.document.mimeType || 'application/pdf';
    }

    if (!fileUrl) {
      // If just text, send instructions
      await sendWhatsAppMessage(
        phone,
        '📄 *Vision Expenses*\n\nEnvie uma foto do comprovante ou nota fiscal que irei processar automaticamente e cadastrar como despesa!'
      );
      
      return new Response(JSON.stringify({ status: 'instructions_sent' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Send processing message
    await sendWhatsAppMessage(phone, '⏳ Processando seu comprovante...');

    // Download and analyze the file
    const { base64, mimeType: detectedMimeType } = await downloadFile(fileUrl);
    const extractedData = await analyzeDocument(base64, detectedMimeType);

    console.log('Extracted data:', extractedData);

    // Format response message
    const amount = extractedData.amount 
      ? `R$ ${Number(extractedData.amount).toFixed(2).replace('.', ',')}`
      : 'Não identificado';
    
    const responseMessage = `✅ *Comprovante processado!*

📝 *Descrição:* ${extractedData.description || 'Não identificado'}
💰 *Valor:* ${amount}
📁 *Categoria:* ${extractedData.category || 'Outros'}
📅 *Data:* ${extractedData.date || 'Não identificada'}
🏪 *Fornecedor:* ${extractedData.supplier || 'Não identificado'}

_Acesse o sistema Vision Expenses para revisar e salvar esta despesa._`;

    await sendWhatsAppMessage(phone, responseMessage);

    // Store in pending_expenses table with messageId to prevent duplicates
    const { error: insertError } = await supabase
      .from('pending_whatsapp_expenses')
      .insert({
        phone: phone,
        extracted_data: { ...extractedData, messageId: message.messageId },
        file_url: fileUrl,
        processed_at: new Date().toISOString(),
      });

    if (insertError) {
      console.error('Error saving pending expense:', insertError);
    }

    return new Response(JSON.stringify({ 
      status: 'processed',
      data: extractedData 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Webhook error:', error);
    
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
