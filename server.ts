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

  // CORS 설정 추가
  app.use(cors());

  // JSON Body size limit increased for base64 images
  app.use(express.json({ limit: "20mb" }));
  app.use(express.urlencoded({ extended: true, limit: "20mb" }));

  // API 호출 로그 (디버깅용)
  app.use((req, res, next) => {
    if (req.path.startsWith("/api")) {
      console.log(`[API Request] ${req.method} ${req.path}`);
    }
    next();
  });

  // AI Analysis API - Secure Token is NOT exposed to client
  app.post("/api/ai/analyze", async (req, res) => {
    try {
      const { imageBase64, mimeType } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;

      if (!apiKey) {
        return res.status(500).json({ error: "System API Key not configured." });
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

      const prompt = "Extract event information from this dance poster. Use one of these categories: 'salsa', 'bachata', 'kizomba', 'salsa_bachata', 'sal_ba_ki', 'party', 'lesson', 'festival', 'workshop', 'concert'. For dates use YYYY-MM-DD. For times use 24h format HH:mm. For tickets, extract price options. For djs/performances/media, extract names as arrays. If info is missing, use empty defaults.";

      const result = await model.generateContent([
        {
          inlineData: {
            data: imageBase64,
            mimeType: mimeType
          }
        },
        prompt
      ]);

      const response = await result.response;
      let text = response.text();
      
      // JSON 파싱 전 마크다운 백틱 제거 (안전장치)
      text = text.replace(/```json\n?/, "").replace(/```/, "").trim();
      
      try {
        const parsed = JSON.parse(text);
        res.json(parsed);
      } catch (parseError) {
        console.error("JSON Parse Error. Raw Text:", text);
        res.status(500).json({ error: "AI가 생성한 데이터 형식이 올바르지 않습니다." });
      }
    } catch (error: any) {
      console.error("AI Proxy Error:", error);
      res.status(500).json({ error: error.message || "서버 분석 중 오류가 발생했습니다." });
    }
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
