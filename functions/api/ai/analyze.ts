import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { createClient } from "@supabase/supabase-js";

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

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "https://dancehive.app",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Accept, Authorization",
  "Content-Type": "application/json",
};

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: CORS_HEADERS });
}

export async function onRequestOptions(): Promise<Response> {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "https://dancehive.app",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Accept, Authorization",
    },
  });
}

export async function onRequestGet(): Promise<Response> {
  return json({ error: "Method Not Allowed. Please use POST." }, 405);
}

export async function onRequestPost(context: {
  request: Request;
  env: Env;
}): Promise<Response> {
  const { request, env } = context;

  try {
    // 인증 확인
    const authHeader = request.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.slice(7);
      const supabase = createClient(
        env.VITE_SUPABASE_URL,
        env.VITE_SUPABASE_ANON_KEY
      );
      const { error: authErr } = await supabase.auth.getUser(token);
      if (authErr) {
        return json({ error: "유효하지 않은 인증입니다." }, 401);
      }
    } else {
      return json({ error: "로그인이 필요합니다." }, 401);
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

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel(
      {
        model: "gemini-2.0-flash",
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: {
            type: SchemaType.OBJECT,
            properties: {
              title: { type: SchemaType.STRING },
              description: { type: SchemaType.STRING },
              category: { type: SchemaType.STRING },
              date: { type: SchemaType.STRING },
              time: { type: SchemaType.STRING },
              endDate: { type: SchemaType.STRING },
              endTime: { type: SchemaType.STRING },
              locationName: { type: SchemaType.STRING },
              formattedAddress: { type: SchemaType.STRING },
              city: { type: SchemaType.STRING },
              country: { type: SchemaType.STRING },
              maxAttendees: { type: SchemaType.INTEGER },
              level: { type: SchemaType.STRING },
              djs: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
              performances: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
              media: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
              workshops: {
                type: SchemaType.ARRAY,
                items: {
                  type: SchemaType.OBJECT,
                  properties: {
                    teacher: { type: SchemaType.STRING },
                    topic: { type: SchemaType.STRING },
                    time: { type: SchemaType.STRING },
                  },
                },
              },
              tickets: {
                type: SchemaType.ARRAY,
                items: {
                  type: SchemaType.OBJECT,
                  properties: {
                    name: { type: SchemaType.STRING },
                    price: { type: SchemaType.INTEGER },
                  },
                },
              },
            },
            required: ["title", "category", "date", "time", "locationName"],
          },
        },
      },
      { apiVersion: "v1beta" }
    );

    const prompt = `Extract event information from the provided dance event poster/text. Category must be one of: salsa, bachata, kizomba, salsa_bachata, sal_ba_ki, party, lesson, festival, workshop, concert. Level (for lessons) must be one of: beginner, intermediate, advanced, all. For dates use YYYY-MM-DD. For times use 24h format HH:mm. Extract workshops as array of {teacher, topic, time} objects if present.${additionalText ? `\n\nAdditional text info:\n${additionalText}` : ""}`;

    const contents: unknown[] = [];
    if (imageBase64) {
      contents.push({
        inlineData: { data: imageBase64, mimeType: mimeType || "image/jpeg" },
      });
    }
    contents.push(prompt);

    // Cloudflare Workers 실행 시간 제한 고려 — 25초 타임아웃
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("TIMEOUT")), 25000)
    );

    const result = await Promise.race([
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      model.generateContent(contents as any),
      timeoutPromise,
    ]);

    let text = result.response.text();
    text = text.replace(/```json\n?/, "").replace(/```/, "").trim();

    try {
      const parsed = JSON.parse(text);
      return json(parsed);
    } catch {
      return json({ error: "AI 응답 데이터 형식이 올바르지 않습니다." }, 500);
    }
  } catch (error: unknown) {
    const rawMsg: string =
      (error as { message?: string })?.message || String(error) || "";

    const isQuota =
      (error as { status?: number })?.status === 429 ||
      rawMsg.includes("[429") ||
      rawMsg.includes("429 Too Many") ||
      rawMsg.toLowerCase().includes("quota") ||
      rawMsg.toLowerCase().includes("too many") ||
      rawMsg.toLowerCase().includes("rate limit") ||
      rawMsg.toLowerCase().includes("exceeded");

    if (isQuota) {
      const retryMatch = rawMsg.match(/"retryDelay":"(\d+)s"/);
      const retrySec = retryMatch ? parseInt(retryMatch[1]) : 30;
      return json(
        {
          error: `AI 사용 한도를 초과했습니다. ${retrySec}초 후 다시 시도해주세요.`,
          retryAfter: retrySec,
        },
        429
      );
    }

    if (rawMsg === "TIMEOUT") {
      return json(
        { error: "AI 분석 시간이 초과되었습니다. 이미지 크기를 줄이거나 잠시 후 다시 시도해주세요." },
        504
      );
    }

    return json(
      { error: "AI 분석 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요." },
      500
    );
  }
}
