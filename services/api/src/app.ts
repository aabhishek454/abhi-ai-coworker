import express from "express";
import cors from "cors";
import helmet from "helmet";
import { z } from "zod";

export const app = express();
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cors({ origin: true, credentials: false }));
app.use(express.json({ limit: "10mb" }));

const DEFAULT_BASE_URL = (process.env.AI_BASE_URL || "https://openrouter.ai/api/v1").replace(/\/$/, "");
const DEFAULT_MODEL = process.env.AI_MODEL || "stealth/ox-alpha";

app.get("/api/health", (_q, r) => r.json({
  ok: true,
  aiConfigured: Boolean(process.env.AI_API_KEY),
  model: DEFAULT_MODEL,
  provider: DEFAULT_BASE_URL,
  version: "1.2.0",
  clientConfigSupported: true,
}));

app.get("/api/config", (_q, r) => r.json({
  model: DEFAULT_MODEL,
  baseUrl: DEFAULT_BASE_URL,
  aiConfigured: Boolean(process.env.AI_API_KEY),
  voice: "browser",
  clientKeySupported: true,
  clientConfigSupported: true,
}));

const chatSchema = z.object({
  messages: z.array(z.object({
    role: z.enum(["system", "user", "assistant"]),
    content: z.string().min(1).max(1000000),
  })).min(1),
  stream: z.boolean().default(true),
});

function cleanBaseUrl(value: string) {
  return value.trim().replace(/\/$/, "");
}

app.post("/api/chat", async (q, r) => {
  const parsed = chatSchema.safeParse(q.body);
  if (!parsed.success) return r.status(400).json({ error: "Invalid chat request" });

  const apiKey = q.get("x-abhi-api-key")?.trim() || process.env.AI_API_KEY;
  const baseUrl = cleanBaseUrl(q.get("x-abhi-base-url") || DEFAULT_BASE_URL);
  const model = q.get("x-abhi-model")?.trim() || DEFAULT_MODEL;

  if (!apiKey) {
    return r.status(503).json({
      error: "Add your AI API key in ABHI Settings.",
      code: "AI_NOT_CONFIGURED",
    });
  }

  try {
    const upstream = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
        ...(process.env.AI_HTTP_REFERER ? { "HTTP-Referer": process.env.AI_HTTP_REFERER } : {}),
        ...(process.env.AI_X_TITLE ? { "X-Title": process.env.AI_X_TITLE } : {}),
      },
      body: JSON.stringify({
        model,
        messages: parsed.data.messages,
        stream: parsed.data.stream,
        ...(model === "stealth/ox-alpha" ? { reasoning_effort: "max" } : {}),
      }),
    });

    if (!upstream.ok) {
      const detail = await upstream.text();
      return r.status(upstream.status).json({
        error: "Upstream model request failed",
        provider: baseUrl,
        model,
        detail: detail.slice(0, 4000),
      });
    }

    if (!parsed.data.stream || !upstream.body) {
      const data = await upstream.json();
      return r.json({ text: data?.choices?.[0]?.message?.content ?? "" });
    }

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
        const line = frame.split("\n").find((x) => x.startsWith("data:"));
        if (!line) continue;
        const payload = line.slice(5).trim();
        if (payload === "[DONE]") {
          r.write("data: [DONE]\n\n");
          continue;
        }
        try {
          const json = JSON.parse(payload);
          const text = json?.choices?.[0]?.delta?.content;
          if (text) r.write(`data: ${JSON.stringify({ text })}\n\n`);
        } catch {
          // Ignore non-JSON SSE frames.
        }
      }
    }

    r.end();
  } catch (error) {
    return r.status(500).json({
      error: "AI gateway request failed",
      detail: error instanceof Error ? error.message : "Unknown AI error",
      provider: baseUrl,
      model,
    });
  }
});

app.use((_q, r) => r.status(404).json({ error: "Not found" }));
export default app;
