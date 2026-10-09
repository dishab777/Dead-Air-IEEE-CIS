"use client";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Message = { role: "user" | "assistant"; content: string };
type TeamHint = { id: string; text: string; level: string; issued_at: string };
type TeamProgress = { status?: string; answer?: string; winner?: boolean; hints?: TeamHint[]; hints_used?: number };
type Team = { id: string; team_name: string; progress_status: TeamProgress | unknown };

type Document = {
  id: string;
  type: "case" | "hint";
  title: string;
  description: string;
  sort_order: number;
  unlocked: boolean;
  url: string | null;
  body?: string; // dry-run inline text
};

// ── Inline text viewer (dry-run) ──────────────────────────────────────────────
function InlineViewer({ title, body, onClose }: { title: string; body: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={onClose}>
      <div
        className="relative w-full max-w-2xl max-h-[80vh] overflow-y-auto rounded-xl border border-white/15 bg-[#111315] p-6 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-4 right-4 text-white/40 hover:text-white text-xl leading-none">✕</button>
        <p className="eyebrow !text-[#ff5a62] mb-2">CASE DOCUMENT</p>
        <h3 className="serif text-2xl mb-4">{title}</h3>
        <pre className="whitespace-pre-wrap text-sm leading-7 text-white/75 font-mono">{body}</pre>
      </div>
    </div>
  );
}

// ── Case file card ─────────────────────────────────────────────────────────────
function CaseFileCard({ doc }: { doc: Document }) {
  const [open, setOpen] = useState(false);

  const handleOpen = () => {
    if (doc.url) { window.open(doc.url, "_blank", "noopener"); return; }
    if (doc.body) { setOpen(true); return; }
  };

  return (
    <>
      {open && doc.body && <InlineViewer title={doc.title} body={doc.body} onClose={() => setOpen(false)} />}
      <button
        onClick={handleOpen}
        className="w-full text-left rounded-lg border border-white/10 bg-[#0d0f11] hover:border-[#fa3b42]/50 hover:bg-[#141618] transition-all p-4 group"
      >
        <div className="flex items-start justify-between gap-2 mb-2">
          <span className="eyebrow !text-[#ff5a62] text-[9px]">CASE FILE · {doc.id.replace("case-", "0").toUpperCase()}</span>
          <span className="shrink-0 w-5 h-5 rounded-full border border-[#fa3b42]/60 flex items-center justify-center text-[10px] text-[#fa3b42] group-hover:bg-[#fa3b42]/10">↗</span>
        </div>
        <p className="text-sm font-semibold text-[#f4f0e5] leading-5">{doc.title}</p>
        <p className="text-[11px] text-white/45 mt-1 leading-5">{doc.description}</p>
      </button>
    </>
  );
}

