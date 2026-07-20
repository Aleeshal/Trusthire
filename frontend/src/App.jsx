import { useState, useEffect, useRef } from "react";

const TOKENS = {
  paper: "#F1ECDD",
  paperCard: "#FBF8EF",
  ink: "#211C13",
  inkMuted: "#746B58",
  line: "#CBC0A1",
  verified: "#2F6B4F",
  caution: "#A9762E",
  danger: "#A6392C",
};

const TONES = {
  safe: { ink: TOKENS.verified, label: "VERIFIED" },
  warn: { ink: TOKENS.caution, label: "USE CAUTION" },
  danger: { ink: TOKENS.danger, label: "LIKELY SCAM" },
  unclear: { ink: TOKENS.caution, label: "COULD NOT VERIFY" },
};

const verdictToTone = (verdict) => {
  if (verdict === "Likely genuine") return "safe";
  if (verdict === "Use caution") return "warn";
  if (verdict === "Could not verify") return "unclear";
  return "danger";
};

const RECOMMENDATIONS = {
  safe: "No significant red flags found. Standard care still applies — verify details directly with the company before sharing personal information.",
  warn: "Proceed carefully. Verify the recruiter and company independently, and never pay fees or share sensitive information before confirming legitimacy.",
  danger: "Multiple red flags found. Avoid sharing personal information or payment, and verify independently before proceeding.",
  unclear: "Not enough information was available to assess this listing. Try pasting the job description text directly for a fuller review.",
};

const API_URL = "http://localhost:8000/analyze";

const displayFont = "'Fraunces', serif";
const monoFont = "'IBM Plex Mono', monospace";
const bodyFont = "'IBM Plex Sans', sans-serif";

// Subtle paper grain - kept faint on purpose, texture not decoration.
const GRAIN_BG =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.045'/%3E%3C/svg%3E\")";

function StampFilter() {
  // One shared SVG filter that roughens edges - the ink-stamp texture.
  return (
    <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
      <filter id="inkRoughen">
        <feTurbulence type="fractalNoise" baseFrequency="0.012 0.09" numOctaves="2" seed="4" result="noise" />
        <feDisplacementMap in="SourceGraphic" in2="noise" scale="2.4" />
      </filter>
    </svg>
  );
}

function VerdictStamp({ tone }) {
  const { ink, label } = TONES[tone];
  return (
    <div
      className="absolute -top-4 right-4 sm:right-8 select-none"
      style={{
        transform: "rotate(-7deg)",
        filter: "url(#inkRoughen)",
        animation: "stampIn 0.55s cubic-bezier(0.34, 1.56, 0.64, 1) both",
      }}
    >
      <div
        className="px-4 py-2 rounded-sm"
        style={{
          border: `3px double ${ink}`,
          color: ink,
          fontFamily: displayFont,
          fontWeight: 600,
          fontSize: "1.05rem",
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          background: "rgba(251,248,239,0.4)",
        }}
      >
        {label}
      </div>
    </div>
  );
}

function useCountUp(target, duration = 700) {
  const [value, setValue] = useState(0);
  const raf = useRef(null);

  useEffect(() => {
    if (target === null || target === undefined) return;
    const start = performance.now();
    const from = 0;
    const tick = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(from + (target - from) * eased));
      if (progress < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [target, duration]);

  return value;
}

function TrustMeter({ score, tone }) {
  const { ink } = TONES[tone];
  const ticks = Array.from({ length: 11 }, (_, i) => i * 10);
  const displayScore = useCountUp(score);

  if (score === null || score === undefined) {
    return (
      <div className="mt-1">
        <div className="flex items-baseline justify-between mb-2">
          <span
            className="text-xs tracking-widest"
            style={{ fontFamily: monoFont, color: TOKENS.inkMuted, letterSpacing: "0.15em" }}
          >
            TRUST INDEX
          </span>
          <span style={{ fontFamily: monoFont, color: ink, fontWeight: 600, fontSize: "1.1rem" }}>
            N/A
          </span>
        </div>
        <div className="relative h-2.5 rounded-full" style={{ background: "#E4DCC4" }} />
      </div>
    );
  }

  return (
    <div className="mt-1">
      <div className="flex items-baseline justify-between mb-2">
        <span
          className="text-xs tracking-widest"
          style={{ fontFamily: monoFont, color: TOKENS.inkMuted, letterSpacing: "0.15em" }}
        >
          TRUST INDEX
        </span>
        <span style={{ fontFamily: monoFont, color: ink, fontWeight: 600, fontSize: "1.1rem" }}>
          {displayScore}
          <span style={{ color: TOKENS.inkMuted, fontWeight: 400 }}>/100</span>
        </span>
      </div>
      <div className="relative h-2.5 rounded-full" style={{ background: "#E4DCC4" }}>
        <div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{ width: `${displayScore}%`, background: ink, transition: "width 0.05s linear" }}
        />
      </div>
      <div className="flex justify-between mt-1">
        {ticks.map((t) => (
          <span key={t} className="w-px h-1.5" style={{ background: TOKENS.line }} />
        ))}
      </div>
    </div>
  );
}

