import { useState } from "react";
import { Link2, FileText, ShieldCheck, ShieldAlert, ShieldX, ArrowRight, Loader2, Shield } from "lucide-react";

const TONES = {
  safe: { grad: ["#34D399", "#22D3EE"], text: "text-emerald-400", icon: ShieldCheck },
  warn: { grad: ["#FBBF24", "#FB923C"], text: "text-amber-400", icon: ShieldAlert },
  danger: { grad: ["#F87171", "#DC2626"], text: "text-rose-400", icon: ShieldX },
};

const verdictToTone = (verdict) => {
  if (verdict === "Likely genuine") return "safe";
  if (verdict === "Use caution") return "warn";
  return "danger";
};

const API_URL = "http://localhost:8000/analyze";

function Gauge({ score, tone }) {
  const { grad } = TONES[tone];
  const r = 80;
  const circumference = Math.PI * r;
  const offset = circumference - (score / 100) * circumference;
  return (
    <div className="relative w-56 h-32 mx-auto">
      <svg viewBox="0 0 200 110" className="w-full h-full">
        <defs>
          <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={grad[0]} />
            <stop offset="100%" stopColor={grad[1]} />
          </linearGradient>
        </defs>
        <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="#1E2436" strokeWidth="14" strokeLinecap="round" />
        <path
          d="M 20 100 A 80 80 0 0 1 180 100"
          fill="none"
          stroke="url(#gaugeGrad)"
          strokeWidth="14"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 1s cubic-bezier(0.16, 1, 0.3, 1)", filter: "drop-shadow(0 0 8px rgba(34,211,238,0.4))" }}
        />
      </svg>
      <div className="absolute inset-x-0 bottom-0 flex flex-col items-center">
        <span className="font-mono text-4xl font-bold text-white">{score}</span>
        <span className="text-xs text-slate-500 tracking-widest">TRUST SCORE</span>
      </div>
    </div>
  );
}

export default function TrustHire() {
  const [mode, setMode] = useState("url");
  const [urlInput, setUrlInput] = useState("");
  const [textInput, setTextInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const analyze = async () => {
    const input = mode === "url" ? urlInput : textInput;
    if (!input.trim()) return;
    setResult(null);
    setError(null);

    if (mode === "text" && /^https?:\/\//i.test(input.trim())) {
      setError("That looks like a URL. Switch to the URL tab, or paste the actual job description text here.");
      return;
    }
    if (mode === "text" && input.trim().length < 40) {
      setError("That's too short to analyze. Paste the full job description, not just a fragment.");
      return;
    }
    if (mode === "url") {
      try {
        new URL(input.trim());
      } catch {
        setError("That doesn't look like a valid URL. Make sure it starts with http:// or https://");
        return;
      }
    }

    setLoading(true);

    try {
      const body = mode === "url" ? { url: input } : { text: input };
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (data.error) {
        setError(data.error);
      } else {
        setResult({
          score: data.trust_score,
          verdict: data.verdict,
          tone: verdictToTone(data.verdict),
          signals: data.signals || [],
          source: data.source,
        });
      }
    } catch (e) {
      setError("Could not reach the backend. Is the server running?");
    } finally {
      setLoading(false);
    }
  };

  const tone = result ? TONES[result.tone] : null;
  const Icon = tone?.icon;

  return (
    <div className="min-h-screen w-full bg-[#05070D] relative overflow-hidden flex flex-col items-center px-6 py-20">
      <div
        className="absolute top-[-200px] left-1/2 -translate-x-1/2 w-[700px] h-[500px] rounded-full opacity-40 blur-[100px] pointer-events-none"
        style={{ background: "radial-gradient(circle, #2563EB 0%, transparent 70%)" }}
      />
      <div
        className="absolute top-[100px] left-1/2 -translate-x-[65%] w-[400px] h-[400px] rounded-full opacity-30 blur-[90px] pointer-events-none"
        style={{ background: "radial-gradient(circle, #06B6D4 0%, transparent 70%)" }}
      />

      <div className="w-full max-w-xl relative z-10">
        <div className="flex flex-col items-center text-center mb-10">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 bg-white/5 backdrop-blur-sm mb-6">
            <Shield size={13} className="text-cyan-400" />
            <span className="text-xs font-medium text-slate-300 tracking-wide">AI-powered listing verification</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-semibold text-white mb-4 tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            Is this job real?
          </h1>
          <p className="text-slate-400 text-base max-w-sm">
            Submit a listing URL or description. TrustHire flags the patterns most job scams share.
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-xl p-6 shadow-2xl">
          <div className="flex gap-1 mb-4 bg-white/5 p-1 rounded-lg w-fit border border-white/5">
            <button
              onClick={() => setMode("url")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition ${
                mode === "url" ? "bg-white/10 text-white" : "text-slate-500"
              }`}
            >
              <Link2 size={15} /> URL
            </button>
            <button
              onClick={() => setMode("text")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition ${
                mode === "text" ? "bg-white/10 text-white" : "text-slate-500"
              }`}
            >
              <FileText size={15} /> Paste text
            </button>
          </div>

          {mode === "url" ? (
            <input
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") analyze(); }}
              placeholder="https://company.com/careers/job-listing"
              className="w-full border border-white/10 bg-white/[0.04] rounded-lg px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50"
            />
          ) : (
            <textarea
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="Paste the full job description here..."
              rows={5}
              className="w-full border border-white/10 bg-white/[0.04] rounded-lg px-4 py-3 text-sm text-white placeholder-slate-500 resize-none focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50"
            />
          )}

          <button
            onClick={analyze}
            disabled={loading || !(mode === "url" ? urlInput : textInput).trim()}
            className="mt-4 w-full flex items-center justify-center gap-2 text-white font-semibold py-3 rounded-lg transition disabled:opacity-30 hover:brightness-110"
            style={{ background: "linear-gradient(90deg,#2563EB,#06B6D4)", boxShadow: "0 0 24px rgba(37,99,235,0.35)" }}
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" /> Analyzing
              </>
            ) : (
              <>
                Check authenticity <ArrowRight size={16} />
              </>
            )}
          </button>
        </div>

        {error && (
          <div className="mt-6 rounded-2xl border border-rose-500/20 bg-rose-500/[0.05] backdrop-blur-xl p-4 text-sm text-rose-300 text-center">
            {error}
          </div>
        )}

        {result && (
          <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-xl p-6 shadow-2xl animate-[fadeIn_0.4s_ease]">
            <Gauge score={result.score} tone={result.tone} />
            <div className={`flex items-center justify-center gap-2 mt-2 mb-6 ${tone.text} font-semibold`}>
              <Icon size={18} />
              {result.verdict}
            </div>
            <div className="space-y-2.5">
              {result.signals.map((s, i) => (
                <div key={i} className="flex items-start gap-2.5 text-sm">
                  <span
                    className={`mt-0.5 w-4 h-4 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-bold ${
                      s.ok ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"
                    }`}
                  >
                    {s.ok ? "✓" : "!"}
                  </span>
                  <span className="text-slate-300">{s.text}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <p className="text-center text-xs text-slate-600 mt-8">
          {result?.source === "rule-based fallback (AI analysis unavailable)"
            ? "AI temporarily unavailable — showing rule-based analysis only."
            : "Live analysis powered by TrustHire's detection engine."}
        </p>
      </div>
    </div>
  );
}
