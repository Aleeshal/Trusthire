import { useState } from "react";

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
      style={{ transform: "rotate(-7deg)", filter: "url(#inkRoughen)" }}
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

function TrustMeter({ score, tone }) {
  const { ink } = TONES[tone];
  const ticks = Array.from({ length: 11 }, (_, i) => i * 10);

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
          {score}
          <span style={{ color: TOKENS.inkMuted, fontWeight: 400 }}>/100</span>
        </span>
      </div>
      <div className="relative h-2.5 rounded-full" style={{ background: "#E4DCC4" }}>
        <div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{ width: `${score}%`, background: ink, transition: "width 0.8s cubic-bezier(0.16,1,0.3,1)" }}
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
      className="min-h-screen w-full flex flex-col items-center px-6 py-20"
      style={{ background: TOKENS.paper, backgroundImage: GRAIN_BG }}
    >
      <StampFilter />

      <div className="w-full max-w-xl relative z-10">
        <div className="flex items-center gap-3 mb-8">
          <span
            className="text-[11px]"
            style={{ fontFamily: monoFont, color: TOKENS.inkMuted, letterSpacing: "0.18em" }}
          >
            [ CASE FILE — LISTING REVIEW ]
          </span>
          <span className="flex-1 h-px" style={{ background: TOKENS.line }} />
        </div>

        <div className="mb-10">
          <h1
            className="text-4xl sm:text-[2.75rem] leading-[1.08] mb-4"
            style={{ fontFamily: displayFont, fontWeight: 600, color: TOKENS.ink }}
          >
            Before you apply,
            <br />
            get it verified.
          </h1>
          <p
            className="text-base max-w-md leading-relaxed"
            style={{ fontFamily: bodyFont, color: TOKENS.inkMuted }}
          >
            Paste a listing or its link. TrustHire cross-checks it against the patterns real scams leave behind — vague pay, no real company, requests for personal information up front.
          </p>
        </div>

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
                className="pb-3 text-sm transition"
                style={{
                  fontFamily: monoFont,
                  letterSpacing: "0.04em",
                  color: mode === t.key ? TOKENS.ink : TOKENS.inkMuted,
                  fontWeight: mode === t.key ? 600 : 400,
                  borderBottom: mode === t.key ? `2px solid ${TOKENS.ink}` : "2px solid transparent",
                  marginBottom: "-1px",
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
              className="w-full rounded-sm px-4 py-3 text-sm focus:outline-none"
              style={{
                fontFamily: bodyFont,
                background: TOKENS.paper,
                border: `1px solid ${TOKENS.line}`,
                color: TOKENS.ink,
              }}
            />
          ) : (
            <textarea
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="Paste the full job description here..."
              rows={5}
              className="w-full rounded-sm px-4 py-3 text-sm resize-none focus:outline-none"
              style={{
                fontFamily: bodyFont,
                background: TOKENS.paper,
                border: `1px solid ${TOKENS.line}`,
                color: TOKENS.ink,
              }}
            />
          )}

          <button
            onClick={analyze}
            disabled={loading || !(mode === "url" ? urlInput : textInput).trim()}
            className="mt-4 w-full py-3 rounded-sm transition disabled:opacity-40"
            style={{
              fontFamily: monoFont,
              fontWeight: 600,
              letterSpacing: "0.06em",
              background: TOKENS.ink,
              color: TOKENS.paperCard,
            }}
          >
            {loading ? "REVIEWING…" : "RUN VERIFICATION →"}
          </button>
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
                  <div key={i} className="flex items-start gap-2.5">
                    <SignalMark ok={s.ok} />
                    <span className="text-sm leading-snug" style={{ fontFamily: bodyFont, color: TOKENS.ink }}>
                      {s.text}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <p
          className="text-center text-xs mt-10"
          style={{ fontFamily: monoFont, color: TOKENS.inkMuted, letterSpacing: "0.04em" }}
        >
          {result?.source === "rule-based fallback (AI analysis unavailable)"
            ? "AI review temporarily unavailable — showing rule-based findings only."
            : "Every listing is checked against known scam patterns before you see a verdict."}
        </p>
      </div>
    </div>
  );
}
