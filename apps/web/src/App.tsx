import { useEffect, useMemo, useRef, useState } from "react";
import { Bot, Brain, Check, ChevronDown, Folder, KeyRound, Mic, MicOff, Plus, RefreshCw, Search, Send, Settings, Sparkles, Star, Volume2, VolumeX, Wifi, X } from "lucide-react";

type Message = { id: string; role: "user" | "assistant"; content: string };
type ModelItem = { id: string; name?: string; context_length?: number; pricing?: { prompt?: string; completion?: string }; architecture?: { modality?: string }; supported_parameters?: string[] };

const welcome: Message = { id: "welcome", role: "assistant", content: "Hey Abhi 👋\n\nI'm ABHI — your personal AI workspace. Pick any OpenRouter model in Settings, then ask me anything or use voice." };

function loadText(key: string, fallback = "") { try { return localStorage.getItem(key) || fallback; } catch { return fallback; } }
function loadMemory(): string[] { try { const raw = localStorage.getItem("abhi-memory"); const value = raw ? JSON.parse(raw) : []; return Array.isArray(value) ? value.filter((x) => typeof x === "string").slice(-20) : []; } catch { try { localStorage.removeItem("abhi-memory"); } catch {} return []; } }
function normalizeBaseUrl(value: string) { let base = value.trim().replace(/\/$/, ""); if (base === "https://tokenra.io") base += "/v1"; if (base === "https://openrouter.ai") base += "/api/v1"; return base; }
function isOpenRouterKey(key: string) { return key.trim().startsWith("sk-or-v1-"); }
function extractText(data: any): string { const content = data?.choices?.[0]?.message?.content; if (typeof content === "string") return content; if (Array.isArray(content)) return content.map((x) => typeof x?.text === "string" ? x.text : "").join(""); return ""; }
function isFreeModel(id: string) { return id.endsWith(":free") || id.includes("free"); }

