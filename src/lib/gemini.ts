import { GoogleGenAI } from "@google/genai";

let aiInstance: GoogleGenAI | null = null;

function getAI() {
  if (!aiInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'undefined') {
      console.warn("GEMINI_API_KEY is not set. AI features will be disabled.");
      return null;
    }
    aiInstance = new GoogleGenAI({ apiKey });
  }
  return aiInstance;
}

export async function translateText(text: string, targetLanguage: string) {
  if (!text) return '';
  
  const ai = getAI();
  if (!ai) return text; // Fallback to original if AI is not configured
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Translate the following text to ${targetLanguage}. Maintain the original tone and format. Only return the translated text. Original text: ${text}`,
    });
    
    return response.text || text;
  } catch (error) {
    console.error('Translation error:', error);
    return text; // Fallback to original
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
