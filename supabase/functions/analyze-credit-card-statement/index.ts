import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
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

    const systemPrompt = `Você é um assistente especializado em extrair TODAS as transações de faturas de cartão de crédito.

Analise a fatura de cartão de crédito fornecida e extraia TODAS as transações/compras listadas.

IMPORTANTE: Retorne APENAS um objeto JSON válido, sem markdown, sem explicações, apenas o JSON.

O JSON deve ter exatamente esta estrutura:
{
  "cardInfo": {
    "lastDigits": "últimos 4 dígitos do cartão se visível",
    "dueDate": "YYYY-MM-DD (data de vencimento)",
    "totalAmount": número (valor total da fatura),
    "closingDate": "YYYY-MM-DD (data de fechamento se visível)"
  },
  "transactions": [
    {
      "description": "descrição da compra/transação",
      "amount": número (valor numérico positivo),
      "date": "YYYY-MM-DD",
      "category": "operacional" | "pessoal" | "marketing" | "fornecedores" | "impostos" | "equipamentos" | "outros",
      "suggestedPersonType": "pj" | "pf"
    }
  ]
}

Regras para sugerir tipo de pessoa (suggestedPersonType):
- pj: Estabelecimentos típicos de empresa (papelarias, fornecedores de escritório, serviços B2B, etc)
- pf: Estabelecimentos típicos pessoais (restaurantes, supermercados, farmácias, entretenimento, vestuário, etc)

Regras para categorização:
- operacional: contas de luz, água, internet, aluguel, manutenção, assinaturas de software
- pessoal: restaurantes, supermercados, farmácias, vestuário, entretenimento, saúde pessoal
- marketing: publicidade, propaganda, eventos promocionais, Google Ads, Meta Ads
- fornecedores: compra de materiais, mercadorias, insumos para empresa
- impostos: tributos, taxas governamentais
- equipamentos: compra ou manutenção de equipamentos, eletrônicos
- outros: despesas que não se encaixam nas categorias acima

IMPORTANTE:
- Extraia TODAS as transações visíveis na fatura
- Cada transação deve ter seu próprio item no array
- Valores parcelados (X/Y) devem ser registrados como aparecem
- Inclua a descrição completa de cada estabelecimento`;

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
                text: "Analise esta fatura de cartão de crédito e extraia TODAS as transações. Retorne APENAS o JSON com todas as compras listadas.",
              },
            ],
          },
        ],
        max_tokens: 4000,
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
        JSON.stringify({ error: "Erro ao processar a fatura" }),
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
          error: "Não foi possível extrair os dados da fatura. Verifique se a imagem está legível.",
          rawResponse: cleanContent 
        }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate and sanitize the extracted data
    const validCategories = ["operacional", "pessoal", "marketing", "fornecedores", "impostos", "equipamentos", "outros"];
    
    const result = {
      cardInfo: {
        lastDigits: String(extractedData.cardInfo?.lastDigits || ""),
        dueDate: extractedData.cardInfo?.dueDate || new Date().toISOString().split("T")[0],
        totalAmount: Number(extractedData.cardInfo?.totalAmount) || 0,
        closingDate: extractedData.cardInfo?.closingDate || null,
      },
      transactions: (extractedData.transactions || []).map((tx: any) => ({
        description: String(tx.description || "Transação"),
        amount: Math.abs(Number(tx.amount)) || 0,
        date: tx.date || new Date().toISOString().split("T")[0],
        category: validCategories.includes(tx.category) ? tx.category : "outros",
        suggestedPersonType: ["pj", "pf"].includes(tx.suggestedPersonType) ? tx.suggestedPersonType : "pf",
      })),
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("analyze-credit-card-statement error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
