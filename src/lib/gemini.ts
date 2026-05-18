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

export const languageNames: Record<string, string> = {
  ko: '한국어',
  en: 'English',
  ja: '日本語',
  zh: '简体中文',
  th: 'ไทย',
  vi: 'Tiếng Việt',
};
