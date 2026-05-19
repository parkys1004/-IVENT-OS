import { GoogleGenerativeAI } from "@google/generative-ai";
import { supabase } from '../supabase';

// Vite 환경 변수에서 API 키를 가져와 기본 인스턴스를 생성합니다.
const SYSTEM_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';
let aiInstance: GoogleGenerativeAI | null = SYSTEM_API_KEY ? new GoogleGenerativeAI(SYSTEM_API_KEY) : null;
let lastKey: string | null = SYSTEM_API_KEY;

function getAI() {
  // 사용자가 설정에서 직접 입력한 개인 키가 있는지 확인합니다.
  const userKey = localStorage.getItem('user_gemini_api_key');
  const apiKey = userKey || SYSTEM_API_KEY;

  if (!apiKey || apiKey === 'undefined') {
    return null;
  }

  // 키가 변경되었을 경우에만 인스턴스를 새로 생성합니다.
  if (!aiInstance || apiKey !== lastKey) {
    aiInstance = new GoogleGenerativeAI(apiKey);
    lastKey = apiKey;
  }
  
  return aiInstance;
}

export async function translateText(text: string, targetLanguage: string) {
  if (!text) return '';

  const userKey = localStorage.getItem('user_gemini_api_key');
  const key = userKey || SYSTEM_API_KEY;
  if (!key || key === 'undefined') return text;

  try {
    const body = {
      contents: [{ parts: [{ text: `Translate the following text to ${targetLanguage}. Maintain the original tone and format. Only return the translated text. Original text: ${text}` }] }],
      generationConfig: { temperature: 0.1 },
    };
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(key)}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
    );
    if (!res.ok) return text;
    const json = await res.json() as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
    return json.candidates?.[0]?.content?.parts?.[0]?.text || text;
  } catch {
    return text;
  }
}

/**
 * 사용자 개인 Gemini API 키를 가져옵니다.
 * 우선순위: localStorage → Vault RPC → user_ai_configs 테이블 fallback
 * 키가 없으면 null 반환.
 */
export async function getPersonalGeminiKey(userId: string): Promise<string | null> {
  const localKey = localStorage.getItem('user_gemini_api_key');
  if (localKey) return localKey;

  // Vault RPC로 복호화된 키 조회
  const { data: rpcData } = await supabase.rpc('get_ai_configs');
  if (rpcData && rpcData.length > 0) {
    const googleConfig = rpcData.find((c: any) => c.provider === 'google');
    if (googleConfig?.api_key) return googleConfig.api_key;
  }

  // fallback: 일반 테이블 직접 조회
  const { data } = await supabase
    .from('user_ai_configs')
    .select('api_key')
    .eq('user_id', userId)
    .eq('provider', 'google')
    .maybeSingle();
  return data?.api_key || null;
}

export interface AnalyzeResult {
  title?: string;
  description?: string;
  category?: string;
  date?: string;
  time?: string;
  endDate?: string;
  endTime?: string;
  locationName?: string;
  formattedAddress?: string;
  city?: string;
  country?: string;
  maxAttendees?: number;
  level?: string;
  djs?: string[];
  performances?: string[];
  media?: string[];
  workshops?: { teacher: string; topic: string; time: string }[];
  tickets?: { name: string; price: number }[];
  paymentLink?: string;
}

export async function analyzeEventPoster(params: {
  imageBase64?: string;
  mimeType?: string;
  additionalText?: string;
  apiKey?: string | null;
}): Promise<AnalyzeResult> {
  const { imageBase64, mimeType, additionalText, apiKey: overrideKey } = params;

  const userKey = localStorage.getItem('user_gemini_api_key');
  const key = overrideKey || userKey || SYSTEM_API_KEY;

  if (!key || key === 'undefined') {
    throw new Error('API 키가 없습니다. 개인 Gemini API 키를 등록하거나 시스템 키를 확인해주세요.');
  }
  if (!imageBase64 && !additionalText) {
    throw new Error('이미지 또는 텍스트 데이터가 필요합니다.');
  }

  const prompt = `You are an event data extractor. Analyze the provided dance event poster or text and return ONLY a valid JSON object with no markdown, no code blocks, no extra text.

JSON structure (omit fields you cannot find, use null for unknown values):
{
  "title": "event name",
  "description": "full description",
  "category": "one of: salsa, bachata, kizomba, salsa_bachata, sal_ba_ki, party, lesson, festival, workshop, concert",
  "date": "YYYY-MM-DD",
  "time": "HH:mm (24h)",
  "endDate": "YYYY-MM-DD or null",
  "endTime": "HH:mm or null",
  "locationName": "venue name",
  "formattedAddress": "full address or null",
  "city": "city name",
  "country": "country name",
  "maxAttendees": 0,
  "level": "one of: beginner, intermediate, advanced, all — only for lessons",
  "djs": ["DJ name"],
  "performances": ["performer name"],
  "media": ["media expert name"],
  "workshops": [{"teacher": "name", "topic": "topic", "time": "HH:mm"}],
  "tickets": [{"name": "ticket type", "price": 0}]
}
${additionalText ? `\nAdditional text:\n${additionalText}` : ''}

Return ONLY the JSON object.`;

  const parts: unknown[] = [];
  if (imageBase64) {
    parts.push({ inline_data: { mime_type: mimeType || 'image/jpeg', data: imageBase64 } });
  }
  parts.push({ text: prompt });

  const body = {
    contents: [{ parts }],
    generationConfig: { temperature: 0.1 },
  };

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(key)}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
  );

  if (!res.ok) {
    const errJson = await res.json().catch(() => ({})) as { error?: { message?: string; status?: string } };
    const msg = errJson?.error?.message || `Gemini API 오류 (${res.status})`;
    if (res.status === 400) throw new Error(`API 키가 유효하지 않습니다. Gemini API 키를 확인해주세요. (${msg})`);
    if (res.status === 403) throw new Error(`API 키 권한이 없습니다. Google AI Studio에서 키를 재발급받으세요.`);
    if (res.status === 429) throw new Error(`AI 사용 한도를 초과했습니다. 잠시 후 다시 시도해주세요.`);
    throw new Error(`AI 분석 실패: ${msg}`);
  }

  const json = await res.json() as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
  let text = json.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  text = text.replace(/```json\n?/, '').replace(/```/, '').trim();
  return JSON.parse(text) as AnalyzeResult;
}

export const languageNames: Record<string, string> = {
  ko: '한국어',
  en: 'English',
  ja: '日本語',
  zh: '简体中文',
  th: 'ไทย',
  vi: 'Tiếng Việt',
};
