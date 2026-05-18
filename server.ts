import 'dotenv/config';
import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import cors from "cors";
import helmet from "helmet";
import { createClient } from "@supabase/supabase-js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
  const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '');

  // CORS — 프로덕션에서는 허용 도메인 명시, 개발 환경에서만 모두 허용
  const allowedOrigins = process.env.NODE_ENV === 'production'
    ? (process.env.VITE_SITE_URL ? [process.env.VITE_SITE_URL] : false)
    : true;

  app.use(cors({
    origin: allowedOrigins,
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Accept", "Authorization"],
    credentials: true
  }));

  // 보안 헤더 (helmet)
  // CSP는 Vite HMR / Google Maps / Gemini 등 외부 리소스 허용을 위해 개발 환경에서 비활성화
  app.use(
    helmet({
      contentSecurityPolicy: process.env.NODE_ENV === 'production'
        ? {
            directives: {
              defaultSrc: ["'self'"],
              scriptSrc: [
                "'self'",
                "'unsafe-inline'",   // Vite 빌드 인라인 스크립트
                "https://maps.googleapis.com",
                "https://maps.gstatic.com",
              ],
              styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
              fontSrc: ["'self'", "https://fonts.gstatic.com"],
              imgSrc: ["'self'", "data:", "blob:", "https:", "http:"],
              connectSrc: [
                "'self'",
                "https://*.supabase.co",
                "https://generativelanguage.googleapis.com",
                "https://maps.googleapis.com",
              ],
              frameSrc: ["'none'"],
              objectSrc: ["'none'"],
              upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null,
            },
          }
        : false,
      crossOriginEmbedderPolicy: false, // Google Maps iFrame 허용
    })
  );

  // AI 엔드포인트 Rate Limiter (IP 기준, 분당 10회)
  const aiRateMap = new Map<string, { count: number; reset: number }>();
  function aiRateLimit(req: express.Request, res: express.Response, next: express.NextFunction) {
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    const entry = aiRateMap.get(ip);
    if (!entry || now > entry.reset) {
      aiRateMap.set(ip, { count: 1, reset: now + 60_000 });
      return next();
    }
    if (entry.count >= 10) {
      return res.status(429).json({ error: '요청이 너무 많습니다. 1분 후 다시 시도해주세요.' });
    }
    entry.count++;
    next();
  }

  // JSON Body size limit 
  app.use(express.json({ limit: "30mb" }));
  app.use(express.urlencoded({ extended: true, limit: "30mb" }));

  // API 호출 로그 (디버깅용)
  app.use((req, res, next) => {
    if (req.path.startsWith("/api")) {
      console.log(`[API Request] ${req.method} ${req.path}`);
    }
    next();
  });

  const analyzeHandler = async (req: express.Request, res: express.Response) => {
    console.log(`[AI Analysis] Processing request for ${req.path}`);
    try {
      // 로그인 사용자만 허용
      const authHeader = req.headers.authorization;
      if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.slice(7);
        const { error: authErr } = await supabase.auth.getUser(token);
        if (authErr) {
          return res.status(401).json({ error: '유효하지 않은 인증입니다.' });
        }
      } else if (process.env.NODE_ENV === 'production') {
        return res.status(401).json({ error: '로그인이 필요합니다.' });
      }

      const { imageBase64, mimeType, additionalText, personalApiKey } = req.body;
      const apiKey = personalApiKey || process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;

      if (!apiKey) {
        console.error("[AI Analysis] GEMINI_API_KEY is missing in environment.");
        return res.status(500).json({ error: "시스템 API 키가 서버 설정에 없습니다." });
      }

      if (!imageBase64 && !additionalText) {
        return res.status(400).json({ error: "이미지 또는 텍스트 데이터가 필요합니다." });
      }

      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({
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
                    time: { type: SchemaType.STRING }
                  }
                }
              },
              tickets: {
                type: SchemaType.ARRAY,
                items: {
                  type: SchemaType.OBJECT,
                  properties: {
                    name: { type: SchemaType.STRING },
                    price: { type: SchemaType.INTEGER }
                  }
                }
              }
            },
            required: ["title", "category", "date", "time", "locationName"]
          }
        }
      }, { apiVersion: 'v1beta' });

      const prompt = `Extract event information from the provided dance event poster/text. Category must be one of: salsa, bachata, kizomba, salsa_bachata, sal_ba_ki, party, lesson, festival, workshop, concert. Level (for lessons) must be one of: beginner, intermediate, advanced, all. For dates use YYYY-MM-DD. For times use 24h format HH:mm. Extract workshops as array of {teacher, topic, time} objects if present.${additionalText ? `\n\nAdditional text info:\n${additionalText}` : ''}`;

      const contents: any[] = [];
      if (imageBase64) {
        contents.push({ inlineData: { data: imageBase64, mimeType: mimeType || 'image/jpeg' } });
      }
      contents.push(prompt);

      // 60초 타임아웃 — Gemini 이미지 분석은 느릴 수 있음
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('TIMEOUT')), 60000)
      );

      const result = await Promise.race([model.generateContent(contents), timeoutPromise]);
      let text = result.response.text();
      text = text.replace(/```json\n?/, "").replace(/```/, "").trim();
      try {
        const parsed = JSON.parse(text);
        console.log("[AI Analysis] Success.");
        return res.json(parsed);
      } catch {
        console.error("[AI Analysis] JSON Parse Error:", text.substring(0, 500));
        return res.status(500).json({ error: "AI 응답 데이터 형식이 올바르지 않습니다." });
      }
    } catch (error: any) {
      const rawMsg: string = error?.message || error?.toString() || '';
      console.error("[AI Analysis] Error:", rawMsg.substring(0, 300));

      // 429 / quota 초과 감지 (패키지 버전에 따라 status 위치가 다름)
      const isQuota =
        error?.status === 429 ||
        error?.httpStatus === 429 ||
        rawMsg.includes('[429') ||
        rawMsg.includes('429 Too Many') ||
        rawMsg.toLowerCase().includes('quota') ||
        rawMsg.toLowerCase().includes('too many') ||
        rawMsg.toLowerCase().includes('rate limit') ||
        rawMsg.toLowerCase().includes('exceeded');

      if (isQuota) {
        // retryDelay 파싱 (예: "retryDelay":"26s")
        const retryMatch = rawMsg.match(/"retryDelay":"(\d+)s"/);
        const retrySec = retryMatch ? parseInt(retryMatch[1]) : 30;
        return res.status(429).json({
          error: `AI 사용 한도를 초과했습니다. ${retrySec}초 후 다시 시도해주세요.`,
          retryAfter: retrySec
        });
      }

      if (rawMsg === 'TIMEOUT') {
        return res.status(504).json({ error: "AI 분석 시간이 초과되었습니다. 이미지 크기를 줄이거나 잠시 후 다시 시도해주세요." });
      }

      res.status(500).json({ error: "AI 분석 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요." });
    }
  };

  // AI 분석 API (rate limiter + 인증)
  app.post("/api/ai/analyze", aiRateLimit, analyzeHandler);
  app.post("/api/v1/analyze-poster", aiRateLimit, analyzeHandler);

  app.get(["/api/ai/analyze", "/api/v1/analyze-poster"], (req, res) => {
    res.status(405).json({ error: "Method Not Allowed. Please use POST." });
  });

  // 상태 체크
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", time: new Date().toISOString() });
  });

  // Dynamic sitemap.xml
  app.get("/sitemap.xml", async (req, res) => {
    try {
      const [{ data: parties }, { data: lessons }] = await Promise.all([
        supabase
          .from('parties')
          .select('id, updated_at')
          .eq('status', 'published')
          .order('updated_at', { ascending: false }),
        supabase
          .from('lessons')
          .select('id, updated_at')
          .eq('status', 'published')
          .order('updated_at', { ascending: false })
      ]);

      const siteUrl = process.env.VITE_SITE_URL || `${req.protocol}://${req.get('host')}`;
      
      let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${siteUrl}/</loc>
    <changefreq>always</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${siteUrl}/explore</loc>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${siteUrl}/community</loc>
    <changefreq>daily</changefreq>
    <priority>0.7</priority>
  </url>`;

      parties?.forEach((party: any) => {
        const lastMod = party.updated_at ? new Date(party.updated_at).toISOString() : new Date().toISOString();
        sitemap += `
  <url>
    <loc>${siteUrl}/party/${party.id}</loc>
    <lastmod>${lastMod}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>`;
      });

      lessons?.forEach((lesson: any) => {
        const lastMod = lesson.updated_at ? new Date(lesson.updated_at).toISOString() : new Date().toISOString();
        sitemap += `
  <url>
    <loc>${siteUrl}/lesson/${lesson.id}</loc>
    <lastmod>${lastMod}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>`;
      });

      sitemap += `\n</urlset>`;

      res.header('Content-Type', 'application/xml');
      res.header('X-Content-Type-Options', 'nosniff');
      res.send(sitemap.trim());
    } catch (err) {
      console.error("[Sitemap Error]", err);
      res.status(500).type('text/plain').send("Error generating sitemap");
    }
  });

  // robots.txt
  app.get("/robots.txt", (req, res) => {
    const siteUrl = process.env.VITE_SITE_URL || `${req.protocol}://${req.get('host')}`;
    res.type('text/plain');
    res.send(`User-agent: *
Allow: /
Sitemap: ${siteUrl}/sitemap.xml`);
  });

  // API 404
  app.use("/api/*", (req, res) => {
    console.warn(`[Proxy Warning] Unhandled API request: ${req.method} ${req.path}`);
    res.status(404).json({ error: `Not Found: ${req.method} ${req.path}` });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
