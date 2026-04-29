import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import cors from "cors";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // CORS 설정 (Preflight 요청 포함)
  app.use(cors({
    origin: true,
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Accept", "Authorization"],
    credentials: true
  }));

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
      const { imageBase64, mimeType } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;

      if (!apiKey) {
        console.error("[AI Analysis] GEMINI_API_KEY is missing in environment.");
        return res.status(500).json({ error: "시스템 API 키가 서버 설정에 없습니다." });
      }

      if (!imageBase64) {
        return res.status(400).json({ error: "이미지 데이터가 누락되었습니다." });
      }

      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ 
        model: "gemini-1.5-flash",
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
              djs: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
              performances: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
              media: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
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
      });

      const prompt = "Extract event information from this dance poster. For dates use YYYY-MM-DD. For times use 24h format HH:mm.";

      const result = await model.generateContent([
        {
          inlineData: {
            data: imageBase64,
            mimeType: mimeType || 'image/webp'
          }
        },
        prompt
      ]);

      const response = await result.response;
      let text = response.text();
      text = text.replace(/```json\n?/, "").replace(/```/, "").trim();
      
      try {
        const parsed = JSON.parse(text);
        console.log("[AI Analysis] Success.");
        res.json(parsed);
      } catch (parseError) {
        console.error("[AI Analysis] JSON Parse Error:", text.substring(0, 500));
        res.status(500).json({ error: "AI 응답 데이터 형식이 올바르지 않습니다." });
      }
    } catch (error: any) {
      console.error("[AI Analysis] Error:", error);
      res.status(500).json({ error: error.message || "서버 분석 오류" });
    }
  };

  // AI 분석 API (경로 다양성 허용)
  app.post(["/api/ai/analyze", "/api/v1/analyze-poster"], analyzeHandler);

  app.get("/api/ai/analyze", (req, res) => {
    res.json({ message: "API is ready. Use POST." });
  });

  // 상태 체크
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", time: new Date().toISOString() });
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
