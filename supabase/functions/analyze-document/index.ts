const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageBase64, mimeType } = await req.json();
    
    if (!imageBase64 || !mimeType) {
      return new Response(
        JSON.stringify({ error: "imageBase64 and mimeType are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `Você é um assistente especializado em extrair informações de documentos financeiros como notas fiscais, recibos, faturas e boletos.

Analise a imagem/documento fornecido e extraia as informações de despesa/custo.

IMPORTANTE: Retorne APENAS um objeto JSON válido, sem markdown, sem explicações, apenas o JSON.

O JSON deve ter exatamente esta estrutura:
{
  "description": "descrição clara e concisa da despesa",
  "amount": número (valor numérico, sem formatação),
  "category": "operacional" | "pessoal" | "marketing" | "fornecedores" | "impostos" | "equipamentos" | "outros",
  "date": "YYYY-MM-DD",
  "paymentMethod": "dinheiro" | "cartao_credito" | "cartao_debito" | "pix" | "boleto" | "transferencia",
  "personType": "pj" | "pf",
  "notes": "observações relevantes extraídas do documento"
}

Regras para tipo de pessoa:
- pj: Pessoa Jurídica - quando o documento for de uma empresa (CNPJ, nota fiscal de empresa, etc)
- pf: Pessoa Física - quando o documento for de pessoa física (CPF, recibo de autônomo, etc)

Regras para categorização:
- operacional: contas de luz, água, internet, aluguel, manutenção
- pessoal: salários, benefícios, vale-transporte, vale-refeição
- marketing: publicidade, propaganda, eventos promocionais
- fornecedores: compra de materiais, mercadorias, insumos
- impostos: tributos, taxas governamentais, IPTU, IPVA
- equipamentos: compra ou manutenção de equipamentos, móveis
- outros: despesas que não se encaixam nas categorias acima

Se não conseguir identificar algum campo, use valores padrão razoáveis:
- date: data atual
- category: "outros"
- paymentMethod: "pix"
- personType: "pj"
- notes: ""`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: {
                  url: `data:${mimeType};base64,${imageBase64}`,
                },
              },
              {
                type: "text",
                text: "Analise este documento e extraia as informações de despesa. Retorne APENAS o JSON.",
              },
            ],
          },
        ],
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns segundos." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos insuficientes. Por favor, adicione créditos à sua conta." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "Erro ao processar o documento" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    // Clean up the response - remove markdown code blocks if present
    let cleanContent = content.trim();
    if (cleanContent.startsWith("```json")) {
      cleanContent = cleanContent.slice(7);
    } else if (cleanContent.startsWith("```")) {
      cleanContent = cleanContent.slice(3);
    }
    if (cleanContent.endsWith("```")) {
      cleanContent = cleanContent.slice(0, -3);
    }
    cleanContent = cleanContent.trim();

    // Parse the JSON
    let extractedData;
    try {
      extractedData = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error("Failed to parse AI response:", cleanContent);
      return new Response(
        JSON.stringify({ 
          error: "Não foi possível extrair os dados do documento. Tente novamente ou preencha manualmente.",
          rawResponse: cleanContent 
        }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate and sanitize the extracted data
    const result = {
      description: String(extractedData.description || "Despesa extraída"),
      amount: Number(extractedData.amount) || 0,
      category: ["operacional", "pessoal", "marketing", "fornecedores", "impostos", "equipamentos", "outros"]
        .includes(extractedData.category) ? extractedData.category : "outros",
      date: extractedData.date || new Date().toISOString().split("T")[0],
      paymentMethod: ["dinheiro", "cartao_credito", "cartao_debito", "pix", "boleto", "transferencia"]
        .includes(extractedData.paymentMethod) ? extractedData.paymentMethod : "pix",
      personType: ["pj", "pf"].includes(extractedData.personType) ? extractedData.personType : "pj",
      notes: String(extractedData.notes || ""),
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("analyze-document error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
