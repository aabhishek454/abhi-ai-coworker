import { useEffect, useMemo, useRef, useState } from "react";
import { Bot, Brain, Check, ChevronLeft, FileText, Folder, Mic, MicOff, Paperclip, Plus, Send, Settings, Sparkles, Volume2, VolumeX, Wifi, X } from "lucide-react";

type Message = { id: string; role: "user" | "assistant"; content: string; time?: string };
type Config = { model: string; aiConfigured: boolean; voice: string };

const welcome: Message = { id: "welcome", role: "assistant", content: "Hey Abhi 👋\n\nI'm ABHI — your personal AI workspace. Ask me anything, talk to me with voice, or attach a file to get started." };

function App() {
  const [messages, setMessages] = useState<Message[]>([welcome]);
  const [input, setInput] = useState("");
  const [config, setConfig] = useState<Config>({ model: "stealth/ox-alpha", aiConfigured: false, voice: "browser" });
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showNav, setShowNav] = useState(false);
  const [memory, setMemory] = useState<string[]>(() => JSON.parse(localStorage.getItem("abhi-memory") || "[]"));
  const recognition = useRef<any>(null);
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(() => { fetch("/api/config").then(r => r.json()).then(setConfig).catch(() => {}); }, []);
  useEffect(() => { bottom.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, busy]);
  useEffect(() => { localStorage.setItem("abhi-memory", JSON.stringify(memory)); }, [memory]);

  const canSend = input.trim().length > 0 && !busy;
  const status = useMemo(() => busy ? "Thinking…" : listening ? "Listening…" : "Online", [busy, listening]);

  function speak(text: string) {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text.replace(/[*_`#]/g, ""));
    u.rate = 1; u.pitch = 1; u.onstart = () => setSpeaking(true); u.onend = () => setSpeaking(false);
    window.speechSynthesis.speak(u);
  }
  function stopSpeaking() { window.speechSynthesis?.cancel(); setSpeaking(false); }

  function startVoice() {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { setInput("Voice input isn't supported in this browser. Use Chrome on Android."); return; }
    if (listening) { recognition.current?.stop(); setListening(false); return; }
    const r = new SR(); recognition.current = r; r.lang = "en-IN"; r.interimResults = true; r.continuous = false;
    r.onstart = () => setListening(true);
    r.onresult = (e: any) => setInput(Array.from(e.results).map((x: any) => x[0].transcript).join(""));
    r.onerror = () => setListening(false); r.onend = () => setListening(false); r.start();
  }

  async function send(text = input) {
    const prompt = text.trim(); if (!prompt || busy) return;
    setInput(""); setBusy(true);
    const user: Message = { id: crypto.randomUUID(), role: "user", content: prompt };
    const next = [...messages, user]; setMessages(next);
    const aiId = crypto.randomUUID(); setMessages([...next, { id: aiId, role: "assistant", content: "" }]);
    try {
      const res = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: next.filter(m => m.id !== "welcome").map(m => ({ role: m.role, content: m.content })), stream: true }) });
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error || "AI is not connected yet."); }
      const reader = res.body?.getReader(); if (!reader) throw new Error("No response stream");
      const decoder = new TextDecoder(); let buffer = ""; let full = "";
      while (true) {
        const { value, done } = await reader.read(); if (done) break;
        buffer += decoder.decode(value, { stream: true }); const chunks = buffer.split("\n\n"); buffer = chunks.pop() || "";
        for (const chunk of chunks) {
          const line = chunk.split("\n").find(x => x.startsWith("data:")); if (!line) continue;
          const payload = line.slice(5).trim(); if (payload === "[DONE]") continue;
          try { const part = JSON.parse(payload).text || ""; full += part; setMessages(prev => prev.map(m => m.id === aiId ? { ...m, content: full } : m)); } catch {}
        }
      }
      if (full) speak(full);
    } catch (e) {
      setMessages(prev => prev.map(m => m.id === aiId ? { ...m, content: `I’m ready, but the model connection needs one final setup step.\n\n${e instanceof Error ? e.message : "AI connection unavailable."}` } : m));
    } finally { setBusy(false); }
  }

  function newChat() { setMessages([welcome]); setInput(""); }
  function remember() {
    const last = [...messages].reverse().find(m => m.role === "user"); if (!last) return;
    const text = last.content.slice(0, 180); setMemory([...memory.slice(-19), text]);
  }

  return <div className="app">
    <aside className={`sidebar ${showNav ? "open" : ""}`}>
      <div className="brand"><div className="logo"><Sparkles size={18}/></div><div><b>ABHI</b><span>PERSONAL AI</span></div><button className="mobile-x" onClick={() => setShowNav(false)}><X size={18}/></button></div>
      <button className="new-chat" onClick={newChat}><Plus size={17}/> New chat</button>
      <div className="nav-group"><span>WORKSPACE</span><button className="active"><Bot size={17}/> Assistant</button><button onClick={() => setShowSettings(true)}><Brain size={17}/> Memory <em>{memory.length}</em></button><button><Folder size={17}/> Files</button></div>
      <div className="sidebar-bottom"><button onClick={() => setShowSettings(true)}><Settings size={17}/> Settings</button><div className="model-chip"><i/><span><b>{config.model}</b><small>{config.aiConfigured ? "API connected" : "Awaiting API key"}</small></span></div></div>
    </aside>
    {showNav && <div className="backdrop" onClick={() => setShowNav(false)}/>}
    <main className="main">
      <header className="topbar"><button className="menu" onClick={() => setShowNav(true)}><Sparkles size={20}/></button><div className="top-title"><b>ABHI</b><span><Wifi size={11}/> {status.toUpperCase()}</span></div><div className="top-actions"><button onClick={newChat} title="New chat"><Plus size={18}/></button><button onClick={() => setShowSettings(true)} title="Settings"><Settings size={18}/></button></div></header>
      <section className="chat">
        <div className="hero"><div className="hero-orb"><Sparkles size={30}/></div><div><small>YOUR PERSONAL AI</small><h1>What are we building today?</h1><p>Chat, speak, attach context, and let ABHI handle the thinking.</p></div></div>
        <div className="messages">{messages.map(m => <article className={`message ${m.role}`} key={m.id}><div className="avatar">{m.role === "assistant" ? <Sparkles size={16}/> : "A"}</div><div className="bubble"><div className="meta"><b>{m.role === "assistant" ? "ABHI" : "YOU"}</b><span>{m.role === "assistant" && speaking ? <Volume2 size={13}/> : ""}</span></div><p>{m.content || (busy ? "Thinking…" : "")}</p>{m.role === "assistant" && m.content && m.id !== "welcome" && <div className="msg-actions"><button onClick={() => speak(m.content)}><Volume2 size={13}/> Speak</button><button onClick={remember}><Brain size={13}/> Remember</button></div>}</div></article>)}</div><div ref={bottom}/>
        <div className="composer-wrap"><div className="composer"><button className="icon-btn" title="Attach" onClick={() => setInput(input + "\n[Attachment context: paste file content here]")}><Paperclip size={18}/></button><textarea value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }} placeholder="Message ABHI…" rows={1}/><button className={`icon-btn voice ${listening ? "on" : ""}`} onClick={startVoice} title="Voice input">{listening ? <MicOff size={18}/> : <Mic size={18}/>}</button><button className="send" disabled={!canSend} onClick={() => send()}><Send size={17}/></button></div><div className="composer-note"><span>Enter to send · Shift+Enter for new line</span><span><i/> private workspace</span></div></div>
      </section>
    </main>
    {showSettings && <div className="modal-layer"><div className="modal"><div className="modal-head"><div><small>CONTROL CENTER</small><h2>ABHI settings</h2></div><button onClick={() => setShowSettings(false)}><X size={18}/></button></div><div className="settings-card"><div className="setting-row"><div><b>Model</b><small>{config.model}</small></div><span className={config.aiConfigured ? "ok" : "warn"}>{config.aiConfigured ? "CONNECTED" : "API KEY NEEDED"}</span></div><div className="setting-row"><div><b>Voice mode</b><small>Browser speech input + natural device voice output</small></div><span className="ok">READY</span></div><div className="setting-row"><div><b>Memory</b><small>Local device memory: {memory.length} saved notes</small></div><button className="mini" onClick={() => { localStorage.removeItem("abhi-memory"); setMemory([]); }}>Clear</button></div></div><div className="modal-foot"><p>Your model API key stays on the server. Nothing sensitive is stored in the browser.</p><button onClick={() => setShowSettings(false)}>Done</button></div></div></div>}
    {speaking && <button className="stop-speech" onClick={stopSpeaking}><VolumeX size={16}/> Stop voice</button>}
  </div>;
}
export default App;
