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
      console.log("📸 Mídia criptografada detectada! Solicitando descriptografia à UAZAPI...");
      try {
        const baseUrl = UAZAPI_URL.replace(/\/$/, ""); 
        const downloadPayload = {
          Url: encryptedMedia.URL,
          Mimetype: encryptedMedia.mimetype,
          FileSHA256: encryptedMedia.fileSHA256,
          FileLength: encryptedMedia.fileLength,
          MediaKey: encryptedMedia.mediaKey,
          FileEncSHA256: encryptedMedia.fileEncSHA256
        };

        const downloadRes = await axios.post(`${baseUrl}/chat/downloadimage`, downloadPayload, {
          headers: { 'token': UAZAPI_API_KEY, 'apikey': UAZAPI_API_KEY }
        });

        // O base64 pode vir de várias formas dependendo da versão da API
        let fetchedBase64 = typeof downloadRes.data === 'string' ? downloadRes.data : downloadRes.data?.data || downloadRes.data?.base64;
        
        if (fetchedBase64) {
          console.log("✅ Imagem descriptografada com sucesso! A enviar para o Gemini...");
          const cleanBase64 = fetchedBase64.replace(/^data:image\/\w+;base64,/, "");
          aiResponse = await extractDataWithGemini(cleanBase64, prompt, true);
        } else {
           console.log("❌ ERRO: A UAZAPI não retornou o Base64 esperado.");
        }
      } catch (e) {
        console.log("❌ Erro ao baixar imagem da UAZAPI:", e.message);
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