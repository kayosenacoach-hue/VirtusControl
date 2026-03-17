import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function extractPhoneNumber(jid?: string): string {
  if (!jid) return '';
  return jid.replace(/@.*$/, '').replace(/\+/g, '').replace(/\s/g, '');
}

/**
 * Normalize Brazilian phone numbers for matching.
 * Brazilian mobile numbers should be: 55 + 2-digit DDD + 9 + 8 digits = 13 digits
 * Some systems omit the leading 9, giving 12 digits.
 * This function returns all possible variants for matching.
 */
function phoneVariants(phone: string): string[] {
  let digits = phone.replace(/\D/g, '');
  
  // Ensure starts with 55
  if (!digits.startsWith('55') && digits.length <= 11) {
    digits = '55' + digits;
  }
  
  const variants = [digits];
  
  // If 12 digits (55 + DDD + 8 digits) → add variant with 9
  if (digits.length === 12 && digits.startsWith('55')) {
    const ddd = digits.substring(2, 4);
    const number = digits.substring(4);
    variants.push(`55${ddd}9${number}`);
  }
  
  // If 13 digits (55 + DDD + 9 + 8 digits) → add variant without 9
  if (digits.length === 13 && digits.startsWith('55') && digits[4] === '9') {
    const ddd = digits.substring(2, 4);
    const number = digits.substring(5);
    variants.push(`55${ddd}${number}`);
  }
  
  return variants;
}

function normalizeMimeType(value?: string): string {
  const normalized = String(value || '').toLowerCase().trim();
  if (!normalized) return '';
  if (normalized.includes('/')) return normalized.split(';')[0].trim();
  if (normalized === 'image') return 'image/jpeg';
  if (normalized === 'document') return 'application/pdf';
  return '';
}

