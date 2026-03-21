const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const axios = require("axios");
const fs = require("fs");
const crypto = require("crypto"); // <-- MOTOR DE CRIPTOGRAFIA ADICIONADO
const { createClient } = require("@supabase/supabase-js");

const app = express();

app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization']
}));

app.get("/", (req, res) => {
  res.status(200).send("API DO VIRTUSCONTROL ESTÁ ONLINE E O CORS ESTÁ ATIVO! 🚀");
});

app.use(bodyParser.json({ limit: '50mb' }));

const supabaseUrl = process.env.SUPABASE_URL || "https://zbnkitesgcvkqbidwqmj.supabase.co";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "chave_temporaria";
const supabase = createClient(supabaseUrl, supabaseKey);

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const UAZAPI_URL = process.env.UAZAPI_URL; 
const UAZAPI_API_KEY = process.env.UAZAPI_API_KEY;
const MERCADOPAGO_ACCESS_TOKEN = process.env.MERCADOPAGO_ACCESS_TOKEN;

// --- FUNÇÃO DE DESCRIPTOGRAFIA OFICIAL DO WHATSAPP ---
async function downloadAndDecryptMedia(url, mediaKeyBase64, mimetype) {
  try {
    const response = await axios.get(url, { responseType: 'arraybuffer' });
    const encryptedBuffer = Buffer.from(response.data);
    const mediaKey = Buffer.from(mediaKeyBase64, 'base64');
    
    let infoString = 'WhatsApp Image Keys';
    if (mimetype && (mimetype.includes('document') || mimetype.includes('pdf'))) {
      infoString = 'WhatsApp Document Keys';
    }
    
    const salt = Buffer.alloc(32); 
    const expanded = crypto.hkdfSync('sha256', mediaKey, salt, Buffer.from(infoString), 112);
    
    const iv = expanded.subarray(0, 16);
    const cipherKey = expanded.subarray(16, 48);
    const fileData = encryptedBuffer.subarray(0, encryptedBuffer.length - 10);
    
    const decipher = crypto.createDecipheriv('aes-256-cbc', cipherKey, iv);
    let decrypted = decipher.update(fileData);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    
    return decrypted.toString('base64');
  } catch (err) {
    console.error("❌ Erro na Criptografia Local:", err.message);
    return null;
  }
}

// --- FUNÇÕES DE INTELIGÊNCIA ARTIFICIAL (GEMINI) ---
async function extractDataWithGemini(base64Image, textoAdicional, isImage, customPrompt = null) {
  if (!GEMINI_API_KEY) {
    console.log("❌ ERRO FATAL: GEMINI_API_KEY não encontrada nas variáveis de ambiente!");
    return null;
  }
  const promptPadrao = `Atue como um assistente financeiro. Extraia as informações desta despesa num objeto JSON exato com estas chaves: "description" (string), "amount" (number), "category" (string), "supplier" (string), "date" (string, YYYY-MM-DD), "paymentMethod" (string), "personType" (string, "pj" ou "pf"), "notes" (string). Retorne APENAS o JSON válido. ${textoAdicional ? `Instrução extra: ${textoAdicional}` : ''}`;
  const prompt = customPrompt || promptPadrao;
  let parts = [{ text: prompt }];
  if (isImage && base64Image) parts.push({ inline_data: { mime_type: "image/jpeg", data: base64Image } });

  try {
    console.log("⏳ A enviar dados para a IA (Gemini)...");
    const response = await axios.post(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, { contents: [{ parts: parts }] });
    let textResponse = response.data.candidates[0].content.parts[0].text;
    textResponse = textResponse.replace(/```json/g, '').replace(/```/g, '').trim();
    console.log("✅ IA respondeu com sucesso!");
    return JSON.parse(textResponse);
  } catch(e) {
    console.error("❌ Erro Gemini:", e.response?.data || e.message);
    return null;
  }
}

