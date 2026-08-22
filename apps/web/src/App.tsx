import { useEffect, useMemo, useRef, useState } from "react";
import { Bot, Brain, Folder, KeyRound, Mic, MicOff, Plus, Send, Settings, Sparkles, Volume2, VolumeX, Wifi, X } from "lucide-react";

type Message = { id: string; role: "user" | "assistant"; content: string };
type Config = { model: string; baseUrl: string; aiConfigured: boolean; voice: string; clientKeySupported?: boolean };

const welcome: Message = {
  id: "welcome",
  role: "assistant",
  content: "Hey Abhi 👋\n\nI'm ABHI — your personal AI workspace. Add your provider key in Settings, then ask me anything or use voice.",
};

function loadText(key: string, fallback = "") {
  try { return localStorage.getItem(key) || fallback; } catch { return fallback; }
}

function loadMemory(): string[] {
  try {
    const raw = localStorage.getItem("abhi-memory");
    const value = raw ? JSON.parse(raw) : [];
    return Array.isArray(value) ? value.filter((x) => typeof x === "string").slice(-20) : [];
  } catch {
    try { localStorage.removeItem("abhi-memory"); } catch {}
    return [];
  }
}

function App() {
  const [messages, setMessages] = useState<Message[]>([welcome]);
  const [input, setInput] = useState("");
  const [config, setConfig] = useState<Config>({
    model: "stealth/ox-alpha",
    baseUrl: "https://openrouter.ai/api/v1",
    aiConfigured: false,
    voice: "browser",
    clientKeySupported: true,
  });
  const [apiKey, setApiKey] = useState(() => loadText("abhi-api-key"));
  const [baseUrl, setBaseUrl] = useState(() => loadText("abhi-base-url", "https://openrouter.ai/api/v1"));
  const [model, setModel] = useState(() => loadText("abhi-model", "stealth/ox-alpha"));
  const [keyDraft, setKeyDraft] = useState("");
  const [baseDraft, setBaseDraft] = useState("");
  const [modelDraft, setModelDraft] = useState("");
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showNav, setShowNav] = useState(false);
  const [memory, setMemory] = useState<string[]>(loadMemory);
  const recognition = useRef<any>(null);
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/config", { cache: "no-store" })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (data) setConfig(data); })
      .catch(() => {});
  }, []);

  useEffect(() => { try { localStorage.setItem("abhi-memory", JSON.stringify(memory.slice(-20))); } catch {} }, [memory]);
  useEffect(() => { bottom.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, busy]);

  const status = useMemo(() => busy ? "Thinking…" : listening ? "Listening…" : "Online", [busy, listening]);
  const canSend = input.trim().length > 0 && !busy;

  function openSettings() {
    setKeyDraft("");
    setBaseDraft(baseUrl);
    setModelDraft(model);
    setShowSettings(true);
  }

  function saveSettings() {
    const nextBase = (baseDraft || baseUrl).trim().replace(/\/$/, "");
    const nextModel = (modelDraft || model).trim();
    const nextKey = keyDraft.trim();
    if (nextKey) { localStorage.setItem("abhi-api-key", nextKey); setApiKey(nextKey); }
    localStorage.setItem("abhi-base-url", nextBase);
    localStorage.setItem("abhi-model", nextModel);
    setBaseUrl(nextBase);
    setModel(nextModel);
    setBaseDraft(nextBase);
    setModelDraft(nextModel);
    setKeyDraft("");
    setShowSettings(false);
  }

  function clearKey() {
    localStorage.removeItem("abhi-api-key");
    setApiKey("");
    setKeyDraft("");
  }

  function speak(text: string) {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text.replace(/[*_`#]/g, ""));
    u.rate = 1;
    u.pitch = 1;
    u.onstart = () => setSpeaking(true);
    u.onend = () => setSpeaking(false);
    window.speechSynthesis.speak(u);
  }

  function stopSpeaking() {
    window.speechSynthesis?.cancel();
    setSpeaking(false);
  }

  function startVoice() {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { setInput("Voice input isn't supported in this browser. Use Chrome on Android."); return; }
    if (listening) { recognition.current?.stop(); setListening(false); return; }
    const r = new SR();
    recognition.current = r;
    r.lang = "en-IN";
    r.interimResults = true;
    r.continuous = false;
    r.onstart = () => setListening(true);
    r.onresult = (e: any) => setInput(Array.from(e.results).map((x: any) => x[0]?.transcript || "").join(""));
    r.onerror = () => setListening(false);
    r.onend = () => setListening(false);
    r.start();
  }

  async function send(text = input) {
    const prompt = text.trim();
    if (!prompt || busy) return;
    setInput("");
    setBusy(true);
    const user: Message = { id: crypto.randomUUID(), role: "user", content: prompt };
    const next = [...messages, user];
    const assistantId = crypto.randomUUID();
    setMessages([...next, { id: assistantId, role: "assistant", content: "" }]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(apiKey ? { "x-abhi-api-key": apiKey } : {}),
          "x-abhi-base-url": baseUrl,
          "x-abhi-model": model,
        },
        body: JSON.stringify({
          messages: next.filter((m) => m.id !== "welcome").map((m) => ({ role: m.role, content: m.content })),
          stream: true,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const detail = typeof data.detail === "string" ? data.detail : "";
        throw new Error([data.error || "AI connection failed.", detail].filter(Boolean).join("\n\n"));
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response stream returned by the AI gateway.");
      const decoder = new TextDecoder();
      let buffer = "";
      let full = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const chunks = buffer.split("\n\n");
        buffer = chunks.pop() || "";
        for (const chunk of chunks) {
          const line = chunk.split("\n").find((x) => x.startsWith("data:"));
          if (!line) continue;
          const payload = line.slice(5).trim();
          if (payload === "[DONE]") continue;
          try {
            const part = JSON.parse(payload).text || "";
            full += part;
            setMessages((prev) => prev.map((m) => m.id === assistantId ? { ...m, content: full } : m));
          } catch {}
        }
      }
      if (full) speak(full);
      if (!full) setMessages((prev) => prev.map((m) => m.id === assistantId ? { ...m, content: "The model returned an empty response." } : m));
    } catch (e) {
      const message = e instanceof Error ? e.message : "AI connection unavailable.";
      setMessages((prev) => prev.map((m) => m.id === assistantId ? { ...m, content: `I’m ready, but the model connection needs attention.\n\n${message}` } : m));
    } finally {
      setBusy(false);
    }
  }

  function newChat() { setMessages([welcome]); setInput(""); }
  function remember() {
    const last = [...messages].reverse().find((m) => m.role === "user");
    if (last) setMemory((prev) => [...prev, last.content.slice(0, 180)].slice(-20));
  }

  return <div className="app">
    <aside className={`sidebar ${showNav ? "open" : ""}`}>
      <div className="brand"><div className="logo"><Sparkles size={18}/></div><div><b>ABHI</b><span>PERSONAL AI</span></div><button className="mobile-x" onClick={() => setShowNav(false)}><X size={18}/></button></div>
      <button className="new-chat" onClick={newChat}><Plus size={17}/> New chat</button>
      <div className="nav-group"><span>WORKSPACE</span><button className="active"><Bot size={17}/> Assistant</button><button onClick={openSettings}><Brain size={17}/> Memory <em>{memory.length}</em></button><button onClick={openSettings}><Folder size={17}/> Files</button></div>
      <div className="sidebar-bottom"><button onClick={openSettings}><Settings size={17}/> Settings</button><div className="model-chip"><i/><span><b>{model}</b><small>{apiKey ? "API ready" : "Add API key"}</small></span></div></div>
    </aside>
    {showNav && <div className="backdrop" onClick={() => setShowNav(false)}/>} 
    <main className="main">
      <header className="topbar"><button className="menu" onClick={() => setShowNav(true)}><Sparkles size={20}/></button><div className="top-title"><b>ABHI</b><span><Wifi size={11}/> {status.toUpperCase()}</span></div><div className="top-actions"><button onClick={newChat}><Plus size={18}/></button><button onClick={openSettings}><Settings size={18}/></button></div></header>
      <section className="chat">
        <div className="hero"><div className="hero-orb"><Sparkles size={30}/></div><div><small>YOUR PERSONAL AI</small><h1>What are we building today?</h1><p>Chat, speak, and connect your own AI model.</p></div></div>
        <div className="messages">{messages.map((m) => <article className={`message ${m.role}`} key={m.id}><div className="avatar">{m.role === "assistant" ? <Sparkles size={16}/> : "A"}</div><div className="bubble"><div className="meta"><b>{m.role === "assistant" ? "ABHI" : "YOU"}</b><span>{m.role === "assistant" && speaking ? <Volume2 size={13}/> : ""}</span></div><p>{m.content || (busy ? "Thinking…" : "")}</p>{m.role === "assistant" && m.content && m.id !== "welcome" && <div className="msg-actions"><button onClick={() => speak(m.content)}><Volume2 size={13}/> Speak</button><button onClick={remember}><Brain size={13}/> Remember</button></div>}</div></article>)}</div>
        <div ref={bottom}/>
        <div className="composer-wrap"><div className="composer"><textarea value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }} placeholder="Message ABHI…" rows={1}/><button className={`icon-btn voice ${listening ? "on" : ""}`} onClick={startVoice}>{listening ? <MicOff size={18}/> : <Mic size={18}/>}</button><button className="send" disabled={!canSend} onClick={() => send()}><Send size={17}/></button></div><div className="composer-note"><span>Enter to send · Shift+Enter for new line</span><span><i/> private workspace</span></div></div>
      </section>
    </main>
    {showSettings && <div className="modal-layer"><div className="modal"><div className="modal-head"><div><small>CONTROL CENTER</small><h2>ABHI settings</h2></div><button onClick={() => setShowSettings(false)}><X size={18}/></button></div><div className="settings-card"><div className="setting-row api-row"><div><b><KeyRound size={14}/> Personal AI API Key</b><small>{apiKey ? "Saved on this device" : "Paste your TokenRa/OpenRouter key"}</small></div><span className="ok">CLIENT KEY</span></div><input className="api-input" type="password" value={keyDraft} onChange={(e) => setKeyDraft(e.target.value)} placeholder={apiKey ? "••••••••••••••••" : "sk-…"} autoComplete="off"/><div className="key-actions"><button className="save-key" onClick={saveSettings}>{apiKey ? "Update settings" : "Save settings"}</button>{apiKey && <button className="mini" onClick={clearKey}>Remove key</button>}</div><div className="setting-row"><div><b>API Base URL</b><small>OpenAI-compatible gateway endpoint</small></div></div><input className="api-input" value={baseDraft} onChange={(e) => setBaseDraft(e.target.value)} placeholder="https://openrouter.ai/api/v1"/><div className="setting-row"><div><b>Model</b><small>Provider model identifier</small></div></div><input className="api-input" value={modelDraft} onChange={(e) => setModelDraft(e.target.value)} placeholder="stealth/ox-alpha"/><div className="setting-row"><div><b>Voice mode</b><small>Browser speech input + device voice output</small></div><span className="ok">READY</span></div><div className="setting-row"><div><b>Memory</b><small>Local device memory: {memory.length} saved notes</small></div><button className="mini" onClick={() => { localStorage.removeItem("abhi-memory"); setMemory([]); }}>Clear</button></div></div><div className="modal-foot"><p>API credentials are stored locally on this device in this personal-use build.</p><button onClick={() => setShowSettings(false)}>Done</button></div></div></div>}
    {speaking && <button className="stop-speech" onClick={stopSpeaking}><VolumeX size={16}/> Stop voice</button>}
  </div>;
}

export default App;
