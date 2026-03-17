const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(bodyParser.json());

app.listen(3000, () => {
  console.log("Servidor rodando na porta 3000");
});

const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  "https://zbnkitesgcvkqbidwqmj.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpibmtpdGVzZ2N2a3FiaWR3cW1qIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjQ2NzQxMSwiZXhwIjoyMDg4MDQzNDExfQ.Ynoy7GEviFrHHi4tIf9oTASodEmvhAkkql0CfLGMYR4" // IMPORTANTE: usar service role no backend
);

app.post("/webhook/whatsapp", async (req, res) => {
  try {
    const data = req.body;

    console.log("Mensagem recebida:", data);

    const numero = data.from; // depende da Uazapi
    const mensagem = data.text || "";
    const mediaUrl = data.mediaUrl || null;

    // 1. Buscar usuário pelo número
    const { data: user } = await supabase
      .from("profiles")
      .select("*")
      .eq("whatsapp_number", numero)
      .single();

    if (!user) {
      console.log("Número não encontrado");
      return res.sendStatus(200);
    }

    // 2. Buscar empresa
    const { data: access } = await supabase
      .from("user_entity_access")
      .select("entity_id")
      .eq("user_id", user.id)
      .single();

    // 3. Salvar na fila
    await supabase.from("pending_whatsapp_expenses").insert({
      entity_id: access.entity_id,
      user_id: user.id,
      message_text: mensagem,
      media_url: mediaUrl,
      processed: false
    });

    // 4. Processar mensagem
    if (mediaUrl) {
      const path = `./temp_${Date.now()}.jpg`;

      // 1. baixar imagem
      await downloadImage(mediaUrl, path);

      // 2. extrair texto
      const text = await extractTextFromImage(path);

      console.log("Texto OCR:", text);

      // 3. extrair dados
      const valor = extractValue(text);
        const descricao = extractDescription(text);

      if (valor) {
        await supabase.from("expenses").insert({
          entity_id: entityId,
          user_id: user.id,
          description: descricao,
          amount: valor
        });
      }
    }
  }
});

async function processMessage(user, entityId, text) {
  const linhas = text.split("\n");

  for (let linha of linhas) {
    const match = linha.match(/(.+)\s+([\d.,]+)/);

    if (!match) continue;

    const descricao = match[1];
    const valor = parseFloat(match[2].replace(",", "."));

    await supabase.from("expenses").insert({
      entity_id: entityId,
      user_id: user.id,
      description: descricao,
      amount: valor
    });
  }
}

const axios = require("axios");
const fs = require("fs");

async function downloadImage(url, filepath) {
  const response = await axios({
    url,
    method: "GET",
    responseType: "stream"
  });

  const writer = fs.createWriteStream(filepath);

  response.data.pipe(writer);

  return new Promise((resolve, reject) => {
    writer.on("finish", resolve);
    writer.on("error", reject);
  });
}

const Tesseract = require("tesseract.js");

async function extractTextFromImage(path) {
  const result = await Tesseract.recognize(path, "por");
  return result.data.text;
}

function extractValue(text) {
  const match = text.match(/(\d+[.,]\d{2})/);

  if (!match) return null;

  return parseFloat(match[1].replace(",", "."));
}

function extractDescription(text) {
  const linhas = text.split("\n").filter(l => l.trim() !== "");
  return linhas[0]; // primeira linha do recibo
}