// --- ROTA: WEBHOOK DO WHATSAPP ---
app.post("/webhook/whatsapp", async (req, res) => {
  console.log("\n=== NOVO WEBHOOK WHATSAPP RECEBIDO ===");
  const path = `./temp_${Date.now()}.jpg`;
  
  try {
    const data = req.body;
    
    // 1. A CAÇA AO NÚMERO
    let rawNumber = "";
    if (data.chat?.phone) rawNumber = data.chat.phone;
    else if (data.message?.chatid) rawNumber = data.message.chatid.split('@')[0];
    else if (data.chat?.wa_chatid) rawNumber = data.chat.wa_chatid.split('@')[0];
    else if (data.message?.sender_pn) rawNumber = data.message.sender_pn.split('@')[0];
    else if (data.data?.key?.remoteJid) rawNumber = data.data.key.remoteJid.split('@')[0];
    else if (data.messages?.[0]?.key?.remoteJid) rawNumber = data.messages[0].key.remoteJid.split('@')[0];

    const numero = String(rawNumber).replace(/\D/g, "");

    // 2. A CAÇA À MENSAGEM (E legendas de fotos)
    let mensagem = "";
    if (typeof data.text === "string") mensagem = data.text;
    else if (typeof data.message === "string") mensagem = data.message;
    else if (data.message?.conversation) mensagem = data.message.conversation;
    else if (data.message?.extendedTextMessage?.text) mensagem = data.message.extendedTextMessage.text;
    else if (data.message?.text) mensagem = data.message.text;
    else if (data.message?.caption) mensagem = data.message.caption; 
    else if (data.messages?.[0]?.message?.conversation) mensagem = data.messages[0].message.conversation;

    console.log(`Numero extraído: ${numero}`);
    console.log(`Mensagem/Legenda extraída: ${mensagem}`);

    if (!numero) {
      console.log("❌ ERRO: Não encontrei o número.");
      return res.sendStatus(200);
    }

    console.log(`Buscando utilizador com o número: ${numero}`);
    const { data: user, error: userError } = await supabase.from("profiles").select("*").eq("whatsapp_number", numero).single();
    
    if (userError || !user) {
      console.log("❌ ERRO: Número não encontrado na base de dados.");
      return res.sendStatus(200);
    }
    console.log(`✅ Utilizador encontrado: ${user.id}`);

    let aiResponse = null;
    const prompt = mensagem.trim().length > 0 ? mensagem : "Extraia os dados financeiros deste recibo/fatura. Se for impossível ler, avise.";

    // 3. A CAÇA À IMAGEM (Verifica se é Mídia Criptografada)
    let encryptedMedia = data.message?.content || data.content || null;
    let base64Image = data.base64 || data.message?.base64 || null;
    let mediaUrl = data.mediaUrl || data.imageUrl || null;

    if (encryptedMedia && encryptedMedia.URL && encryptedMedia.mediaKey) {
      console.log("📸 Imagem trancada detetada! A abrir a fechadura com criptografia...");
      
      let fetchedBase64 = await downloadAndDecryptMedia(
        encryptedMedia.URL, 
        encryptedMedia.mediaKey, 
        encryptedMedia.mimetype || 'image/jpeg'
      );
      
      if (fetchedBase64) {
        console.log("🔓 Imagem desbloqueada com sucesso! A enviar para a IA...");
        aiResponse = await extractDataWithGemini(fetchedBase64, prompt, true);
      } else {
         console.log("❌ ERRO: Falha ao desbloquear a imagem localmente.");
      }

    } else if (base64Image) {
      console.log("📸 Base64 direto encontrado!");
      const cleanBase64 = base64Image.replace(/^data:image\/\w+;base64,/, "");
      aiResponse = await extractDataWithGemini(cleanBase64, prompt, true);
    } else if (mediaUrl && mediaUrl !== "") {
      console.log("📸 Baixando imagem de URL público...");
      const response = await axios({ url: mediaUrl, method: "GET", responseType: "stream" });
      const writer = fs.createWriteStream(path);
      response.data.pipe(writer);
      await new Promise((resolve, reject) => { writer.on("finish", resolve); writer.on("error", reject); });
      const downloadedBase64 = fs.readFileSync(path, { encoding: 'base64' });
      aiResponse = await extractDataWithGemini(downloadedBase64, prompt, true);
    } else if (mensagem.trim().length > 0) {
      console.log("A enviar texto puro para o Gemini...");
      aiResponse = await extractDataWithGemini(null, mensagem, false);
    }

    // 4. GUARDAR NA BASE DE DADOS E NOTIFICAR
    if (aiResponse && aiResponse.amount) {
      console.log("💾 A guardar despesa no Supabase...");
      const { error: insertError } = await supabase.from("pending_whatsapp_expenses").insert({
        phone: numero,
        extracted_data: aiResponse,
        file_url: null 
      });
      
      if (!insertError) {
        console.log("✅ Despesa guardada no Supabase com sucesso!");
        if (UAZAPI_URL && UAZAPI_API_KEY) {
          try {
            const baseUrl = UAZAPI_URL.replace(/\/$/, ""); 
            const finalUrl = `${baseUrl}/send/text`;
            const msgFinal = `✅ Despesa Registada!\n💰 Valor: R$ ${aiResponse.amount.toFixed(2)}\n📝 ${aiResponse.description}`;

            await axios.post(finalUrl, {
              number: numero,
              text: msgFinal,
              textMessage: { text: msgFinal }
            }, { 
              headers: { 'token': UAZAPI_API_KEY, 'apikey': UAZAPI_API_KEY } 
            });
            console.log("✅ Confirmação enviada pro WhatsApp!");
          } catch(err) {
            console.log("⚠️ Falha ao enviar confirmação (UAZAPI):", err.message);
          }
        }
      } else {
         console.log("❌ ERRO NO SUPABASE:", insertError.message);
      }
    } else {
      console.log("❌ ERRO: A IA não encontrou valor ou falhou.");
    }
    
    res.sendStatus(200);
  } catch (error) {
    console.error("❌ ERRO FATAL NO WEBHOOK:", error);
    res.sendStatus(500);
  } finally {
    if (fs.existsSync(path)) fs.unlinkSync(path);
  }
});

