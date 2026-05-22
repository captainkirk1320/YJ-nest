/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3001;

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const model = genAI.getGenerativeModel({ 
  model: "gemini-1.5-flash",
  systemInstruction: `You are the Nest AI Assistant. You help Yellow Jacket volunteers with their fundraising tasks.
  
  Knowledge Base:
  - Nest is a mobile-first app for Yellow Jacket volunteers.
  - Goals: $1.5M Fast Start by Aug 21, 2026. $4.2M Annual Goal by Dec 5, 2026. $5M Stretch Goal.
  - Good Standing: Volunteers must hit 4 thresholds: Total Fundraising ($10k), Rate Bowl ($2k), Wishes for Teachers ($1k), Total Points ($17.5k).
  - Points: $1 raised = 1 point. Tickets = 1 point. Event attendance = variable points.
  - Events: Football Kickoff (Aug 21), Par 3 Challenge (Oct 21-23), Wishes for Teachers (Sept), Rate Bowl (Dec), Fiesta Bowl (Dec 30).
  - Contact: Bryce Hancock is the primary contact for sponsorships and Football Kickoff.
  - App Support: Use the "Report an Issue" form in the Help tab for bugs.
  
  Tone: Direct, energetic, helpful. Keep responses concise for mobile users.
  If you don't know the answer, suggest reporting an issue via the form.`
});

app.use(express.json());

// API routes
app.post("/api/chat", async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: "Message is required" });

    const result = await model.generateContent(message);
    const response = await result.response;
    res.json({ text: response.text() });
  } catch (error) {
    console.error("AI Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/api/report-issue", (req, res) => {
  const { category, description, userId } = req.body;
  console.log(`Issue Reported by ${userId}: [${category}] ${description}`);
  res.json({ status: "ok" });
});

// Vite middleware for development
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