function SignalMark({ ok }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" className="flex-shrink-0 mt-[3px]">
      {ok ? (
        <path
          d="M2 7.5 L5.5 11 L12 3"
          fill="none"
          stroke={TOKENS.verified}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : (
        <>
          <path d="M2.5 2.5 L11.5 11.5" stroke={TOKENS.danger} strokeWidth="2" strokeLinecap="round" />
          <path d="M11.5 2.5 L2.5 11.5" stroke={TOKENS.danger} strokeWidth="2" strokeLinecap="round" />
        </>
      )}
    </svg>
  );
}

export default function TrustHire() {

  const [theme, setTheme] = useState(() => {
    return localStorage.getItem("theme") || "light";
  });

  const [mode, setMode] = useState("url");
  const [urlInput, setUrlInput] = useState("");
  const [textInput, setTextInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  

  useEffect(() => {
  localStorage.setItem("theme", theme);
  }, [theme]);


  const toggleTheme = () => {
  setTheme(current => current === "light" ? "dark" : "light");
  };

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
      setError("That's too short to review. Paste the full job description, not just a fragment.");
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
          caseNumber: `${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`,
        });
      }
    } catch (e) {
      setError("Could not reach the backend. Is the server running?");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen w-full"
      style={{ background: TOKENS.paper, backgroundImage: GRAIN_BG }}
    >
      <StampFilter />

      <header
        className="w-full px-6 sm:px-10 py-5 flex items-center justify-between"
        style={{ borderBottom: `1px solid ${TOKENS.line}` }}
      >
      
      <div className="flex items-center gap-4">

     <button
      onClick={toggleTheme}
      style={{
      border: "none",
      background: "transparent",
      cursor: "pointer",
      fontSize: "18px"
      }}
  >
      {theme === "light" ? "🌙" : "☀️"}
      </button>

      <span
      className="text-[11px] hidden sm:inline"
      style={{
      fontFamily: monoFont,
      color: TOKENS.inkMuted,
      letterSpacing: "0.16em"
      }}
      >
      [ CASE FILE — LISTING REVIEW ]
      </span>

      </div>
      </header>

      <main className="w-full max-w-6xl mx-auto px-6 sm:px-10 py-16 sm:py-20 grid grid-cols-1 md:grid-cols-[0.75fr_1fr] gap-12 md:gap-16">
        <div className="md:sticky md:top-16 md:self-start">
          <h1
            className="text-4xl sm:text-5xl leading-[1.08] mb-5"
            style={{ fontFamily: displayFont, fontWeight: 600, color: TOKENS.ink }}
          >
            Before you apply,
            <br />
            get it verified.
          </h1>
          <p
            className="text-base leading-relaxed"
            style={{ fontFamily: bodyFont, color: TOKENS.inkMuted }}
          >
            Paste a job link or description. TrustHire checks it against known scam patterns before you apply.
          </p>
        </div>

        <div className="min-w-0">
          <div
            className="rounded-sm p-6"
            style={{ background: TOKENS.paperCard, border: `1px solid ${TOKENS.line}` }}
          >
            <div className="flex gap-6 mb-5" style={{ borderBottom: `1px solid ${TOKENS.line}` }}>
              {[
                { key: "url", label: "Link" },
                { key: "text", label: "Paste text" },
              ].map((t) => (
                <button
                  key={t.key}
                  onClick={() => setMode(t.key)}
                  className="pb-3 pr-1 text-sm transition-colors hover:opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                  style={{
                    fontFamily: monoFont,
                    letterSpacing: "0.04em",
                    color: mode === t.key ? TOKENS.ink : TOKENS.inkMuted,
                    fontWeight: mode === t.key ? 600 : 400,
                    borderBottom: mode === t.key ? `2px solid ${TOKENS.ink}` : "2px solid transparent",
                    marginBottom: "-1px",
                    outlineColor: TOKENS.ink,
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {mode === "url" ? (
              <input
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") analyze();
                }}
                placeholder="https://company.com/careers/job-listing"
                spellCheck="false"
                autoCorrect="off"
                autoCapitalize="off"
                className="w-full rounded-sm px-4 py-3.5 sm:py-3 text-sm transition-shadow focus:outline-none"
                style={{
                  fontFamily: bodyFont,
                  background: TOKENS.paper,
                  border: `1px solid ${TOKENS.line}`,
                  color: TOKENS.ink,
                }}
                onFocus={(e) => (e.target.style.borderColor = TOKENS.ink)}
                onBlur={(e) => (e.target.style.borderColor = TOKENS.line)}
              />
            ) : (
              <textarea
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Paste the full job description here..."
                rows={5}
                className="w-full rounded-sm px-4 py-3.5 sm:py-3 text-sm resize-none transition-shadow focus:outline-none"
                style={{
                  fontFamily: bodyFont,
                  background: TOKENS.paper,
                  border: `1px solid ${TOKENS.line}`,
                  color: TOKENS.ink,
                }}
                onFocus={(e) => (e.target.style.borderColor = TOKENS.ink)}
                onBlur={(e) => (e.target.style.borderColor = TOKENS.line)}
              />
            )}

            <button
              onClick={analyze}
              disabled={loading || !(mode === "url" ? urlInput : textInput).trim()}
              className="mt-5 sm:mt-4 w-full py-3.5 sm:py-3 rounded-sm transition-all hover:-translate-y-px disabled:hover:translate-y-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-40"
              style={{
                fontFamily: monoFont,
                fontWeight: 600,
                letterSpacing: "0.06em",
                background: TOKENS.ink,
                color: TOKENS.paperCard,
                outlineColor: TOKENS.ink,
              }}
            >
              {loading ? "REVIEWING…" : "RUN VERIFICATION →"}
            </button>

            <p
              className="text-center text-[13px] mt-5 sm:mt-4 leading-relaxed"
              style={{ fontFamily: monoFont, color: TOKENS.inkMuted }}
            >
              {result?.source === "rule-based fallback (AI analysis unavailable)"
                ? "AI review temporarily unavailable — showing rule-based findings only."
                : "Nothing you submit here is stored."}
            </p>
          </div>

          {error && (
            <div
              className="mt-6 rounded-sm p-4 text-sm"
              style={{
                fontFamily: bodyFont,
                border: `1px solid ${TOKENS.danger}`,
                color: TOKENS.danger,
                background: "rgba(166,57,44,0.06)",
              }}
            >
              {error}
            </div>
          )}

          {result && (
            <div
              className="relative mt-8 rounded-sm p-6 pt-10 overflow-visible"
              style={{ background: TOKENS.paperCard, border: `1px solid ${TOKENS.line}` }}
            >
              <div className="flex items-baseline justify-between mb-1">
                <span
                  className="text-xs"
                  style={{ fontFamily: monoFont, color: TOKENS.inkMuted, letterSpacing: "0.12em" }}
                >
                  CASE REPORT
                </span>
                <span
                  className="text-xs"
                  style={{ fontFamily: monoFont, color: TOKENS.inkMuted }}
                >
                  #{result.caseNumber}
                </span>
              </div>

              <VerdictStamp tone={result.tone} />

              <TrustMeter score={result.score} tone={result.tone} />

              <div className="mt-6 pt-5" style={{ borderTop: `1px dashed ${TOKENS.line}` }}>
                <div
                  className="text-xs mb-3"
                  style={{ fontFamily: monoFont, color: TOKENS.inkMuted, letterSpacing: "0.12em" }}
                >
                  FINDINGS
                </div>
                <div className="space-y-3">
                  {result.signals.map((s, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-2.5"
                      style={{ animation: `fadeInUp 0.4s ease-out ${i * 70}ms both` }}
                    >
                      <SignalMark ok={s.ok} />
                      <span className="text-sm leading-snug" style={{ fontFamily: bodyFont, color: TOKENS.ink }}>
                        {s.text}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-6 pt-5" style={{ borderTop: `1px dashed ${TOKENS.line}` }}>
                <div
                  className="text-xs mb-2"
                  style={{ fontFamily: monoFont, color: TOKENS.inkMuted, letterSpacing: "0.12em" }}
                >
                  RECOMMENDATION
                </div>
                <p className="text-sm leading-relaxed" style={{ fontFamily: bodyFont, color: TOKENS.ink }}>
                  {RECOMMENDATIONS[result.tone]}
                </p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