function App() {
  const [messages, setMessages] = useState<Message[]>([welcome]);
  const [input, setInput] = useState("");
  const [apiKey, setApiKey] = useState(() => loadText("abhi-api-key"));
  const [baseUrl, setBaseUrl] = useState(() => loadText("abhi-base-url", "https://openrouter.ai/api/v1"));
  const [model, setModel] = useState(() => loadText("abhi-model", "openrouter/free"));
  const [keyDraft, setKeyDraft] = useState("");
  const [baseDraft, setBaseDraft] = useState("");
  const [modelDraft, setModelDraft] = useState("");
  const [models, setModels] = useState<ModelItem[]>([]);
  const [favorites, setFavorites] = useState<string[]>(() => { try { const v = JSON.parse(localStorage.getItem("abhi-model-favorites") || "[]"); return Array.isArray(v) ? v : []; } catch { return []; } });
  const [modelQuery, setModelQuery] = useState("");
  const [freeOnly, setFreeOnly] = useState(false);
  const [loadingModels, setLoadingModels] = useState(false);
  const [modelPickerOpen, setModelPickerOpen] = useState(false);
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showNav, setShowNav] = useState(false);
  const [memory, setMemory] = useState<string[]>(loadMemory);
  const recognition = useRef<any>(null);
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(() => { try { localStorage.setItem("abhi-memory", JSON.stringify(memory.slice(-20))); } catch {} }, [memory]);
  useEffect(() => { try { localStorage.setItem("abhi-model-favorites", JSON.stringify(favorites)); } catch {} }, [favorites]);
  useEffect(() => { bottom.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, busy]);

  const status = useMemo(() => busy ? "Thinking…" : listening ? "Listening…" : "Online", [busy, listening]);
  const canSend = input.trim().length > 0 && !busy;
  const filteredModels = useMemo(() => models.filter((m) => { const q = modelQuery.toLowerCase().trim(); const hay = `${m.id} ${m.name || ""}`.toLowerCase(); return (!q || hay.includes(q)) && (!freeOnly || isFreeModel(m.id)); }).sort((a,b) => Number(favorites.includes(b.id)) - Number(favorites.includes(a.id)) || a.id.localeCompare(b.id)).slice(0, 100), [models, modelQuery, freeOnly, favorites]);

  async function loadModels() {
    if (!apiKey || !isOpenRouterKey(apiKey)) return;
    setLoadingModels(true);
    try {
      const res = await fetch("https://openrouter.ai/api/v1/models", { headers: { Authorization: `Bearer ${apiKey}` } });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || "Could not load OpenRouter models.");
      setModels(Array.isArray(data?.data) ? data.data : []);
    } catch (e) {
      setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "assistant", content: `Model catalog failed.\n\n${e instanceof Error ? e.message : "Unknown error"}` }]);
    } finally { setLoadingModels(false); }
  }

  useEffect(() => { if (apiKey && isOpenRouterKey(apiKey)) loadModels(); }, [apiKey]);

  function openSettings() { setKeyDraft(""); setBaseDraft(baseUrl); setModelDraft(model); setModelQuery(""); setShowSettings(true); if (apiKey && isOpenRouterKey(apiKey)) loadModels(); }

  function selectModel(id: string) {
    setModel(id);
    localStorage.setItem("abhi-model", id);
    setModelDraft(id);
    setModelPickerOpen(false);
    setShowSettings(false);
    setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "assistant", content: `Model switched to **${id}**.` }]);
  }

  function saveSettings() {
    const nextKey = keyDraft.trim();
    let nextBase = normalizeBaseUrl(baseDraft || baseUrl);
    let nextModel = (modelDraft || model).trim();
    if (nextKey && isOpenRouterKey(nextKey)) { nextBase = "https://openrouter.ai/api/v1"; if (!nextModel || nextModel === "stealth/ox-alpha" || nextModel === "openrouter/owl-alpha:free") nextModel = "openrouter/free"; }
    if (nextKey) { localStorage.setItem("abhi-api-key", nextKey); setApiKey(nextKey); }
    localStorage.setItem("abhi-base-url", nextBase); localStorage.setItem("abhi-model", nextModel);
    setBaseUrl(nextBase); setModel(nextModel); setBaseDraft(nextBase); setModelDraft(nextModel); setKeyDraft(""); setShowSettings(false);
  }

  function toggleFavorite(id: string) { setFavorites((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]); }
  function clearKey() { localStorage.removeItem("abhi-api-key"); setApiKey(""); setKeyDraft(""); setModels([]); }
  function speak(text: string) { if (!("speechSynthesis" in window)) return; window.speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text.replace(/[*_`#]/g, "")); u.rate = 1; u.pitch = 1; u.onstart = () => setSpeaking(true); u.onend = () => setSpeaking(false); window.speechSynthesis.speak(u); }
  function stopSpeaking() { window.speechSynthesis?.cancel(); setSpeaking(false); }
  function startVoice() { const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition; if (!SR) { setInput("Voice input isn't supported in this browser. Use Chrome on Android."); return; } if (listening) { recognition.current?.stop(); setListening(false); return; } const r = new SR(); recognition.current = r; r.lang = "en-IN"; r.interimResults = true; r.continuous = false; r.onstart = () => setListening(true); r.onresult = (e: any) => setInput(Array.from(e.results).map((x: any) => x[0]?.transcript || "").join("")); r.onerror = () => setListening(false); r.onend = () => setListening(false); r.start(); }

  async function callModel(prompt: string, history: Message[]) {
    if (!apiKey) throw new Error("Add your AI API key in Settings first.");
    const endpoint = `${normalizeBaseUrl(baseUrl)}/chat/completions`;
    const payload = { model, messages: history.filter((m) => m.id !== "welcome").map((m) => ({ role: m.role, content: m.content })).concat({ role: "user", content: prompt }), stream: false };
    const res = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` }, body: JSON.stringify(payload) }).catch(() => null);
    if (!res) throw new Error(`Could not reach ${normalizeBaseUrl(baseUrl)}. The provider may block browser requests (CORS), or the URL may be incorrect.`);
    const raw = await res.text(); let data: any = {}; try { data = raw ? JSON.parse(raw) : {}; } catch {}
    if (!res.ok) { const detail = typeof data?.error === "string" ? data.error : data?.error?.message || raw.slice(0, 1000); throw new Error(`Gateway ${res.status}: ${detail || "request rejected"}`); }
    const text = extractText(data); if (!text) throw new Error("The provider returned no assistant text. Check the selected model and provider support."); return text;
  }

  async function testConnection() { if (!apiKey) { setShowSettings(true); return; } setTesting(true); try { const text = await callModel("Reply with exactly: ABHI CONNECTED", []); setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "assistant", content: text }]); } catch (e) { setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "assistant", content: `Connection test failed.\n\n${e instanceof Error ? e.message : "Unknown provider error"}` }]); } finally { setTesting(false); } }

  async function send(text = input) { const prompt = text.trim(); if (!prompt || busy) return; setInput(""); setBusy(true); const user: Message = { id: crypto.randomUUID(), role: "user", content: prompt }; const assistantId = crypto.randomUUID(); setMessages([...messages, user, { id: assistantId, role: "assistant", content: "" }]); try { const answer = await callModel(prompt, messages); setMessages((prev) => prev.map((m) => m.id === assistantId ? { ...m, content: answer } : m)); speak(answer); } catch (e) { setMessages((prev) => prev.map((m) => m.id === assistantId ? { ...m, content: `I’m ready, but the model connection needs attention.\n\n${e instanceof Error ? e.message : "AI connection unavailable."}` } : m)); } finally { setBusy(false); } }

  function newChat() { setMessages([welcome]); setInput(""); }
  function remember() { const last = [...messages].reverse().find((m) => m.role === "user"); if (last) setMemory((prev) => [...prev, last.content.slice(0, 180)].slice(-20)); }

  const picker = <div className="model-picker-wrap"><button className="model-picker-button" onClick={() => { setModelPickerOpen((v) => !v); if (!models.length && apiKey && isOpenRouterKey(apiKey)) loadModels(); }}><div><span>MODEL</span><b>{model}</b></div><ChevronDown size={16}/></button>{modelPickerOpen && <div className="model-picker"><div className="model-picker-tools"><div className="model-search"><Search size={15}/><input value={modelQuery} onChange={(e) => setModelQuery(e.target.value)} placeholder="Search OpenRouter models…"/></div><button onClick={() => setFreeOnly((v) => !v)} className={freeOnly ? "active-filter" : ""}>Free</button><button onClick={loadModels} disabled={loadingModels}>{loadingModels ? <RefreshCw className="spin" size={15}/> : <RefreshCw size={15}/>}</button></div><div className="model-list">{filteredModels.length ? filteredModels.map((m) => <div className={`model-option ${m.id === model ? "selected" : ""}`} key={m.id} onClick={() => selectModel(m.id)}><button className="star-btn" onClick={(e) => { e.stopPropagation(); toggleFavorite(m.id); }}><Star size={14} fill={favorites.includes(m.id) ? "currentColor" : "none"}/></button><div className="model-info"><b>{m.name || m.id}</b><small>{m.id}{m.context_length ? ` · ${(m.context_length / 1000).toFixed(0)}K ctx` : ""}</small></div>{m.id === model && <Check size={15}/>}</div>) : <div className="empty-models">{apiKey && isOpenRouterKey(apiKey) ? "No models match. Try another search." : "Save an OpenRouter key to load models."}</div>}</div></div>}</div>;

  return <div className="app">
    <aside className={`sidebar ${showNav ? "open" : ""}`}>
      <div className="brand"><div className="logo"><Sparkles size={18}/></div><div><b>ABHI</b><span>PERSONAL AI</span></div><button className="mobile-x" onClick={() => setShowNav(false)}><X size={18}/></button></div>
      <button className="new-chat" onClick={newChat}><Plus size={17}/> New chat</button>
      <div className="nav-group"><span>WORKSPACE</span><button className="active"><Bot size={17}/> Assistant</button><button onClick={openSettings}><Brain size={17}/> Memory <em>{memory.length}</em></button><button onClick={openSettings}><Folder size={17}/> Files</button></div>
      <div className="sidebar-bottom"><button onClick={openSettings}><Settings size={17}/> Settings</button><div className="model-chip"><i/><span><b>{model}</b><small>{apiKey ? "API ready" : "Add API key"}</small></span></div></div>
    </aside>
    {showNav && <div className="backdrop" onClick={() => setShowNav(false)}/>} 
    <main className="main">
      <header className="topbar"><button className="menu" onClick={() => setShowNav(true)}><Sparkles size={20}/></button><div className="top-title"><b>ABHI</b><span><Wifi size={11}/> {status.toUpperCase()}</span></div><div className="top-actions"><button onClick={newChat}><Plus size={18}/></button>{picker}<button onClick={openSettings}><Settings size={18}/></button></div></header>
      <section className="chat"><div className="hero"><div className="hero-orb"><Sparkles size={30}/></div><div><small>YOUR PERSONAL AI</small><h1>What are we building today?</h1><p>Pick a model, chat, and speak with it.</p></div></div><div className="messages">{messages.map((m) => <article className={`message ${m.role}`} key={m.id}><div className="avatar">{m.role === "assistant" ? <Sparkles size={16}/> : "A"}</div><div className="bubble"><div className="meta"><b>{m.role === "assistant" ? "ABHI" : "YOU"}</b><span>{m.role === "assistant" && speaking ? <Volume2 size={13}/> : ""}</span></div><p>{m.content || (busy ? "Thinking…" : "")}</p>{m.role === "assistant" && m.content && m.id !== "welcome" && <div className="msg-actions"><button onClick={() => speak(m.content)}><Volume2 size={13}/> Speak</button><button onClick={remember}><Brain size={13}/> Remember</button></div>}</div></article>)}</div><div ref={bottom}/><div className="composer-wrap"><div className="composer"><textarea value={input} onChange={(e)=>setInput(e.target.value)} onKeyDown={(e)=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send();}}} placeholder={`Message ${model}…`} rows={1}/><button className={`icon-btn voice ${listening ? "on" : ""}`} onClick={startVoice}>{listening?<MicOff size={18}/>:<Mic size={18}/>}</button><button className="send" disabled={!canSend} onClick={()=>send()}><Send size={17}/></button></div><div className="composer-note"><span>Enter to send · Shift+Enter for new line</span><span><i/> {model}</span></div></div></section>
    </main>
    {showSettings && <div className="modal-layer"><div className="modal"><div className="modal-head"><div><small>CONTROL CENTER</small><h2>ABHI settings</h2></div><button onClick={()=>setShowSettings(false)}><X size={18}/></button></div><div className="settings-card"><div className="setting-row api-row"><div><b><KeyRound size={14}/> Personal AI API Key</b><small>{apiKey?"Saved on this device":"Paste your OpenRouter key"}</small></div><span className="ok">LOCAL</span></div><input className="api-input" type="password" value={keyDraft} onChange={e=>setKeyDraft(e.target.value)} placeholder={apiKey?"••••••••••••••••":"sk-or-v1-…"} autoComplete="off"/><div className="key-actions"><button className="save-key" onClick={saveSettings}>{apiKey?"Update settings":"Save settings"}</button>{apiKey&&<button className="mini" onClick={clearKey}>Remove key</button>}</div><div className="setting-row"><div><b>OpenRouter model selector</b><small>Live catalog · search · favorites · free filter</small></div><button className="mini" onClick={loadModels}>{loadingModels?"Loading…":"Refresh models"}</button></div>{picker}<div className="setting-row"><div><b>API Base URL</b><small>OpenRouter OpenAI-compatible endpoint</small></div></div><input className="api-input" value={baseDraft} onChange={e=>setBaseDraft(e.target.value)} placeholder="https://openrouter.ai/api/v1"/><div className="key-actions"><button className="save-key" disabled={testing} onClick={testConnection}>{testing?"Testing…":"Test connection"}</button><button className="mini" onClick={()=>setShowSettings(false)}>Done</button></div><div className="setting-row"><div><b>Voice mode</b><small>Browser speech input + device voice output</small></div><span className="ok">READY</span></div><div className="setting-row"><div><b>Memory</b><small>Local device memory: {memory.length} saved notes</small></div><button className="mini" onClick={()=>{localStorage.removeItem("abhi-memory");setMemory([]);}}>Clear</button></div></div><div className="modal-foot"><p>API key stays on this device in this personal-use build.</p></div></div></div>}
    {speaking && <button className="stop-speech" onClick={stopSpeaking}><VolumeX size={16}/> Stop voice</button>}
  </div>;
}

export default App;
