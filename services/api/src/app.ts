import express from "express";
import cors from "cors";
import helmet from "helmet";
import { z } from "zod";
import { store } from "./store.js";
import { runTask, cancelTask } from "./runtime.js";

export const app = express();
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cors({ origin: process.env.WEB_ORIGIN?.split(",") ?? true, credentials: true }));
app.use(express.json({ limit: "10mb" }));

const AI_BASE_URL = (process.env.AI_BASE_URL || "https://openrouter.ai/api/v1").replace(/\/$/, "");
const AI_MODEL = process.env.AI_MODEL || "stealth/ox-alpha";

app.get("/api/health", (_q, r) => r.json({ ok: true, aiConfigured: Boolean(process.env.AI_API_KEY), model: AI_MODEL, provider: AI_BASE_URL, version: "1.0.0" }));
app.get("/api/config", (_q, r) => r.json({ model: AI_MODEL, aiConfigured: Boolean(process.env.AI_API_KEY), voice: "browser" }));
app.get("/api/agent/status", (_q, r) => { const e = [...store.events].reverse().find((x) => x.type === "agent.status"); r.json(e?.payload ?? { state: "IDLE", text: "Ready for you." }); });
app.get("/api/tasks", (_q, r) => r.json([...store.tasks.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt))));
app.get("/api/tasks/:id", (q, r) => { const t = store.tasks.get(q.params.id); t ? r.json(t) : r.status(404).json({ error: "Task not found" }); });

const chatSchema = z.object({ messages: z.array(z.object({ role: z.enum(["system", "user", "assistant"]), content: z.string().min(1).max(1000000) })).min(1), stream: z.boolean().default(true) });
app.post("/api/chat", async (q, r) => {
  const parsed = chatSchema.safeParse(q.body);
  if (!parsed.success) return r.status(400).json({ error: "Invalid chat request" });
  if (!process.env.AI_API_KEY) return r.status(503).json({ error: "AI API key is not configured yet.", code: "AI_NOT_CONFIGURED" });
  try {
    const upstream = await fetch(`${AI_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: { authorization: `Bearer ${process.env.AI_API_KEY}`, "content-type": "application/json", ...(process.env.AI_HTTP_REFERER ? { "HTTP-Referer": process.env.AI_HTTP_REFERER } : {}), ...(process.env.AI_X_TITLE ? { "X-Title": process.env.AI_X_TITLE } : {}) },
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
      const parts = buffer.split("\n\n");
      buffer = parts.pop() || "";
      for (const part of parts) {
        const line = part.split("\n").find((x) => x.startsWith("data:"));
        if (!line) continue;
        const payload = line.slice(5).trim();
        if (payload === "[DONE]") { r.write("data: [DONE]\n\n"); continue; }
        try { const json = JSON.parse(payload); const text = json?.choices?.[0]?.delta?.content; if (text) r.write(`data: ${JSON.stringify({ text })}\n\n`); } catch { /* ignore upstream comments */ }
      }
    }
    r.end();
  } catch (error) { r.status(500).json({ error: error instanceof Error ? error.message : "Unknown AI error" }); }
});

const createSchema = z.object({ title: z.string().min(2).max(120).optional(), description: z.string().min(2).max(10000), priority: z.enum(["low", "normal", "high"]).default("normal") });
app.post("/api/tasks", (q, r) => {
  const parsed = createSchema.safeParse(q.body);
  if (!parsed.success) return r.status(400).json({ error: "Invalid task" });
  const now = new Date().toISOString(); const id = crypto.randomUUID(); const d = parsed.data;
  const t = { id, userId: "owner", title: d.title ?? d.description.slice(0, 64), description: d.description, status: "QUEUED" as const, priority: d.priority, progress: 0, currentActivity: "Task queued.", steps: ["Understand the objective", "Plan the work", "Use available tools", "Verify the result"].map((title, i) => ({ id: `${id}-${i}`, title, status: "pending" as const, safeSummary: title })), createdAt: now, updatedAt: now };
  store.tasks.set(id, t); store.messages.push({ id: crypto.randomUUID(), role: "user", content: d.description, createdAt: now, taskId: id }); store.emit("task.created", { task: t }, id); setTimeout(() => void runTask(id), 80); r.status(201).json(t);
});
app.post("/api/tasks/:id/cancel", (q, r) => { cancelTask(q.params.id); r.status(202).json({ ok: true }); });
app.post("/api/tasks/:id/pause", (q, r) => { const t = store.updateTask(q.params.id, { status: "PAUSED", currentActivity: "Paused by you." }); t ? r.json(t) : r.status(404).json({ error: "Task not found" }); });
app.post("/api/tasks/:id/resume", (q, r) => { const t = store.tasks.get(q.params.id); if (!t) return r.status(404).json({ error: "Task not found" }); void runTask(t.id); r.status(202).json({ ok: true }); });
app.get("/api/messages", (_q, r) => r.json(store.messages));
app.get("/api/events", (q, r) => {
  r.setHeader("Content-Type", "text/event-stream"); r.setHeader("Cache-Control", "no-cache, no-transform"); r.setHeader("Connection", "keep-alive"); r.flushHeaders();
  for (const e of store.events.slice(-25)) r.write(`id: ${e.id}\nevent: ${e.type}\ndata: ${JSON.stringify(e)}\n\n`);
  const listener = (e: unknown) => r.write(`data: ${JSON.stringify(e)}\n\n`); store.listeners.add(listener);
  const ping = setInterval(() => r.write(": keepalive\n\n"), 15000); q.on("close", () => { clearInterval(ping); store.listeners.delete(listener); });
});
app.use((_q, r) => r.status(404).json({ error: "Not found" }));
export default app;