async function downloadFile(url: string): Promise<{ base64: string; mimeType: string }> {
  const response = await fetch(url);
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to download media: ${response.status} ${errorText.substring(0, 200)}`);
  }

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

type UazapiMediaMeta = {
  url?: string;
  mimeType?: string;
  messageType?: string;
  mediaKey?: string;
  fileSHA256?: string;
  fileEncSHA256?: string;
  fileLength?: number;
};

function findNestedString(obj: unknown, keys: string[]): string {
  if (!obj || typeof obj !== 'object') return '';

  const record = obj as Record<string, unknown>;
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) return value;
  }

  for (const value of Object.values(record)) {
    const nested = findNestedString(value, keys);
    if (nested) return nested;
  }

  return '';
}

function detectDownloadEndpoint(media?: UazapiMediaMeta): string {
  const type = `${media?.messageType || ''} ${media?.mimeType || ''}`.toLowerCase();
  if (type.includes('document') || type.includes('pdf') || type.includes('application/')) return 'downloaddocument';
  if (type.includes('video')) return 'downloadvideo';
  if (type.includes('audio') || type.includes('voice') || type.includes('ogg')) return 'downloadaudio';
  return 'downloadimage';
}

/**
 * Download media via Uazapi API (decrypted media).
 * Primary flow: /chat/download{type} with Url + MediaKey + hashes.
 */
async function downloadMediaViaUazapi(media: UazapiMediaMeta | null, messageId: string): Promise<{ base64: string; mimeType: string }> {
  const uazapiUrl = Deno.env.get('UAZAPI_URL');
  const uazapiToken = Deno.env.get('UAZAPI_TOKEN');

  if (!uazapiUrl || !uazapiToken) {
    throw new Error('Uazapi credentials not configured');
  }

  const baseUrl = uazapiUrl.replace(/\/$/, '');
  const endpointByType = detectDownloadEndpoint(media || undefined);

  const jsonHeaders = {
    'Token': uazapiToken,
    'token': uazapiToken,
    'Authorization': uazapiToken,
    'Content-Type': 'application/json',
  };

  const typedBody = {
    Url: media?.url || '',
    Mimetype: media?.mimeType || 'image/jpeg',
    MediaKey: media?.mediaKey || '',
    FileSHA256: media?.fileSHA256 || '',
    FileEncSHA256: media?.fileEncSHA256 || '',
    FileLength: media?.fileLength || 0,
  };

  const attempts: Array<{ method: 'POST' | 'GET'; endpoint: string; body?: Record<string, unknown> }> = [];

  // Official Uazapi endpoint (docs): POST /message/download
  // Uses message id and can return base64 and/or public link.
  if (messageId) {
    attempts.push(
      {
        method: 'POST',
        endpoint: `${baseUrl}/message/download`,
        body: {
          id: messageId,
          return_base64: true,
          return_link: false,
          download_quoted: false,
        },
      },
      {
        method: 'POST',
        endpoint: `${baseUrl}/message/download`,
        body: {
          id: messageId,
          return_base64: false,
          return_link: true,
          download_quoted: false,
        },
      },
    );
  }

  // Compatibility fallback with crypto payloads (Wuzapi-style variants)
  if (typedBody.Url && typedBody.MediaKey && typedBody.FileSHA256 && typedBody.FileEncSHA256 && typedBody.FileLength) {
    const paramsUpper = new URLSearchParams({
      Url: String(typedBody.Url),
      Mimetype: String(typedBody.Mimetype),
      MediaKey: String(typedBody.MediaKey),
      FileSHA256: String(typedBody.FileSHA256),
      FileEncSHA256: String(typedBody.FileEncSHA256),
      FileLength: String(typedBody.FileLength),
    });

    const paramsLower = new URLSearchParams({
      url: String(typedBody.Url),
      mimetype: String(typedBody.Mimetype),
      mediaKey: String(typedBody.MediaKey),
      fileSHA256: String(typedBody.FileSHA256),
      fileEncSHA256: String(typedBody.FileEncSHA256),
      fileLength: String(typedBody.FileLength),
    });

    attempts.push(
      { method: 'POST', endpoint: `${baseUrl}/chat/${endpointByType}`, body: typedBody },
      { method: 'GET', endpoint: `${baseUrl}/chat/${endpointByType}?${paramsUpper.toString()}` },
      { method: 'GET', endpoint: `${baseUrl}/chat/${endpointByType}?${paramsLower.toString()}` },
    );
  }

  // Legacy fallback attempts by message id
  attempts.push(
    { method: 'GET', endpoint: `${baseUrl}/chat/downloadMedia/${messageId}` },
    { method: 'GET', endpoint: `${baseUrl}/chat/downloadMedia?messageid=${messageId}` },
    { method: 'GET', endpoint: `${baseUrl}/chat/downloadMedia?messageId=${messageId}` },
    { method: 'GET', endpoint: `${baseUrl}/message/downloadMedia/${messageId}` },
    { method: 'GET', endpoint: `${baseUrl}/message/downloadMedia?messageid=${messageId}` },
    { method: 'GET', endpoint: `${baseUrl}/message/downloadMedia?messageId=${messageId}` },
  );

  let lastError = '';

  for (const attempt of attempts) {
    const response = await fetch(attempt.endpoint, {
      method: attempt.method,
      headers: attempt.method === 'POST' ? jsonHeaders : {
        'Token': uazapiToken,
        'token': uazapiToken,
        'Authorization': uazapiToken,
      },
      body: attempt.method === 'POST' ? JSON.stringify(attempt.body || {}) : undefined,
    });

    if (!response.ok) {
      const errorText = await response.text();
      lastError = `${response.status} ${errorText.substring(0, 200)}`;
      console.log('Uazapi media endpoint failed:', attempt.method, attempt.endpoint, lastError);
      continue;
    }

    const contentType = (response.headers.get('content-type') || '').toLowerCase();

    // Binary media response
    if (contentType.startsWith('image/') || contentType.includes('application/pdf') || contentType.includes('application/octet-stream')) {
      const arrayBuffer = await response.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      let binary = '';
      for (let i = 0; i < uint8Array.length; i++) {
        binary += String.fromCharCode(uint8Array[i]);
      }

      return {
        base64: btoa(binary),
        mimeType: media?.mimeType || contentType.split(';')[0] || 'image/jpeg',
      };
    }

    const responseText = await response.text();

    // JSON response with nested data/base64/url
    if (contentType.includes('application/json') || responseText.trim().startsWith('{')) {
      let data: any = null;
      try {
        data = JSON.parse(responseText);
      } catch {
        data = null;
      }

      if (data) {
        const base64Data = findNestedString(data, ['base64Data', 'base64', 'data', 'media', 'file', 'fileBase64', 'contentBase64']);
        const parsedMimeType = findNestedString(data, ['mimetype', 'mimeType', 'contentType', 'type']) || media?.mimeType || 'image/jpeg';

        if (base64Data) {
          return {
            base64: String(base64Data).replace(/^data:[^;]+;base64,/, ''),
            mimeType: parsedMimeType,
          };
        }

        const mediaUrl = findNestedString(data, ['fileURL', 'fileUrl', 'url', 'mediaUrl', 'downloadUrl']);
        if (mediaUrl) {
          return await downloadFile(mediaUrl);
        }
      }

      lastError = 'JSON sem base64/url de mídia';
      continue;
    }

    // Plain base64 text response
    const cleanText = responseText.trim();
    if (cleanText) {
      const parsedMime = media?.mimeType || response.headers.get('content-type') || 'image/jpeg';
      if (cleanText.startsWith('data:')) {
        return {
          base64: cleanText.replace(/^data:[^;]+;base64,/, ''),
          mimeType: parsedMime,
        };
      }

      if (!cleanText.startsWith('<!DOCTYPE') && !cleanText.startsWith('<html')) {
        return {
          base64: cleanText,
          mimeType: parsedMime,
        };
      }
    }

    lastError = 'Resposta sem mídia utilizável';
  }

  throw new Error(`Uazapi download failed on all endpoints: ${lastError}`);
}

async function analyzeDocument(imageBase64: string, mimeType: string): Promise<any> {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');

  const systemPrompt = `Você é um assistente especializado em extrair informações de comprovantes e notas fiscais brasileiras.
Analise a imagem e extraia as seguintes informações no formato JSON:
{
  "description": "descrição do gasto/serviço",
  "amount": valor numérico (ex: 150.50),
  "category": "categoria (operacional, pessoal, marketing, fornecedores, impostos, equipamentos, outros)",
  "date": "data no formato YYYY-MM-DD",
  "supplier": "nome do fornecedor/estabelecimento",
  "document_number": "número do documento/nota fiscal se disponível",
  "paymentMethod": "dinheiro | cartao_credito | cartao_debito | pix | boleto | transferencia"
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
            { type: 'image_url', image_url: { url: `data:${mimeType};base64,${imageBase64}` } },
            { type: 'text', text: 'Extraia as informações deste comprovante/nota fiscal.' },
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
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (jsonMatch) return JSON.parse(jsonMatch[0]);
  throw new Error('Could not parse AI response');
}

function parseTextExpense(text: unknown): any | null {
  if (typeof text !== 'string' || !text) return null;
  const patterns = [
    /^(.+?)\s+[Rr]\$?\s*(\d+[.,]\d{2})\s*$/,
    /^(.+?)\s+(\d+[.,]\d{2})\s*$/,
    /^(.+?)\s+(\d+)\s*$/,
  ];

  for (const pattern of patterns) {
    const match = text.trim().match(pattern);
    if (match) {
      const description = match[1].trim();
      const amountStr = match[2].replace(',', '.');
      const amount = parseFloat(amountStr);
      
      if (amount > 0 && description.length >= 2) {
        return {
          description,
          amount,
          category: guessCategory(description),
          date: new Date().toISOString().split('T')[0],
          supplier: description,
          document_number: null,
        };
      }
    }
  }
  return null;
}

function guessCategory(description: string): string {
  const lower = description.toLowerCase();
  const categories: Record<string, string[]> = {
    'operacional': ['luz', 'água', 'internet', 'aluguel', 'energia', 'telefone', 'celular', 'uber', 'taxi', '99', 'gasolina', 'combustível', 'estacionamento', 'pedágio', 'zona azul'],
    'pessoal': ['almoço', 'jantar', 'café', 'restaurante', 'lanche', 'comida', 'farmácia', 'mercado', 'supermercado'],
    'marketing': ['google ads', 'meta ads', 'facebook', 'instagram', 'publicidade', 'propaganda'],
    'fornecedores': ['material', 'insumo', 'fornecedor', 'mercadoria'],
    'impostos': ['imposto', 'taxa', 'iptu', 'ipva', 'darf', 'guia'],
    'equipamentos': ['notebook', 'computador', 'impressora', 'monitor', 'teclado', 'mouse'],
  };
  
  for (const [category, keywords] of Object.entries(categories)) {
    if (keywords.some(k => lower.includes(k))) return category;
  }
  return 'outros';
}

function isExtractionMeaningful(data: any): boolean {
  if (!data || typeof data !== 'object') return false;

  const amount = Number(data.amount);
  const hasAmount = Number.isFinite(amount) && amount > 0;
  const hasDescription = typeof data.description === 'string' && data.description.trim().length >= 4;
  const hasSupplier = typeof data.supplier === 'string' && data.supplier.trim().length >= 3;
  const hasDocument = typeof data.document_number === 'string' && data.document_number.trim().length >= 3;
  const hasDate = typeof data.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(data.date);

  return hasAmount || hasDescription || hasSupplier || hasDocument || hasDate;
}

async function sendUazapiMessage(phone: string, message: string): Promise<void> {
  const uazapiUrl = Deno.env.get('UAZAPI_URL');
  const uazapiToken = Deno.env.get('UAZAPI_TOKEN');
  
  if (!uazapiUrl || !uazapiToken) {
    console.error('Uazapi credentials not configured');
    return;
  }

  try {
    const baseUrl = uazapiUrl.replace(/\/$/, '');
    
    // Uazapi V2 documented endpoint: POST /send/text
    // Body: { number: "5511999999999", text: "message" }
    // Header: Token
    const response = await fetch(`${baseUrl}/send/text`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Token': uazapiToken,
      },
      body: JSON.stringify({
        number: phone,
        text: message,
      }),
    });
    
    if (response.ok) {
      console.log('Message sent successfully to:', phone);
    } else {
      const error = await response.text();
      console.error('Uazapi send error:', response.status, error);
    }
  } catch (error) {
    console.error('Error sending WhatsApp message:', error);
  }
}

