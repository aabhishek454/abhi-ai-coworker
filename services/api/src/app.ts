import express from "express";
import cors from "cors";
import helmet from "helmet";
import { z } from "zod";

export const app = express();
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cors({ origin: true, credentials: false }));
app.use(express.json({ limit: "10mb" }));

const AI_BASE_URL = (process.env.AI_BASE_URL || "https://openrouter.ai/api/v1").replace(/\/$/, "");
const AI_MODEL = process.env.AI_MODEL || "stealth/ox-alpha";

app.get("/api/health", (_q, r) => r.json({ ok: true, aiConfigured: Boolean(process.env.AI_API_KEY), model: AI_MODEL, provider: AI_BASE_URL, version: "1.0.0" }));
app.get("/api/config", (_q, r) => r.json({ model: AI_MODEL, aiConfigured: Boolean(process.env.AI_API_KEY), voice: "browser" }));

const chatSchema = z.object({
  messages: z.array(z.object({ role: z.enum(["system", "user", "assistant"]), content: z.string().min(1).max(1000000) })).min(1),
  stream: z.boolean().default(true),
});

app.post("/api/chat", async (q, r) => {
  const parsed = chatSchema.safeParse(q.body);
  if (!parsed.success) return r.status(400).json({ error: "Invalid chat request" });
  if (!process.env.AI_API_KEY) return r.status(503).json({ error: "AI API key is not configured yet.", code: "AI_NOT_CONFIGURED" });
  try {
    const upstream = await fetch(`${AI_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${process.env.AI_API_KEY}`,
        "content-type": "application/json",
        ...(process.env.AI_HTTP_REFERER ? { "HTTP-Referer": process.env.AI_HTTP_REFERER } : {}),
        ...(process.env.AI_X_TITLE ? { "X-Title": process.env.AI_X_TITLE } : {}),
      },
      body: JSON.stringify({ model: AI_MODEL, messages: parsed.data.messages, stream: parsed.data.stream }),
    });
    if (!upstream.ok) { const detail = await upstream.text(); return r.status(upstream.status).json({ error: "Upstream model request failed", detail: detail.slice(0, 4000) }); }
    if (!parsed.data.stream || !upstream.body) { const data = await upstream.json(); return r.json({ text: data?.choices?.[0]?.message?.content ?? "" }); }

    r.setHeader("Content-Type", "text/event-stream; charset=utf-8");
    r.setHeader("Cache-Control", "no-cache, no-transform");
    r.setHeader("Connection", "keep-alive");
    r.setHeader("X-Accel-Buffering", "no");
    const reader = upstream.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const frames = buffer.split("\n\n");
      buffer = frames.pop() || "";
      for (const frame of frames) {
        const line = frame.split("\n").find(x => x.startsWith("data:"));
        if (!line) continue;
        const payload = line.slice(5).trim();
        if (payload === "[DONE]") { r.write("data: [DONE]\n\n"); continue; }
        try { const json = JSON.parse(payload); const text = json?.choices?.[0]?.delta?.content; if (text) r.write(`data: ${JSON.stringify({ text })}\n\n`); } catch { /* ignore malformed upstream frames */ }
      }
    }
    r.end();
  } catch (error) {
    r.status(500).json({ error: error instanceof Error ? error.message : "Unknown AI error" });
  }
});

app.use((_q, r) => r.status(404).json({ error: "Not found" }));
export default app;
