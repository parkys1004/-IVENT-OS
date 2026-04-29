export async function onRequest(context: any) {
  const { request, env } = context;
  
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Accept",
  };

  if (request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method Not Allowed. Use POST." }), { 
      status: 405, 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });
  }

  try {
    const { imageBase64, mimeType } = await request.json();
    const apiKey = env.GEMINI_API_KEY;

    if (!apiKey) {
      return new Response(JSON.stringify({ error: "GEMINI_API_KEY가 설정되지 않았습니다." }), { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    const url = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    
    const geminiResponse = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: "Analyze this dance event poster. Extract: title, category, date (YYYY-MM-DD), time (HH:mm), locationName, formattedAddress. Return JSON." },
            { inline_data: { mime_type: mimeType || "image/webp", data: imageBase64 } }
          ]
        }]
      })
    });

    if (!geminiResponse.ok) {
      const errorData = await geminiResponse.json();
      throw new Error(errorData.error?.message || "Gemini API 오류");
    }

    const data = await geminiResponse.json();
    let text = data.candidates[0].content.parts[0].text;
    text = text.replace(/```json\n?/, "").replace(/```/, "").trim();

    return new Response(text, { 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message || String(error) }), { 
      status: 500, 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });
  }
}
