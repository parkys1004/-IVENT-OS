import { supabase } from '../supabase';
import { GoogleGenerativeAI } from '@google/generative-ai';

function getGeminiModel() {
  const userKey = localStorage.getItem('user_gemini_api_key');
  const envKey = import.meta.env.VITE_GEMINI_API_KEY;
  const apiKey = userKey || envKey || '';
  
  if (!apiKey) return null;
  
  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({ model: 'gemini-2.0-flash' }, { apiVersion: 'v1beta' });
}

export interface RecommendationTags {
  country?: string[];
  region?: string[];
  genres?: string[];
  roles?: string[];
  types?: string[];
}

/**
 * Extracts structured tags from raw user natural language input using Gemini.
 */
export async function extractTagsFromInput(input: string): Promise<RecommendationTags> {
  const prompt = `
    You are the 'Dancehive' data recommendation engine. 
    Extract the following tags from the user input for a Latin dance community app.
    Return only valid JSON.
    
    User Input: "${input}"
    
    Tags to extract:
    - country: (e.g., 한국, 중국, 일본, 대만, 베트남 등)
    - region: (e.g., 부산, 서울, 포항, 강남, 홍대, 도쿄 등)
    - genres: (e.g., 살사, 바차타, 키좀바, 라인댄스 등)
    - roles: (e.g., DJ, 강사, 공연팀, 작곡가 등)
    - types: (e.g., 파티, 소셜, 강습, 워크숍, 페스티벌 등)
    
    Example Return:
    {
      "country": ["한국"],
      "region": ["서울", "강남"],
      "genres": ["살사", "바차타"],
      "roles": ["DJ"],
      "types": ["파티"]
    }
  `;

  try {
    const model = getGeminiModel();
    if (!model) throw new Error('Gemini model not initialized - missing API key');
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    // Clean JSON from potential markdown blocks
    const jsonStr = text.replace(/```json|```/g, '').trim();
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error('Failed to extract tags:', error);
    return {};
  }
}

/**
 * Queries Supabase using the extracted tags to find relevant events.
 */
export async function getRecommendations(tags: RecommendationTags) {
  let query = supabase.from('parties').select('id, title, description, date, end_date, category, location_name, formatted_address, image_url, likes_count, created_at, max_attendees, metadata');

  // filter by genres (using or or array logic depending on schema)
  if (tags.genres && tags.genres.length > 0) {
    const genreFilters = tags.genres.map(g => `category.ilike.%${g}%`).join(',');
    query = query.or(genreFilters);
  }

  // filter by region/address
  if (tags.region && tags.region.length > 0) {
    const regionFilters = tags.region.map(r => `formatted_address.ilike.%${r}%`).join(',');
    query = query.or(regionFilters);
  }

  // filter by text content for types/roles if not explicitly in categories
  if (tags.types && tags.types.length > 0) {
     const typeFilters = tags.types.map(t => `description.ilike.%${t}%`).join(',');
     query = query.or(typeFilters);
  }

  const { data, error } = await query
    .eq('is_approved', true)
    .gt('date', new Date().toISOString())
    .order('date', { ascending: true })
    .limit(10);

  if (error) throw error;
  return data;
}
