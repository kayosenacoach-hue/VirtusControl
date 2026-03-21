const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const axios = require("axios");
const fs = require("fs");
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
// ------------------------------------------------

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const UAZAPI_URL = process.env.UAZAPI_URL; 
const UAZAPI_API_KEY = process.env.UAZAPI_API_KEY;
const MERCADOPAGO_ACCESS_TOKEN = process.env.MERCADOPAGO_ACCESS_TOKEN;

// --- FUNÇÕES DE INTELIGÊNCIA ARTIFICIAL (GEMINI) ---
async function extractDataWithGemini(base64Image, textoAdicional, isImage, customPrompt = null) {
  if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY não configurada no servidor.");
  const promptPadrao = `Atue como um assistente financeiro. Extraia as informações desta despesa num objeto JSON exato com estas chaves: "description" (string), "amount" (number), "category" (string), "supplier" (string), "date" (string, YYYY-MM-DD), "paymentMethod" (string), "personType" (string, "pj" ou "pf"), "notes" (string). Retorne APENAS o JSON válido. ${textoAdicional ? `Instrução extra: ${textoAdicional}` : ''}`;
  const prompt = customPrompt || promptPadrao;
  let parts = [{ text: prompt }];
  if (isImage && base64Image) parts.push({ inline_data: { mime_type: "image/jpeg", data: base64Image } });

  try {
    const response = await axios.post(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, { contents: [{ parts: parts }] });
    let textResponse = response.data.candidates[0].content.parts[0].text;
    textResponse = textResponse.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(textResponse);
  } catch(e) {
    console.error("Erro Gemini:", e.response?.data || e.message);
    return null;
  }
}

// --- ROTA: WEBHOOK DO WHATSAPP ---
app.post("/webhook/whatsapp", async (req, res) => {
  const path = `./temp_${Date.now()}.jpg`;
  try {
    const data = req.body;
    const numero = data.from || data.phone || data.remoteJid?.replace(/\D/g, "") || data.data?.remoteJid?.replace(/\D/g, "");
    const mensagem = data.text || data.message || data.data?.message?.conversation || "";
    const mediaUrl = data.mediaUrl || data.imageUrl || data.documentUrl || data.data?.message?.imageMessage?.url || null;

    if (!numero) return res.sendStatus(200);

    const { data: user } = await supabase.from("profiles").select("*").eq("whatsapp_number", numero).single();
    if (!user) return res.sendStatus(200);

    const { data: access } = await supabase.from("user_entity_access").select("entity_id").eq("user_id", user.id).single();
    if (!access) return res.sendStatus(200);

    let aiResponse = null;
    if (mediaUrl) {
      const response = await axios({ url: mediaUrl, method: "GET", responseType: "stream" });
      const writer = fs.createWriteStream(path);
      response.data.pipe(writer);
      await new Promise((resolve, reject) => { writer.on("finish", resolve); writer.on("error", reject); });
      const base64Image = fs.readFileSync(path, { encoding: 'base64' });
      aiResponse = await extractDataWithGemini(base64Image, mensagem, true);
    } else if (mensagem.trim().length > 0) {
      aiResponse = await extractDataWithGemini(null, mensagem, false);
    }

    if (aiResponse && aiResponse.amount) {
      await supabase.from("pending_whatsapp_expenses").insert({
        entity_id: access.entity_id, user_id: user.id, extracted_data: aiResponse, media_url: mediaUrl, processed: false
      });
      if(UAZAPI_URL && UAZAPI_API_KEY) {
        await axios.post(`${UAZAPI_URL}/message/sendText`, { number: numero, text: `✅ Despesa Registada!\n💰 Valor: R$ ${aiResponse.amount.toFixed(2)}\n📝 ${aiResponse.description}` }, { headers: { 'apikey': UAZAPI_API_KEY } });
      }
    }
    res.sendStatus(200);
  } catch (error) {
    res.sendStatus(500);
  } finally {
    if (fs.existsSync(path)) fs.unlinkSync(path);
  }
});

app.post("/analyze-document", async (req, res) => {
  const aiResponse = await extractDataWithGemini(req.body.imageBase64, "", true);
  if (aiResponse) res.json(aiResponse); else res.status(500).json({ error: "Falha na IA" });
});

app.post("/analyze-credit-card-statement", async (req, res) => {
  const promptFatura = `Extraia os dados desta fatura de cartão. Retorne um JSON exato com "cardInfo" e "transactions". Retorne APENAS JSON.`;
  const aiResponse = await extractDataWithGemini(req.body.imageBase64, "", true, promptFatura);
  if (aiResponse) res.json(aiResponse); else res.status(500).json({ error: "Falha na IA" });
});

// ==========================================================
// --- NOVAS ROTAS DE PAGAMENTO (MERCADO PAGO) ---
// ==========================================================

// 1. CRIAR ASSINATURA
app.post("/create-subscription", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No authorization header' });
    
    // Obter utilizador usando o token JWT do frontend
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return res.status(401).json({ error: 'Not authenticated' });

    const { entityId, planName = 'pro', price = 39, cardTokenId } = req.body;
    if (!entityId || !cardTokenId) return res.status(400).json({ error: 'Faltam dados obrigatórios' });

    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + 7);

    // Enviar requisição para o Mercado Pago
    const mpResponse = await axios.post('https://api.mercadopago.com/preapproval', {
      reason: `VirtusControl - Plano ${planName.charAt(0).toUpperCase() + planName.slice(1)}`,
      auto_recurring: {
        frequency: 1, frequency_type: 'months', transaction_amount: price, currency_id: 'BRL',
        free_trial: { frequency: 7, frequency_type: 'days' },
      },
      payer_email: user.email,
      card_token_id: cardTokenId,
      back_url: "https://virtuscontrol.com.br", // URL do seu site
      status: 'authorized',
    }, {
      headers: { 'Authorization': `Bearer ${MERCADOPAGO_ACCESS_TOKEN}` }
    });

    const mpData = mpResponse.data;

    // Guardar na Base de Dados usando a Service Role
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

// 2. CANCELAR ASSINATURA
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

    await supabase.from('subscriptions')
      .update({ status: 'cancelled' })
      .eq('id', subscriptionId);

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 3. WEBHOOK DO MERCADO PAGO (Para receber confirmações de pagamento)
app.post("/webhook/mercadopago", async (req, res) => {
  try {
    const { type, data } = req.body;
    console.log("MP Webhook recebido:", type);

    if (type === 'payment') {
      const paymentRes = await axios.get(`https://api.mercadopago.com/v1/payments/${data.id}`, {
        headers: { 'Authorization': `Bearer ${MERCADOPAGO_ACCESS_TOKEN}` }
      });
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
          await supabase.rpc('upsert_subscription_from_webhook', {
            _mercado_pago_subscription_id: payment.metadata.preapproval_id,
            _status: 'active',
          });
        }
      }
    } else if (type === 'subscription_preapproval') {
      const preapprovalRes = await axios.get(`https://api.mercadopago.com/preapproval/${data.id}`, {
        headers: { 'Authorization': `Bearer ${MERCADOPAGO_ACCESS_TOKEN}` }
      });
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