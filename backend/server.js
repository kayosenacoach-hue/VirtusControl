const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const axios = require("axios");
const fs = require("fs");
const { createClient } = require("@supabase/supabase-js");

const app = express();
app.use(cors());

// Aumentámos o limite para 50mb porque as imagens do frontend (base64) são grandes
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const UAZAPI_URL = process.env.UAZAPI_URL; 
const UAZAPI_API_KEY = process.env.UAZAPI_API_KEY;

// --- FUNÇÕES DE INTELIGÊNCIA ARTIFICIAL (GEMINI) ---
async function extractDataWithGemini(base64Image, textoAdicional, isImage, customPrompt = null) {
  if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY não configurada no servidor.");
  
  const promptPadrao = `Atue como um assistente financeiro. Extraia as informações desta despesa num objeto JSON exato com estas chaves: "description" (string), "amount" (number, usar ponto para decimais), "category" (string), "supplier" (string), "date" (string, formato YYYY-MM-DD), "paymentMethod" (string), "personType" (string, "pj" ou "pf"), "notes" (string). Se faltar algo, deduza ou preencha vazio. Retorne APENAS o JSON válido. ${textoAdicional ? `Instrução extra: ${textoAdicional}` : ''}`;
  
  const prompt = customPrompt || promptPadrao;
  let parts = [{ text: prompt }];
  
  if (isImage && base64Image) {
      parts.push({ inline_data: { mime_type: "image/jpeg", data: base64Image } });
  }

  try {
    const response = await axios.post(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
      contents: [{ parts: parts }]
    });
    let textResponse = response.data.candidates[0].content.parts[0].text;
    textResponse = textResponse.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(textResponse);
  } catch(e) {
    console.error("Erro Gemini:", e.response?.data || e.message);
    return null;
  }
}

// --- ROTA 1: WEBHOOK DO WHATSAPP ---
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
      // Se tiver uazapi configurada
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

// --- ROTA 2: FRONTEND (UPLOAD DE RECIBO) ---
app.post("/analyze-document", async (req, res) => {
  try {
    const { imageBase64 } = req.body;
    if (!imageBase64) return res.status(400).json({ error: "Imagem não recebida" });

    const aiResponse = await extractDataWithGemini(imageBase64, "", true);
    if (aiResponse) res.json(aiResponse);
    else res.status(500).json({ error: "A IA não conseguiu ler o recibo." });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- ROTA 3: FRONTEND (UPLOAD DE FATURA DE CARTÃO) ---
app.post("/analyze-credit-card-statement", async (req, res) => {
  try {
    const { imageBase64 } = req.body;
    if (!imageBase64) return res.status(400).json({ error: "Imagem não recebida" });

    const promptFatura = `Extraia os dados desta fatura de cartão. Retorne um JSON exato:
    { "cardInfo": { "lastDigits": "string", "dueDate": "YYYY-MM-DD", "totalAmount": number },
      "transactions": [ { "description": "string", "amount": number, "date": "YYYY-MM-DD", "category": "string", "suggestedPersonType": "pf" ou "pj" } ] }
    Retorne APENAS JSON.`;

    const aiResponse = await extractDataWithGemini(imageBase64, "", true, promptFatura);
    if (aiResponse) res.json(aiResponse);
    else res.status(500).json({ error: "Falha ao processar a fatura." });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));