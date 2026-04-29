import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // JSON Body size limit increased for base64 images
  app.use(express.json({ limit: '10mb' }));

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
      res.json(JSON.parse(response.text()));
    } catch (error: any) {
      console.error("AI Proxy Error:", error);
      res.status(500).json({ error: error.message || "AI Analysis failed on server." });
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
