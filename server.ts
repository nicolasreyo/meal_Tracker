import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

  // API Routes
  app.post("/api/analyze-food", async (req, res) => {
    try {
      const { image } = req.body;
      if (!image) return res.status(400).json({ error: "No image provided" });

      const prompt = `
        Analyze this meal image for a nutritional plan.
        Provide the following in JSON format:
        {
          "foodName": "string",
          "calories": number,
          "protein": number,
          "carbs": number,
          "fat": number,
          "confidence": number (0-1)
        }
        Only return the JSON.
      `;

      const result = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          prompt,
          {
            inlineData: {
              data: image.split(",")[1],
              mimeType: "image/jpeg"
            }
          }
        ]
      });

      const responseText = result.text;
      const jsonMatch = responseText?.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        res.json(JSON.parse(jsonMatch[0]));
      } else {
        res.status(500).json({ error: "Failed to parse AI response" });
      }
    } catch (error) {
      console.error("Analysis Error:", error);
      res.status(500).json({ error: "Internal server error" });
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