/**
 * Parse the Uazapi webhook payload into a normalized message object.
 * Uazapi sends a specific format with `message` and `chat` objects.
 */
function parseUazapiPayload(body: any): {
  phone: string;
  messageId: string;
  fromMe: boolean;
  isGroup: boolean;
  textContent: string;
  imageUrl: string;
  documentUrl: string;
  mimeType: string;
  caption: string;
  messageType: string;
  thumbnailBase64: string;
  mediaMeta: UazapiMediaMeta | null;
} | null {
  
  // Format 1: Real Uazapi format (seen in production)
  // Has body.message.chatid, body.message.text, etc.
  if (body.message && body.message.chatid) {
    const msg = body.message;
    const phone = extractPhoneNumber(msg.sender_pn || msg.chatid);
    
    // Log all message keys to discover media fields
    console.log('Uazapi message keys:', Object.keys(msg).join(', '));
    console.log('Uazapi message type:', msg.messageType || msg.type || 'unknown');
    
    const content: any = (typeof msg.content === 'object' && msg.content !== null)
      ? msg.content
      : {};

    // Uazapi sends media URL + crypto metadata inside msg.content
    const contentUrl = content.URL || content.url || '';
    const mediaUrl = msg.mediaUrl || msg.imageUrl || msg.media || msg.file || msg.url || contentUrl || '';
    const contentMime = content.mimetype || content.mimeType || '';
    const mediaMeta: UazapiMediaMeta = {
      url: mediaUrl || (content.directPath ? `https://mmg.whatsapp.net${content.directPath}` : ''),
      mimeType: normalizeMimeType(contentMime || msg.mimetype || msg.mimeType || msg.mediaType || ''),
      messageType: String(msg.messageType || msg.type || ''),
      mediaKey: content.mediaKey || msg.mediaKey || '',
      fileSHA256: content.fileSHA256 || msg.fileSHA256 || '',
      fileEncSHA256: content.fileEncSHA256 || msg.fileEncSHA256 || '',
      fileLength: Number(content.fileLength || msg.fileLength || 0) || undefined,
    };

    const thumbnailBase64 = content.JPEGThumbnail || content.jpegThumbnail || content.thumbnail || '';
    const docUrl = msg.documentUrl || '';
    const isImageType = (msg.messageType || msg.type || '').toLowerCase().includes('image');
    const isDocType = (msg.messageType || msg.type || '').toLowerCase().includes('document');
    const isMediaType = isImageType || isDocType || (msg.messageType || msg.type || '').toLowerCase().includes('video') || (msg.messageType || msg.type || '').toLowerCase().includes('sticker');
    
    // If it's a media type but no URL found, log it for debugging
    if (isMediaType && !mediaUrl && !docUrl && !thumbnailBase64) {
      console.log('Media type detected but no URL found. Full message:', JSON.stringify(msg).substring(0, 2000));
    }
    
    return {
      phone,
      messageId: msg.messageid || msg.id || '',
      fromMe: msg.fromMe === true,
      isGroup: msg.isGroup === true,
      textContent: String(msg.text || msg.content || msg.caption || ''),
      imageUrl: mediaUrl,
      documentUrl: docUrl,
      mimeType: normalizeMimeType(msg.mimetype || msg.mimeType || contentMime || msg.mediaType || ''),
      caption: msg.caption || '',
      messageType: msg.messageType || msg.type || '',
      thumbnailBase64: String(thumbnailBase64 || ''),
      mediaMeta,
    };
  }
  
  // Format 2: Baileys/Evolution-style format
  if (body.data?.key) {
    const data = body.data;
    const key = data.key;
    const msg = data.message || {};
    
    return {
      phone: extractPhoneNumber(key.remoteJid),
      messageId: key.id || '',
      fromMe: key.fromMe || false,
      isGroup: key.remoteJid?.includes('@g.us') || false,
      textContent: msg.conversation || msg.extendedTextMessage?.text || '',
      imageUrl: msg.imageMessage?.mediaUrl || msg.imageMessage?.url || '',
      documentUrl: msg.documentMessage?.mediaUrl || msg.documentMessage?.url || '',
      mimeType: msg.imageMessage?.mimetype || msg.documentMessage?.mimetype || '',
      caption: msg.imageMessage?.caption || '',
      messageType: data.messageType || '',
      thumbnailBase64: '',
      mediaMeta: null,
    };
  }
  
  // Format 3: Flat format
  if (body.phone || body.remoteJid) {
    return {
      phone: body.phone || extractPhoneNumber(body.remoteJid),
      messageId: body.messageId || body.id || '',
      fromMe: body.fromMe || false,
      isGroup: body.isGroup || false,
      textContent: body.text || body.message || '',
      imageUrl: body.imageUrl || '',
      documentUrl: body.documentUrl || '',
      mimeType: body.mimeType || '',
      caption: body.caption || '',
      messageType: body.messageType || '',
      thumbnailBase64: '',
      mediaMeta: null,
    };
  }
  
  return null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    console.log('Uazapi webhook received:', JSON.stringify(body).substring(0, 500));

    const parsed = parseUazapiPayload(body);
    
    if (!parsed) {
      console.log('Unknown format or non-message event, ignoring');
      return new Response(JSON.stringify({ status: 'ignored' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { phone, messageId, fromMe, isGroup, textContent, imageUrl, documentUrl, mimeType, caption, messageType, thumbnailBase64, mediaMeta } = parsed;

    console.log('Parsed message:', { phone, messageId, fromMe, isGroup, hasText: !!textContent, hasMedia: !!(imageUrl || documentUrl) });

    // Ignore group messages, messages from us, or empty data
    if (isGroup || fromMe || !phone) {
      console.log('Ignoring:', { isGroup, fromMe, noPhone: !phone });
      return new Response(JSON.stringify({ status: 'ignored' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Connect to Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Identify user by whatsapp_number — try all phone variants
    const variants = phoneVariants(phone);
    console.log('Looking up phone variants:', variants);
    
    let userProfile = null;
    for (const variant of variants) {
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, whatsapp_number')
        .eq('whatsapp_number', variant)
        .maybeSingle();
      
      if (data) {
        userProfile = data;
        break;
      }
    }

    if (!userProfile) {
      console.log('Unregistered phone:', phone, 'variants tried:', variants);
      await sendUazapiMessage(phone,
        '❌ *Número não autorizado.*\n\nSeu número não está cadastrado no VirtusControl.\nAcesse o sistema e cadastre seu WhatsApp em *Config WhatsApp* para enviar despesas.'
      );
      return new Response(JSON.stringify({ status: 'unauthorized', phone }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userId = userProfile.id;
    console.log('User identified:', userId, userProfile.full_name);

    // Get user's entity
    const { data: entityAccess } = await supabase
      .from('user_entity_access')
      .select('entity_id')
      .eq('user_id', userId)
      .limit(1)
      .maybeSingle();

    const entityId = entityAccess?.entity_id || null;

    // Check for duplicate
    if (messageId) {
      const { data: existing } = await supabase
        .from('pending_whatsapp_expenses')
        .select('id')
        .contains('extracted_data', { messageId })
        .maybeSingle();
      
      if (existing) {
        console.log('Duplicate message ignored:', messageId);
        return new Response(JSON.stringify({ status: 'duplicate_ignored' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    const hasMedia = !!(imageUrl || documentUrl);
    const fileUrl = imageUrl || documentUrl || null;

    // CASE 1: Text message
    if (!hasMedia && textContent) {
      const expenseData = parseTextExpense(textContent);
      
      if (expenseData) {
        const { error: insertError } = await supabase
          .from('pending_whatsapp_expenses')
          .insert({
            phone: userProfile.whatsapp_number || phone,
            extracted_data: { ...expenseData, messageId, source: 'text', userId, entityId },
            file_url: null,
            processed_at: new Date().toISOString(),
          });

        if (insertError) console.error('Error saving:', insertError);

        const amount = `R$ ${Number(expenseData.amount).toFixed(2).replace('.', ',')}`;
        await sendUazapiMessage(phone,
          `✅ *Despesa registrada!*\n\n📝 *Descrição:* ${expenseData.description}\n💰 *Valor:* ${amount}\n📁 *Categoria:* ${expenseData.category}\n📅 *Data:* ${expenseData.date}\n\n_Acesse o VirtusControl para revisar._`
        );

        return new Response(JSON.stringify({ status: 'text_processed', data: expenseData }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } else {
        // Text without value pattern - just acknowledge, don't force format
        await sendUazapiMessage(phone,
          `📄 *VirtusControl*\n\nRecebemos sua mensagem! Para registrar uma despesa:\n• 📸 Envie uma *foto* do comprovante\n• ✏️ Ou digite: _Descrição Valor_ (ex: _Uber 23.50_)`
        );
        return new Response(JSON.stringify({ status: 'instructions_sent' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // CASE 2: Media message
    const lowerMessageType = String(messageType || '').toLowerCase();
    if (hasMedia || lowerMessageType.includes('image') || lowerMessageType.includes('document')) {
      await sendUazapiMessage(phone, '⏳ Processando seu comprovante...');

      try {
        // Prefer decrypted media from Uazapi API. Fallback to direct URL first, thumbnail last.
        let base64: string;
        let resolvedMimeType: string;
        let mediaSource: 'uazapi' | 'direct' | 'thumbnail' = 'uazapi';

        try {
          const mediaResult = await downloadMediaViaUazapi(mediaMeta, messageId);
          base64 = mediaResult.base64;
          resolvedMimeType = normalizeMimeType(mediaResult.mimeType) || normalizeMimeType(mimeType) || 'image/jpeg';
          mediaSource = 'uazapi';
          console.log('Media downloaded via Uazapi API, mime:', resolvedMimeType, 'size:', base64.length);
        } catch (uazapiError) {
          console.error('Uazapi download failed, trying fallbacks:', uazapiError);

          if (fileUrl) {
            const directResult = await downloadFile(fileUrl);
            base64 = directResult.base64;
            resolvedMimeType = normalizeMimeType(mimeType) || normalizeMimeType(directResult.mimeType) || 'image/jpeg';
            mediaSource = 'direct';
            console.log('Using direct URL fallback, mime:', resolvedMimeType, 'size:', base64.length);
          } else if (thumbnailBase64) {
            base64 = String(thumbnailBase64).replace(/^data:[^;]+;base64,/, '');
            resolvedMimeType = normalizeMimeType(mimeType) || 'image/jpeg';
            mediaSource = 'thumbnail';
            console.log('Using thumbnail fallback, size:', base64.length);
          } else {
            throw uazapiError;
          }
        }

        let extractedData = await analyzeDocument(base64, resolvedMimeType);

        // If extraction is empty and we used low-quality thumbnail, try direct URL once.
        if (!isExtractionMeaningful(extractedData) && mediaSource === 'thumbnail' && fileUrl) {
          console.log('Low-confidence extraction from thumbnail, retrying with direct URL');
          const directResult = await downloadFile(fileUrl);
          const directMimeType = normalizeMimeType(mimeType) || normalizeMimeType(directResult.mimeType) || 'image/jpeg';
          extractedData = await analyzeDocument(directResult.base64, directMimeType);
          mediaSource = 'direct';
        }

        if (!isExtractionMeaningful(extractedData)) {
          throw new Error('Low-confidence extraction: fields returned empty');
        }

        const { error: insertError } = await supabase
          .from('pending_whatsapp_expenses')
          .insert({
            phone: userProfile.whatsapp_number || phone,
            extracted_data: { ...extractedData, messageId, source: 'media', caption, userId, entityId },
            file_url: fileUrl,
            processed_at: new Date().toISOString(),
          });

        if (insertError) console.error('Error saving:', insertError);

        const amount = extractedData.amount
          ? `R$ ${Number(extractedData.amount).toFixed(2).replace('.', ',')}`
          : 'Não identificado';

        await sendUazapiMessage(phone,
          `✅ *Comprovante processado!*

📝 ${extractedData.description || '-'}
💰 ${amount}
📁 ${extractedData.category || 'Outros'}
📅 ${extractedData.date || '-'}
🏪 ${extractedData.supplier || '-'}

_Acesse o VirtusControl para revisar._`
        );

        return new Response(JSON.stringify({ status: 'processed', data: extractedData }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } catch (aiError) {
        console.error('Error processing media:', aiError);

        // Never drop the receipt: save it as pending for manual review.
        const fallbackData = {
          description: caption?.trim() || 'Comprovante recebido via WhatsApp',
          amount: null,
          category: 'outros',
          date: new Date().toISOString().split('T')[0],
          supplier: null,
          document_number: null,
          paymentMethod: null,
          messageId,
          source: 'media',
          caption,
          userId,
          entityId,
          extraction_failed: true,
          extraction_error: String(aiError).substring(0, 300),
        };

        const { error: fallbackInsertError } = await supabase
          .from('pending_whatsapp_expenses')
          .insert({
            phone: userProfile.whatsapp_number || phone,
            extracted_data: fallbackData,
            file_url: fileUrl,
            processed_at: new Date().toISOString(),
          });

        if (fallbackInsertError) {
          console.error('Error saving fallback pending expense:', fallbackInsertError);
          await sendUazapiMessage(phone, '❌ Recebi o comprovante, mas não consegui salvar no sistema agora. Tente novamente em instantes.');
          return new Response(JSON.stringify({ status: 'processing_error', error: String(aiError) }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        await sendUazapiMessage(phone,
          '⚠️ Recebi seu comprovante, mas não consegui extrair tudo automaticamente. Já deixei em *Pendentes* no VirtusControl para você revisar.'
        );

        return new Response(JSON.stringify({ status: 'queued_manual_review' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    return new Response(JSON.stringify({ status: 'no_action' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
