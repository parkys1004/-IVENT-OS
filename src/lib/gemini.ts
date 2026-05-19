import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
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
  
  const ai = getAI();
  if (!ai) return text; 
  
  try {
    const model = ai.getGenerativeModel({ model: "gemini-2.0-flash" }, { apiVersion: 'v1beta' });
    const result = await model.generateContent(
      `Translate the following text to ${targetLanguage}. Maintain the original tone and format. Only return the translated text. Original text: ${text}`
    );
    const response = await result.response;
    return response.text() || text;
  } catch (error) {
    console.error('Translation error:', error);
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

  const ai = new GoogleGenerativeAI(key);
  const model = ai.getGenerativeModel(
    {
      model: 'gemini-2.0-flash',
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: SchemaType.OBJECT,
          properties: {
            title:            { type: SchemaType.STRING },
            description:      { type: SchemaType.STRING },
            category:         { type: SchemaType.STRING },
            date:             { type: SchemaType.STRING },
            time:             { type: SchemaType.STRING },
            endDate:          { type: SchemaType.STRING },
            endTime:          { type: SchemaType.STRING },
            locationName:     { type: SchemaType.STRING },
            formattedAddress: { type: SchemaType.STRING },
            city:             { type: SchemaType.STRING },
            country:          { type: SchemaType.STRING },
            maxAttendees:     { type: SchemaType.INTEGER },
            level:            { type: SchemaType.STRING },
            djs:              { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
            performances:     { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
            media:            { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
            workshops: {
              type: SchemaType.ARRAY,
              items: {
                type: SchemaType.OBJECT,
                properties: {
                  teacher: { type: SchemaType.STRING },
                  topic:   { type: SchemaType.STRING },
                  time:    { type: SchemaType.STRING },
                },
              },
            },
            tickets: {
              type: SchemaType.ARRAY,
              items: {
                type: SchemaType.OBJECT,
                properties: {
                  name:  { type: SchemaType.STRING },
                  price: { type: SchemaType.INTEGER },
                },
              },
            },
          },
          required: ['title', 'category', 'date', 'time', 'locationName'],
        },
      },
    },
    { apiVersion: 'v1beta' }
  );

  const prompt = `Extract event information from the provided dance event poster/text. Category must be one of: salsa, bachata, kizomba, salsa_bachata, sal_ba_ki, party, lesson, festival, workshop, concert. Level (for lessons) must be one of: beginner, intermediate, advanced, all. For dates use YYYY-MM-DD. For times use 24h format HH:mm. Extract workshops as array of {teacher, topic, time} objects if present.${additionalText ? `\n\nAdditional text info:\n${additionalText}` : ''}`;

  const contents: unknown[] = [];
  if (imageBase64) {
    contents.push({ inlineData: { data: imageBase64, mimeType: mimeType || 'image/jpeg' } });
  }
  contents.push(prompt);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = await model.generateContent(contents as any);
  let text = result.response.text();
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
