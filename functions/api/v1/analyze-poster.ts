export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Accept",
    },
  });
}

export async function onRequestPost(context) {
  const { request, env } = context;
  
  // CORS Headers
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Content-Type": "application/json",
  };

  try {
    const { imageBase64, mimeType } = await request.json();
    const apiKey = env.GEMINI_API_KEY;

    if (!apiKey) {
      return new Response(JSON.stringify({ error: "GEMINI_API_KEY가 Cloudflare 설정에 없습니다." }), {
        status: 500,
        headers: corsHeaders
      });
    }

    // Gemini REST API 호출 (Cloudflare Worker 호환 방식)
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    
    // 분석용 스키마 정의
    const responseSchema = {
      type: "object",
      properties: {
        title: { type: "string" },
        description: { type: "string" },
        category: { type: "string" },
        date: { type: "string" },
        time: { type: "string" },
        endDate: { type: "string" },
        endTime: { type: "string" },
        locationName: { type: "string" },
        formattedAddress: { type: "string" },
        city: { type: "string" },
        country: { type: "string" },
        maxAttendees: { type: "number" },
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

    const prompt = "Extract event information from this dance poster. For dates use YYYY-MM-DD. For times use 24h format HH:mm.";

    const geminiResponse = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: prompt },
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
      return new Response(JSON.stringify({ error: result.error?.message || "Gemini API 호출 실패" }), {
        status: geminiResponse.status,
        headers: corsHeaders
      });
    }

    const text = result.candidates[0].content.parts[0].text;
    return new Response(text, { headers: corsHeaders });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message || "서버분석 중 알 수 없는 오류" }), {
      status: 500,
      headers: corsHeaders
    });
  }
}
