const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const axios = require("axios");
const fs = require("fs");
const { createClient } = require("@supabase/supabase-js");

// Inicialização
const app = express();
app.use(cors());
app.use(bodyParser.json());

// Clientes e Chaves
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const UAZAPI_URL = process.env.UAZAPI_URL; // Ex: https://sua-uazapi.com/instance-name
const UAZAPI_API_KEY = process.env.UAZAPI_API_KEY;

// Rota principal do Webhook
app.post("/webhook/whatsapp", async (req, res) => {
  const path = `./temp_${Date.now()}.jpg`; // Caminho temporário para imagens

  try {
    const data = req.body;
    
    // Uazapi envia os dados de diferentes formas dependendo do evento
    // Aqui capturamos o número, a mensagem de texto e a possível imagem
    const numero = data.from || data.phone || data.remoteJid?.replace(/\D/g, "") || data.data?.remoteJid?.replace(/\D/g, "");
    const mensagem = data.text || data.message || data.data?.message?.conversation || "";
    const mediaUrl = data.mediaUrl || data.imageUrl || data.documentUrl || data.data?.message?.imageMessage?.url || null;

    // Se for uma mensagem de sistema ou sem número, ignoramos
    if (!numero) return res.sendStatus(200);

    // 1. Procurar o utilizador na base de dados pelo número
    const { data: user } = await supabase
      .from("profiles")
      .select("*")
      .eq("whatsapp_number", numero)
      .single();

    if (!user) {
        console.log(`Utilizador não encontrado para o número: ${numero}`);
        return res.sendStatus(200);
    }

    // 2. Procurar a empresa (entity_id) associada ao utilizador
    const { data: access } = await supabase
      .from("user_entity_access")
      .select("entity_id")
      .eq("user_id", user.id)
      .single();

    if (!access) return res.sendStatus(200);

    let aiResponse = null;

    // 3. Processar a mensagem (Imagem ou Texto) com o Google Gemini
    if (mediaUrl) {
      console.log("Processando imagem do recibo...");
      await downloadImage(mediaUrl, path);
      const base64Image = fs.readFileSync(path, { encoding: 'base64' });
      aiResponse = await extractDataWithGemini(base64Image, mensagem, true);
    } else if (mensagem.trim().length > 0) {
      console.log("Processando despesa por texto...");
      aiResponse = await extractDataWithGemini(null, mensagem, false);
    }

    // 4. Guardar na base de dados e responder ao utilizador
    if (aiResponse && aiResponse.amount) {
      const { error } = await supabase.from("pending_whatsapp_expenses").insert({
        entity_id: access.entity_id,
        user_id: user.id,
        extracted_data: aiResponse,
        media_url: mediaUrl, // Ficará null se for só texto
        processed: false
      });

      if (!error) {
        // Enviar confirmação de volta para o WhatsApp
        const msgConfirmacao = `✅ *Despesa Registada!*\n\n📝 Descrição: ${aiResponse.description}\n💰 Valor: R$ ${aiResponse.amount.toFixed(2)}\n📂 Categoria: ${aiResponse.category}\n\nJá está disponível no seu painel do VirtusControl.`;
        await sendWhatsAppReply(numero, msgConfirmacao);
      } else {
        console.error("Erro ao inserir no Supabase:", error);
      }
    } else {
      // Se a IA não encontrou uma despesa válida na mensagem
      await sendWhatsAppReply(numero, "🤖 Desculpe, não consegui identificar um valor ou despesa válida nesta mensagem. Tente enviar um recibo claro ou escrever o valor e o que comprou.");
    }

    res.sendStatus(200);
  } catch (error) {
    console.error("Erro crítico no webhook:", error);
    res.sendStatus(500);
  } finally {
    // CORREÇÃO CRÍTICA: Apaga sempre a imagem da VPS no final para não lotar o disco
    if (fs.existsSync(path)) {
      fs.unlinkSync(path);
    }
  }
});

// --- FUNÇÕES AUXILIARES ---

// Faz o download da imagem da Uazapi para a VPS
async function downloadImage(url, filepath) {
  const response = await axios({ url, method: "GET", responseType: "stream" });
  const writer = fs.createWriteStream(filepath);
  response.data.pipe(writer);
  return new Promise((resolve, reject) => {
    writer.on("finish", resolve);
    writer.on("error", reject);
  });
}

// Envia os dados para a IA do Google (Gemini)
async function extractDataWithGemini(base64Image, textoAdicional, isImage) {
  if (!GEMINI_API_KEY) {
      console.error("Falta a GEMINI_API_KEY nas variáveis de ambiente!");
      return null;
  }
  
  const prompt = `Atue como um assistente financeiro. Extraia as informações desta despesa num objeto JSON exato com estas chaves: "description" (string, o que foi comprado), "amount" (number, valor total da despesa, usando ponto para decimais), "category" (string), "supplier" (string, loja ou fornecedor), "date" (string, formato YYYY-MM-DD). Se não encontrar algum dado, preencha com "Não identificado" (ou data de hoje). Retorne APENAS o JSON válido. ${textoAdicional ? `Instrução adicional do utilizador: ${textoAdicional}` : ''}`;
  
  let parts = [{ text: prompt }];
  if (isImage && base64Image) {
      parts.push({ inline_data: { mime_type: "image/jpeg", data: base64Image } });
  }

  try {
    const response = await axios.post(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
      contents: [{ parts: parts }]
    });

    let textResponse = response.data.candidates[0].content.parts[0].text;
    
    // Limpa os blocos de código do Markdown (```json ... ```) se o Gemini os enviar
    textResponse = textResponse.replace(/```json/g, '').replace(/```/g, '').trim();
    
    return JSON.parse(textResponse);
  } catch(e) {
    console.error("Erro na leitura do Gemini:", e.response?.data || e.message);
    return null;
  }
}

// Envia uma mensagem de volta para o cliente via Uazapi
async function sendWhatsAppReply(numero, texto) {
  if (!UAZAPI_URL || !UAZAPI_API_KEY) return;
  
  try {
    // Formato padrão de envio da maioria das versões da Uazapi / Evolution API
    await axios.post(`${UAZAPI_URL}/message/sendText`, {
      number: numero,
      text: texto
    }, {
      headers: { 
        'apikey': UAZAPI_API_KEY,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error("Erro ao responder via WhatsApp:", error.message);
  }
}

// Inicia o Servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));