import { GoogleGenerativeAI } from "@google/generative-ai";

let aiInstance: GoogleGenerativeAI | null = null;
let lastKey: string | null = null;

function getAI() {
  // Try personal key from localStorage first
  let apiKey = localStorage.getItem('user_gemini_api_key');
  
  if (!apiKey) {
    apiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY;
  }

  if (!apiKey || apiKey === 'undefined') {
    if (aiInstance) {
      aiInstance = null;
      lastKey = null;
    }
    return null;
  }

  // Refresh instance if key changed
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
    const model = ai.getGenerativeModel({ model: "gemini-1.5-flash-latest" }, { apiVersion: 'v1beta' });
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

export const languageNames: Record<string, string> = {
  ko: '한국어',
  en: 'English',
  ja: '日本語',
  zh: '简体中文',
  th: 'ไทย',
  vi: 'Tiếng Việt',
};
