interface Env {
  GEMINI_API_KEY: string;
  VITE_SUPABASE_URL: string;
  VITE_SUPABASE_ANON_KEY: string;
}

interface RequestBody {
  imageBase64?: string;
  mimeType?: string;
  additionalText?: string;
  personalApiKey?: string;
}

const CORS = {
  "Access-Control-Allow-Origin": "https://dancehive.app",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Accept, Authorization",
};

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

const GEMINI_SCHEMA = {
  type: "OBJECT",
  properties: {
    title: { type: "STRING" },
    description: { type: "STRING" },
    category: { type: "STRING" },
    date: { type: "STRING" },
    time: { type: "STRING" },
    endDate: { type: "STRING" },
    endTime: { type: "STRING" },
    locationName: { type: "STRING" },
    formattedAddress: { type: "STRING" },
    city: { type: "STRING" },
    country: { type: "STRING" },
    maxAttendees: { type: "INTEGER" },
    level: { type: "STRING" },
    djs: { type: "ARRAY", items: { type: "STRING" } },
    performances: { type: "ARRAY", items: { type: "STRING" } },
    media: { type: "ARRAY", items: { type: "STRING" } },
    workshops: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          teacher: { type: "STRING" },
          topic: { type: "STRING" },
          time: { type: "STRING" },
        },
      },
    },
    tickets: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          name: { type: "STRING" },
          price: { type: "INTEGER" },
        },
      },
    },
  },
  required: ["title", "category", "date", "time", "locationName"],
};

export async function onRequest(context: {
  request: Request;
  env: Env;
}): Promise<Response> {
  const { request, env } = context;

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS });
  }

  if (request.method !== "POST") {
    return json({ error: "Method Not Allowed. Please use POST." }, 405);
  }

  try {
    // 인증 확인 (Supabase REST API)
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "로그인이 필요합니다." }, 401);
    }

    const token = authHeader.slice(7);
    const authRes = await fetch(`${env.VITE_SUPABASE_URL}/auth/v1/user`, {
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: env.VITE_SUPABASE_ANON_KEY,
      },
    });
    if (!authRes.ok) {
      return json({ error: "유효하지 않은 인증입니다." }, 401);
    }

    const body = (await request.json()) as RequestBody;
    const { imageBase64, mimeType, additionalText, personalApiKey } = body;

    const apiKey = personalApiKey || env.GEMINI_API_KEY;
    if (!apiKey) {
      return json({ error: "시스템 API 키가 서버 설정에 없습니다." }, 500);
    }

    if (!imageBase64 && !additionalText) {
      return json({ error: "이미지 또는 텍스트 데이터가 필요합니다." }, 400);
    }

    const prompt = `Extract event information from the provided dance event poster/text. Category must be one of: salsa, bachata, kizomba, salsa_bachata, sal_ba_ki, party, lesson, festival, workshop, concert. Level (for lessons) must be one of: beginner, intermediate, advanced, all. For dates use YYYY-MM-DD. For times use 24h format HH:mm. Extract workshops as array of {teacher, topic, time} objects if present.${
      additionalText ? `\n\nAdditional text info:\n${additionalText}` : ""
    }`;

    const parts: unknown[] = [];
    if (imageBase64) {
      parts.push({ inline_data: { mime_type: mimeType || "image/jpeg", data: imageBase64 } });
    }
    parts.push({ text: prompt });

    const geminiBody = {
      contents: [{ parts }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: GEMINI_SCHEMA,
      },
    };

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(geminiBody),
        signal: AbortSignal.timeout(25000),
      }
    );

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();

      if (geminiRes.status === 429 || errText.toLowerCase().includes("quota")) {
        const retryMatch = errText.match(/"retryDelay":"(\d+)s"/);
        const retrySec = retryMatch ? parseInt(retryMatch[1]) : 30;
        return json(
          {
            error: `AI 사용 한도를 초과했습니다. ${retrySec}초 후 다시 시도해주세요.`,
            retryAfter: retrySec,
          },
          429
        );
      }

      return json({ error: "AI 분석 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요." }, 500);
    }

    const geminiData = (await geminiRes.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };

    let text = geminiData.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    text = text.replace(/```json\n?/, "").replace(/```/, "").trim();

    try {
      const parsed = JSON.parse(text);
      return json(parsed);
    } catch {
      return json({ error: "AI 응답 데이터 형식이 올바르지 않습니다." }, 500);
    }
  } catch (error: unknown) {
    const msg = (error as { message?: string })?.message ?? String(error);

    if (msg.includes("TimeoutError") || msg.includes("timed out") || msg === "TIMEOUT") {
      return json(
        { error: "AI 분석 시간이 초과되었습니다. 이미지 크기를 줄이거나 잠시 후 다시 시도해주세요." },
        504
      );
    }

    return json({ error: "AI 분석 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요." }, 500);
  }
}