// --- OUTRAS ROTAS (FRONTEND & MERCADO PAGO) ---
app.post("/analyze-document", async (req, res) => {
  const aiResponse = await extractDataWithGemini(req.body.imageBase64, "", true);
  if (aiResponse) res.json(aiResponse); else res.status(500).json({ error: "Falha na IA" });
});

app.post("/analyze-credit-card-statement", async (req, res) => {
  const promptFatura = `Extraia os dados desta fatura de cartão. Retorne um JSON exato com "cardInfo" e "transactions". Retorne APENAS JSON.`;
  const aiResponse = await extractDataWithGemini(req.body.imageBase64, "", true, promptFatura);
  if (aiResponse) res.json(aiResponse); else res.status(500).json({ error: "Falha na IA" });
});

app.post("/create-subscription", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No authorization header' });
    
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return res.status(401).json({ error: 'Not authenticated' });

    const { entityId, planName = 'pro', price = 39, cardTokenId } = req.body;
    if (!entityId || !cardTokenId) return res.status(400).json({ error: 'Faltam dados obrigatórios' });

    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + 7);

    const mpResponse = await axios.post('https://api.mercadopago.com/preapproval', {
      reason: `VirtusControl - Plano ${planName.charAt(0).toUpperCase() + planName.slice(1)}`,
      auto_recurring: {
        frequency: 1, frequency_type: 'months', transaction_amount: price, currency_id: 'BRL',
        free_trial: { frequency: 7, frequency_type: 'days' },
      },
      payer_email: user.email,
      card_token_id: cardTokenId,
      back_url: "https://virtuscontrol.com.br", 
      status: 'authorized',
    }, {
      headers: { 'Authorization': `Bearer ${MERCADOPAGO_ACCESS_TOKEN}` }
    });

    const mpData = mpResponse.data;

    const { error: insertError } = await supabase.from('subscriptions').insert({
      entity_id: entityId,
      user_id: user.id,
      mercado_pago_subscription_id: mpData.id,
      plan_name: planName,
      price: price,
      status: mpData.status === 'authorized' ? 'active' : 'pending',
      trial_end: trialEnd.toISOString(),
    });

    if (insertError) throw insertError;
    res.json({ subscription_id: mpData.id, status: mpData.status });
  } catch (error) {
    console.error('Erro ao criar assinatura:', error.response?.data || error.message);
    res.status(500).json({ error: error.message });
  }
});

app.post("/cancel-subscription", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No authorization header' });
    const { subscriptionId, mercadoPagoSubscriptionId } = req.body;

    if (mercadoPagoSubscriptionId) {
      await axios.put(`https://api.mercadopago.com/preapproval/${mercadoPagoSubscriptionId}`, 
        { status: "cancelled" },
        { headers: { 'Authorization': `Bearer ${MERCADOPAGO_ACCESS_TOKEN}` } }
      );
    }

    await supabase.from('subscriptions').update({ status: 'cancelled' }).eq('id', subscriptionId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/webhook/mercadopago", async (req, res) => {
  try {
    const { type, data } = req.body;
    if (type === 'payment') {
      const paymentRes = await axios.get(`https://api.mercadopago.com/v1/payments/${data.id}`, { headers: { 'Authorization': `Bearer ${MERCADOPAGO_ACCESS_TOKEN}` } });
      const payment = paymentRes.data;
      if (payment.metadata?.preapproval_id) {
        await supabase.rpc('insert_payment_from_webhook', {
          _mercado_pago_payment_id: String(payment.id),
          _mercado_pago_subscription_id: payment.metadata.preapproval_id,
          _amount: payment.transaction_amount,
          _status: payment.status,
          _payment_date: payment.date_approved || new Date().toISOString(),
        });
        if (payment.status === 'approved') {
          await supabase.rpc('upsert_subscription_from_webhook', { _mercado_pago_subscription_id: payment.metadata.preapproval_id, _status: 'active' });
        }
      }
    } else if (type === 'subscription_preapproval') {
      const preapprovalRes = await axios.get(`https://api.mercadopago.com/preapproval/${data.id}`, { headers: { 'Authorization': `Bearer ${MERCADOPAGO_ACCESS_TOKEN}` } });
      const preapproval = preapprovalRes.data;
      let mappedStatus = 'pending';
      if(preapproval.status === 'authorized') mappedStatus = 'active';
      else if(preapproval.status === 'paused') mappedStatus = 'pending';
      else if(preapproval.status === 'cancelled') mappedStatus = 'canceled';
      await supabase.rpc('upsert_subscription_from_webhook', {
        _mercado_pago_subscription_id: String(preapproval.id),
        _status: mappedStatus,
        _next_billing_date: preapproval.next_payment_date || null,
      });
    }
    res.status(200).send("OK");
  } catch (error) {
    console.error('Erro no Webhook do MP:', error.message);
    res.status(500).send("Error");
  }
});

const PORT = process.env.PORT || 80;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));