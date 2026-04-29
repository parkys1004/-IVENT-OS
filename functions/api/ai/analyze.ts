export async function onRequest(context) {
  const { request, env } = context;
  
  // 1. CORS 가드 (Preflight 요청 처리)
  if (request.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Accept",
      },
    });
  }

  // 2. POST 요청만 허용
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method Not Allowed" }), { 
      status: 405,
      headers: { "Content-Type": "application/json" }
    });
  }

  // CORS 응답 헤더 공통 설정
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Content-Type": "application/json",
  };

  try {
    const { imageBase64, mimeType } = await request.json();
    const apiKey = env.GEMINI_API_KEY;

    if (!apiKey) {
      return new Response(JSON.stringify({ error: "GEMINI_API_KEY가 Cloudflare 설정(Environment Variables)에 없습니다." }), {
        status: 500,
        headers: corsHeaders
      });
    }

    // Gemini API 호출
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    
    const responseSchema = {
      type: "object",
      properties: {
        title: { type: "string" },
        description: { type: "string" },
        category: { type: "string" },
        date: { type: "string" },
        time: { type: "string" },
        locationName: { type: "string" },
        formattedAddress: { type: "string" },
        djs: { type: "array", items: { type: "string" } },
        performances: { type: "array", items: { type: "string" } },
        media: { type: "array", items: { type: "string" } },
        tickets: { 
          type: "array", 
          items: { 
            type: "object",
            properties: { name: { type: "string" }, price: { type: "number" } }
          }
        }
      },
      required: ["title", "category", "date", "time", "locationName"]
    };

    const geminiResponse = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: "Extract event info from this poster exactly as per schema. For dates use YYYY-MM-DD. For times use 24h format HH:mm." },
            { inline_data: { mime_type: mimeType || "image/webp", data: imageBase64 } }
          ]
        }],
        generationConfig: {
          response_mime_type: "application/json",
          response_schema: responseSchema
        }
      })
    });

    const result = await geminiResponse.json();
    
    if (!geminiResponse.ok) {
      return new Response(JSON.stringify({ error: result.error?.message || "Gemini API 오류" }), {
        status: geminiResponse.status,
        headers: corsHeaders
      });
    }

    const text = result.candidates[0].content.parts[0].text;
    return new Response(text, { headers: corsHeaders });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: corsHeaders
    });
  }
}