// ── Hint file card with passcode gate ─────────────────────────────────────────
function HintFileCard({ doc, onUnlocked }: { doc: Document; onUnlocked: (updated: Document) => void }) {
  const [passcode, setPasscode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [open, setOpen] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!passcode.trim() || busy) return;
    setBusy(true); setErr("");
    try {
      const r = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId: doc.id, passcode: passcode.trim() }),
      });
      const data = await r.json();
      if (!r.ok) { setErr(data.error ?? "Incorrect passcode."); return; }
      onUnlocked({ ...doc, unlocked: true, url: data.url ?? doc.url, body: data.body ?? doc.body });
    } catch { setErr("Could not verify passcode."); }
    finally { setBusy(false); }
  };

  if (doc.unlocked) {
    const handleOpen = () => {
      if (doc.url) { window.open(doc.url, "_blank", "noopener"); return; }
      if (doc.body) { setOpen(true); return; }
    };
    return (
      <>
        {open && doc.body && <InlineViewer title={doc.title} body={doc.body} onClose={() => setOpen(false)} />}
        <button
          onClick={handleOpen}
          className="w-full text-left rounded-lg border border-[#c6f36b]/30 bg-[#0d0f11] hover:border-[#c6f36b]/60 hover:bg-[#141618] transition-all p-4 group"
        >
          <div className="flex items-start justify-between gap-2 mb-2">
            <span className="eyebrow !text-[#c6f36b] text-[9px]">HINT · UNLOCKED</span>
            <span className="shrink-0 w-5 h-5 rounded-full border border-[#c6f36b]/60 flex items-center justify-center text-[10px] text-[#c6f36b] group-hover:bg-[#c6f36b]/10">↗</span>
          </div>
          <p className="text-sm font-semibold text-[#f4f0e5] leading-5">{doc.title}</p>
          <p className="text-[11px] text-white/45 mt-1 leading-5">{doc.description}</p>
        </button>
      </>
    );
  }

  return (
    <div className="rounded-lg border border-white/10 bg-[#0d0f11] p-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="eyebrow !text-white/40 text-[9px]">HINT · LOCKED</span>
        <span className="text-white/25 text-xs">🔒</span>
      </div>
      <p className="text-sm font-semibold text-white/50 leading-5 mb-3">{doc.title}</p>
      <form onSubmit={submit} className="flex gap-2">
        <input
          value={passcode}
          onChange={e => { setPasscode(e.target.value.toUpperCase()); setErr(""); }}
          placeholder="Enter passcode"
          maxLength={20}
          className="field !bg-[#090b0d] !border-white/15 flex-1 px-3 py-2 text-xs uppercase tracking-widest placeholder:normal-case placeholder:tracking-normal"
        />
        <button
          type="submit"
          disabled={busy || !passcode.trim()}
          className="rounded-lg bg-[#e63c43] text-white px-3 py-2 text-xs font-bold disabled:opacity-40 shrink-0"
        >
          {busy ? "…" : "Unlock"}
        </button>
      </form>
      {err && <p className="mt-2 text-[11px] text-[#ff9270]">{err}</p>}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function TeamPage() {
  const [team, setTeam] = useState<Team | null>(null);
  const [messages, setMessages] = useState<Message[]>([{ role: "assistant", content: "I'm Echo. Tell me what your team has found, and I'll help you connect the evidence." }]);
  const [input, setInput] = useState("");
  const [answer, setAnswer] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [caseFileDocs, setCaseFileDocs] = useState<Document[]>([]);
  const [hintDocs, setHintDocs] = useState<Document[]>([]);
  const bottom = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Poll team session
  useEffect(() => {
    let active = true;
    const refresh = async () => {
      try {
        const r = await fetch("/api/me", { cache: "no-store" });
        if (!r.ok) { if (active) router.replace("/login"); return; }
        const data = await r.json();
        if (!active) return;
        setTeam(data.team);
        const progress = data.team.progress_status;
        if (progress && typeof progress === "object") {
          setSubmitted(Boolean(progress.answer));
          if (typeof progress.answer === "string") setAnswer(progress.answer);
        }
      } catch { if (active) router.replace("/login"); }
    };
    void refresh();
    const interval = window.setInterval(refresh, 3000);
    return () => { active = false; window.clearInterval(interval); };
  }, [router]);

  // Load documents once
  const loadDocuments = useCallback(async () => {
    try {
      const [caseRes, hintRes] = await Promise.all([
        fetch("/api/documents?type=case", { cache: "no-store" }),
        fetch("/api/documents?type=hint", { cache: "no-store" }),
      ]);
      if (caseRes.ok) { const d = await caseRes.json(); setCaseFileDocs(d.documents ?? []); }
      if (hintRes.ok) { const d = await hintRes.json(); setHintDocs(d.documents ?? []); }
    } catch { /* non-critical */ }
  }, []);

  useEffect(() => { void loadDocuments(); }, [loadDocuments]);

  useEffect(() => { bottom.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  async function send(e?: FormEvent, preset?: string) {
    e?.preventDefault();
    const text = (preset ?? input).trim(); if (!text || busy) return;
    const next = [...messages, { role: "user" as const, content: text }];
    setMessages([...next, { role: "assistant", content: "" }]);
    setInput(""); setBusy(true); setError("");
    try {
      const r = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: next }) });
      if (!r.ok) { const data = await r.json(); throw new Error(data.error); }
      if (!r.body) throw new Error("Echo returned an empty response.");
      const reader = r.body.getReader(); const decoder = new TextDecoder(); let buffer = ""; let reply = "";
      while (true) {
        const { done, value } = await reader.read(); if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split("\n\n"); buffer = events.pop() || "";
        for (const event of events) {
          const line = event.split("\n").find(x => x.startsWith("data: ")); if (!line) continue;
          const data = line.slice(6); if (data === "[DONE]") continue;
          try { const parsed = JSON.parse(data); const token = parsed.choices?.[0]?.delta?.content || ""; if (token) { reply += token; setMessages([...next, { role: "assistant", content: reply }]); } } catch { }
        }
      }
    } catch (e) { setError(e instanceof Error ? e.message : "Echo is unavailable."); setMessages(next); } finally { setBusy(false); }
  }

  async function submitAnswer(e: FormEvent) {
    e.preventDefault(); setError("");
    if (answer.trim().length < 20) { setError("Add a little more detail to your theory before submitting."); return; }
    setBusy(true);
    try {
      const r = await fetch("/api/submit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ answer }) });
      const data = await r.json(); if (!r.ok) throw new Error(data.error); setSubmitted(true);
    } catch (e) { setError(e instanceof Error ? e.message : "Could not submit your theory."); } finally { setBusy(false); }
  }

  async function logout() { await fetch("/api/logout", { method: "POST" }); router.replace("/login"); }

  if (!team) return <main className="min-h-screen grid place-items-center text-sm text-[#87918d]">Connecting to the recovery desk…</main>;

  const progress = team.progress_status && typeof team.progress_status === "object" ? team.progress_status as TeamProgress : {};
  const teamHints = Array.isArray(progress.hints) ? progress.hints : [];

  return (
    <main className="min-h-screen bg-[#090b0d] text-[#f4f0e5]">
      {/* Header */}
      <header className="h-[68px] border-b border-white/10 px-4 md:px-8 flex items-center justify-between bg-black/30">
        <div className="flex items-center gap-3">
          <span className="w-8 h-8 rounded-full border border-[#fa3b42]/70 flex items-center justify-center text-[#fa3b42] serif">M</span>
          <span className="font-semibold tracking-wider text-sm">MERIDIAN <span className="text-white/35">/ ECHO LINE</span></span>
        </div>
        <div className="flex items-center gap-4">
          <span className="hidden sm:block text-xs text-white/55">{team.team_name}</span>
          <span className="flex items-center gap-2 eyebrow"><i className="w-1.5 h-1.5 rounded-full bg-[#fa3b42]" /> SIGNAL ACTIVE</span>
          <button onClick={logout} className="text-xs text-white/50 hover:text-white">Exit</button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-3 md:p-7 grid xl:grid-cols-[.72fr_1.28fr] gap-4 md:gap-6 min-h-[calc(100vh-68px)]">
        {/* ── Left column ── */}
        <aside className="flex flex-col gap-4">
          {/* Brief */}
          <section className="panel !bg-[#111315] !border-white/10 overflow-hidden">
            <div className="relative h-48">
              <img src="/event-poster.png" alt="Dead Air event poster" className="absolute inset-0 w-full h-full object-cover object-[50%_28%] opacity-55" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#111315] via-black/20 to-black/10" />
              <div className="absolute bottom-4 left-5">
                <p className="eyebrow !text-[#ff5a62]">LHC214 · 10 October 2026</p>
                <h1 className="serif uppercase text-5xl font-black">Dead Air</h1>
              </div>
            </div>
            <div className="p-5">
              <p className="eyebrow !text-[#ff5a62] mb-3">Your assignment · Incident 02:13</p>
              <p className="serif text-xl leading-7">A radio host vanished when the broadcast went silent. The signal may still be moving.</p>
              <p className="text-sm text-white/55 leading-6 mt-4">Investigate the physical game. Bring your observations to Echo, build a theory together, then submit your final answer here.</p>
            </div>
          </section>

          {/* ── Case Files ── */}
          <section className="panel !bg-[#111315] !border-white/10 p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="eyebrow !text-[#ff5a62]">Case Files</p>
              <span className="text-[10px] uppercase tracking-widest text-white/40">{caseFileDocs.length} documents</span>
            </div>
            {caseFileDocs.length === 0 ? (
              <p className="text-sm text-white/40">Loading evidence…</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {caseFileDocs.map(doc => <CaseFileCard key={doc.id} doc={doc} />)}
              </div>
            )}
          </section>

          {/* ── Hint Files ── */}
          <section className="panel !bg-[#111315] !border-white/10 p-5">
            <div className="flex items-center justify-between mb-1">
              <p className="eyebrow !text-[#ff5a62]">Hint Files</p>
              <span className="text-[10px] uppercase tracking-widest text-white/40">
                {hintDocs.filter(d => d.unlocked).length}/{hintDocs.length} unlocked
              </span>
            </div>
            <p className="text-[11px] text-white/40 mb-4 leading-5">Each hint file requires a passcode. Once unlocked, it stays accessible for your entire team.</p>
            {hintDocs.length === 0 ? (
              <p className="text-sm text-white/40">Loading hint files…</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {hintDocs.map(doc => (
                  <HintFileCard
                    key={doc.id}
                    doc={doc}
                    onUnlocked={updated => setHintDocs(prev => prev.map(d => d.id === updated.id ? updated : d))}
                  />
                ))}
              </div>
            )}
          </section>

          {/* Team progress */}
          <section className="panel !bg-[#111315] !border-white/10 p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="eyebrow">Team progress</p>
              <span className="text-[10px] uppercase tracking-widest text-[#ff6970]">{submitted ? "Submitted" : "In the field"}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className={`w-2 h-2 rounded-full ${submitted ? "bg-[#c6f36b]" : "bg-[#fa3b42] animate-pulse"}`} />
              <p className="text-sm text-white/75">{submitted ? "Your theory is with event operations." : "Your team is actively investigating."}</p>
            </div>
          </section>

          {/* Marshal hints */}
          <section className="panel !bg-[#111315] !border-white/10 p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="eyebrow !text-[#ff5a62]">Marshal hints</p>
              <span className="text-[10px] uppercase tracking-widest text-white/40">{teamHints.length} received</span>
            </div>
            {teamHints.length === 0
              ? <p className="text-sm text-white/45 leading-6">No field hint has been issued yet. Keep investigating; your marshal can send a hint here if your team needs one.</p>
              : <div className="space-y-3">{teamHints.slice().reverse().map(hint => (
                <article key={hint.id} className="border-l-2 border-[#f0444c] pl-3 py-1">
                  <div className="flex items-center justify-between gap-3">
                    <p className="eyebrow !text-[#ff6970]">{hint.level || "Marshal hint"}</p>
                    <time className="text-[10px] text-white/35">{new Date(hint.issued_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</time>
                  </div>
                  <p className="mt-1 text-sm leading-6 text-white/80">{hint.text}</p>
                </article>
              ))}</div>
            }
          </section>

          {/* Final theory */}
          <section className="panel !bg-[#111315] !border-white/10 p-5">
            <p className="eyebrow !text-[#ff5a62] mb-3">Final theory</p>
            {submitted ? (
              <>
                <p className="text-sm text-white/70 leading-6">Submission received. Your event organizer will review it and update the live standings.</p>
                <p className="mt-3 text-xs text-white/40">{answer}</p>
              </>
            ) : (
              <form onSubmit={submitAnswer} className="space-y-3">
                <textarea value={answer} onChange={e => setAnswer(e.target.value)} placeholder="What happened at Meridian? Explain the sequence and the evidence behind your theory…" rows={5} className="field !bg-[#090b0d] !border-white/15 w-full p-3 text-sm leading-6 resize-y" />
                <button disabled={busy} className="w-full rounded-lg bg-[#e63c43] text-white font-bold py-3 text-sm disabled:opacity-50">Submit final theory ↗</button>
              </form>
            )}
          </section>
        </aside>

        {/* ── Echo chat ── */}
        <section className="panel !bg-[#111315] !border-white/10 flex flex-col min-h-[620px] max-h-[calc(100vh-116px)] overflow-hidden">
          <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
            <div>
              <p className="eyebrow !text-[#ff5a62] mb-1">Your investigative partner</p>
              <h2 className="serif text-3xl">Echo</h2>
            </div>
            <span className="flex gap-2 items-center text-[10px] uppercase tracking-widest text-white/45"><i className="w-1.5 h-1.5 rounded-full bg-[#fa3b42]" /> Listening</span>
          </div>
          <div className="px-5 py-3 border-b border-white/10 text-xs text-white/45">Ask questions, test a timeline, or request a hint. Echo will help you reason without giving away the answer.</div>
          <div className="border-b border-white/10 px-3 py-2 flex items-center gap-2 overflow-x-auto">
            <span className="eyebrow !text-[#ff6970] shrink-0">Quick hints</span>
            {["What happened at 02:13:47?", "Where did Adrian go?", "Explain the Ghost Carrier", "What is Room Zero?"].map(prompt => (
              <button key={prompt} type="button" disabled={busy} onClick={() => void send(undefined, prompt)} className="shrink-0 rounded-md border border-white/10 bg-[#202224] px-2.5 py-1.5 text-[10px] text-white/65 hover:text-white disabled:opacity-40">{prompt}</button>
            ))}
          </div>
          <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[88%] rounded-xl px-4 py-3 text-sm leading-6 ${m.role === "user" ? "bg-[#e9e4d7] text-[#171717]" : "bg-[#202224] text-[#dedbd2] border border-white/10"}`}>
                  <span className={`block eyebrow !text-[9px] mb-1 ${m.role === "user" ? "!text-black/45" : "!text-[#fa646a]"}`}>{m.role === "user" ? team.team_name : "Echo"}</span>
                  {m.content || <span className="animate-pulse">…</span>}
                </div>
              </div>
            ))}
            {busy && <p className="text-xs text-white/40 animate-pulse">Echo is tracing the signal…</p>}
            <div ref={bottom} />
          </div>
          {error && <p role="alert" className="px-4 pb-2 text-xs text-[#ff9270]">{error}</p>}
          <form onSubmit={send} className="border-t border-white/10 p-3 md:p-4 flex gap-2">
            <input value={input} onChange={e => setInput(e.target.value)} placeholder="Tell Echo what your team noticed…" className="field !bg-[#090b0d] !border-white/15 min-w-0 flex-1 px-4 py-3 text-sm" />
            <button disabled={busy || !input.trim()} aria-label="Send message" className="bg-[#e63c43] text-white w-12 rounded-lg text-lg disabled:opacity-40">↗</button>
          </form>
          <p className="px-4 pb-3 text-center text-[9px] uppercase tracking-[.15em] text-white/30">Field notes remain with your team. Echo is here to help you reason.</p>
        </section>
      </div>
    </main>
  );
}
