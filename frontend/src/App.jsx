import { useState, useEffect } from "react";

const TOKENS = {
  paper: "var(--paper)",
  paperCard: "var(--paper-card)",
  ink: "var(--ink)",
  inkMuted: "var(--ink-muted)",
  line: "var(--line)",
  lineBright: "var(--line-bright)",
  track: "var(--track)",
  cta: "var(--cta)",
  ctaHover: "var(--cta-hover)",
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

function VerdictBadge({ tone, size = "large", showCheck = false }) {
  const { ink, label } = TONES[tone];
  const xl = size === "xl";
  const chip = size === "chip";
  const big = size === "large" || xl;
  return (
    <div
      className="inline-flex items-center gap-1.5 rounded-sm"
      style={{
        border: `2px double ${ink}`,
        padding: xl
          ? "clamp(0.4rem, 2vw, 0.55rem) clamp(0.7rem, 3vw, 1.1rem)"
          : chip
          ? "0.15rem 0.4rem"
          : big
          ? "0.4rem 0.9rem"
          : "0.25rem 0.6rem",
      }}
    >
      {showCheck ? (
        <svg width="14" height="14" viewBox="0 0 14 14" className="flex-shrink-0">
          <path
            d="M2 7.5 L5.5 11 L12 3"
            fill="none"
            stroke={ink}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ) : (
        <span
          className="rounded-full flex-shrink-0"
          style={{ width: xl ? 12 : chip ? 6 : big ? 10 : 8, height: xl ? 12 : chip ? 6 : big ? 10 : 8, background: ink }}
        />
      )}
      <span
        style={{
          fontFamily: chip ? monoFont : displayFont,
          fontWeight: 600,
          fontSize: xl ? "clamp(1.05rem, 4.5vw, 1.5rem)" : chip ? "0.75rem" : big ? "1.3rem" : "0.95rem",
          letterSpacing: chip ? "0.1em" : "0.04em",
          textTransform: "uppercase",
          color: ink,
          lineHeight: 1,
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </span>
    </div>
  );
}

function TrustMeter({ score, tone }) {
  const { ink } = TONES[tone];
  const ticks = Array.from({ length: 11 }, (_, i) => i * 10);
  const clamped = score === null || score === undefined ? null : Math.max(0, Math.min(100, score));
  const [displayScore, setDisplayScore] = useState(0);
  const [barWidth, setBarWidth] = useState(0);

  useEffect(() => {
    if (clamped === null) return;
    setDisplayScore(0);
    setBarWidth(0);
    const start = performance.now();
    const duration = 900;
    let raf;
    const tick = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayScore(Math.round(eased * clamped));
      setBarWidth(eased * clamped);
      if (progress < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clamped]);

  if (clamped === null) {
    return (
      <div>
        <div className="flex items-baseline justify-between mb-2.5">
          <span
            className="text-xs tracking-widest"
            style={{ fontFamily: monoFont, color: TOKENS.inkMuted, letterSpacing: "0.15em" }}
          >
            TRUST SCORE
          </span>
          <span style={{ fontFamily: monoFont, color: ink, fontWeight: 700, fontSize: "1.4rem" }}>
            N/A
          </span>
        </div>
        <div className="relative h-3 rounded-full" style={{ background: TOKENS.track }} />
      </div>
    );
  }

  return (
    <div
      className="rounded-sm p-4 sm:p-5"
      style={{ background: `color-mix(in srgb, ${ink} 6%, transparent)`, border: `1px solid ${TOKENS.line}` }}
    >
      <div className="flex items-baseline justify-between mb-3">
        <span
          className="text-xs tracking-widest"
          style={{ fontFamily: monoFont, color: TOKENS.inkMuted, letterSpacing: "0.15em" }}
        >
          TRUST SCORE
        </span>
        <span style={{ fontFamily: monoFont, color: ink, fontWeight: 700, fontSize: "2rem", lineHeight: 1 }}>
          {displayScore}
          <span style={{ color: TOKENS.inkMuted, fontWeight: 400, fontSize: "1.1rem" }}>/100</span>
        </span>
      </div>
      <div className="relative h-3 rounded-full" style={{ background: TOKENS.track }}>
        <div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{ width: `${barWidth}%`, background: ink }}
        />
      </div>
      <div className="flex justify-between mt-1.5">
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

function QuickChecklist({ positiveSignals, warningSignals, tone }) {
  const allText = [...positiveSignals, ...warningSignals].map((s) => s.text.toLowerCase());
  const hasSignal = (keywords) => allText.some((t) => keywords.some((k) => t.includes(k)));
  const positiveHasSignal = (keywords) => positiveSignals.some((s) => keywords.some((k) => s.text.toLowerCase().includes(k)));

  const items = [
    {
      label: "Structured Listing Data",
      ok: positiveHasSignal(["json-ld", "structured job data"]),
      applicable: hasSignal(["json-ld", "structured job data"]),
    },
    {
      label: "Domain Trust Signals",
      ok: positiveHasSignal(["domain registered", "hosted on"]),
      applicable: hasSignal(["domain registered", "hosted on", "domain"]),
    },
    {
      label: "Content Quality",
      ok: positiveHasSignal(["reasonable detail"]),
      applicable: hasSignal(["reasonable detail", "vague", "short"]),
    },
    {
      label: "No Red Flags Detected",
      ok: warningSignals.length === 0,
      applicable: true,
    },
  ].filter((item) => item.applicable);

  if (items.length === 0) return null;

  return (
    <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-2">
          <SignalMark ok={item.ok} />
          <span className="text-xs" style={{ fontFamily: monoFont, color: TOKENS.inkMuted }}>
            {item.label}
          </span>
        </div>
      ))}
    </div>
  );
}

function SectionDivider() {
  return <div className="mt-5 pt-5 sm:mt-6 sm:pt-6" style={{ borderTop: `1px dashed ${TOKENS.line}` }} />;
}

export default function TrustHire() {
  const [mode, setMode] = useState("url");
  const [urlInput, setUrlInput] = useState("");
  const [textInput, setTextInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [dark, setDark] = useState(() => {
    const stored = localStorage.getItem("trusthire-theme");
    if (stored) return stored === "dark";
    return window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
  });

  useEffect(() => {
    localStorage.setItem("trusthire-theme", dark ? "dark" : "light");
  }, [dark]);

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
          llmError: data.llm_error,
          aiSummary: data.ai_summary,
          mode,
          caseNumber: `${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`,
        });
      }
    } catch (e) {
      setError("Could not reach the backend. Is the server running?");
    } finally {
      setLoading(false);
    }
  };

  const aiUsed = result?.source === "AI + rule-based analysis";
  const positiveSignals = result?.signals.filter((s) => s.ok) || [];
  const warningSignals = result?.signals.filter((s) => !s.ok) || [];

  return (
    <div
      className={`min-h-screen w-full overflow-x-hidden transition-colors duration-300 ${dark ? "dark" : ""}`}
      style={{ background: TOKENS.paper, backgroundImage: GRAIN_BG }}
    >
      <header
        className="w-full px-5 sm:px-10 py-4 sm:py-5 flex items-center justify-between gap-3 sm:gap-4"
        style={{ borderBottom: `1px solid ${TOKENS.line}` }}
      >
        <div className="flex items-center gap-4 min-w-0">
          {result ? (
            <div className="flex items-center gap-3 min-w-0">
              <span
                className="text-xs flex-shrink-0"
                style={{ fontFamily: monoFont, color: TOKENS.ink, fontWeight: 600, letterSpacing: "0.1em" }}
              >
                TRUSTHIRE · #{result.caseNumber}
              </span>
              <span className="hidden sm:inline">
                <VerdictBadge tone={result.tone} size="chip" />
              </span>
            </div>
          ) : (
            <span
              style={{ fontFamily: monoFont, color: TOKENS.ink, fontWeight: 600, letterSpacing: "0.08em", fontSize: "0.95rem" }}
            >
              TRUSTHIRE
            </span>
          )}
        </div>
        <div className="flex items-center gap-5 flex-shrink-0">
          {!result && (
            <span
              className="text-[11px] hidden sm:inline"
              style={{ fontFamily: monoFont, color: TOKENS.ink, fontWeight: 600, letterSpacing: "0.16em" }}
            >
              [ CASE FILE — LISTING REVIEW ]
            </span>
          )}
          <button
            onClick={() => setDark((d) => !d)}
            aria-label="Toggle dark mode"
            className="text-[11px] px-2.5 py-1 rounded-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            style={{
              fontFamily: monoFont,
              letterSpacing: "0.1em",
              color: TOKENS.ink,
              border: `1px solid ${TOKENS.line}`,
              outlineColor: TOKENS.ink,
            }}
          >
            {dark ? "LIGHT" : "DARK"}
          </button>
        </div>
      </header>

      <main
        className={`w-full mx-auto px-5 sm:px-10 py-8 sm:py-16 grid grid-cols-1 ${
          result ? "md:grid-cols-[0.8fr_1.2fr] max-w-5xl" : "md:grid-cols-[0.75fr_1fr] max-w-6xl"
        } gap-6 md:gap-14`}
      >
        {/* LEFT COLUMN: hero (idle state) or compact input panel (result state) */}
        <div className={result ? "order-2 md:order-1" : "md:sticky md:top-16 md:self-start"}>
          {!result && (
            <>
              <div className="flex items-center gap-2 mb-6">
                <svg width="22" height="22" viewBox="0 0 22 22" style={{ flexShrink: 0 }}>
                  <circle cx="11" cy="11" r="9.5" fill="none" stroke={TOKENS.ink} strokeWidth="1.5" />
                  <path
                    d="M6.5 11 L9.5 14 L15.5 7.5"
                    fill="none"
                    stroke={TOKENS.ink}
                    strokeWidth="1.7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span
                  style={{ fontFamily: monoFont, color: TOKENS.ink, fontWeight: 600, letterSpacing: "0.1em", fontSize: "0.85rem" }}
                >
                  TRUSTHIRE
                </span>
              </div>
              <h1
                className="text-4xl sm:text-5xl leading-[1.08] mb-5 max-w-[92%]"
                style={{ fontFamily: displayFont, fontWeight: 600, color: TOKENS.ink }}
              >
                Before you apply,
                <br />
                get it verified.
              </h1>
              <p
                className="text-base leading-relaxed mb-8"
                style={{ fontFamily: bodyFont, color: TOKENS.inkMuted }}
              >
                Paste a job link or description. TrustHire checks it against known scam patterns before you apply.
              </p>
              <div className="w-12 h-px" style={{ background: TOKENS.line }} />
            </>
          )}

          {result && (
            <>
              <div
                className="rounded-sm p-5 sm:p-6"
                style={{ background: TOKENS.paperCard, border: `1px solid ${TOKENS.lineBright}`, boxShadow: "0 12px 32px rgba(0,0,0,0.06)" }}
              >
                <div
                  className="text-xs mb-4"
                  style={{ fontFamily: monoFont, color: TOKENS.inkMuted, letterSpacing: "0.12em" }}
                >
                  ANALYZE ANOTHER LISTING
                </div>
                {renderInputPanel()}
              </div>

              <div
                className="rounded-sm p-5 sm:p-6 mt-5 sm:mt-6"
                style={{ background: TOKENS.paperCard, border: `1px solid ${TOKENS.line}`, boxShadow: "0 12px 32px rgba(0,0,0,0.06)" }}
              >
                <details>
                  <summary
                    className="text-xs cursor-pointer select-none"
                    style={{ fontFamily: monoFont, color: TOKENS.inkMuted, letterSpacing: "0.12em" }}
                  >
                    TECHNICAL DETAILS
                  </summary>
                  <div className="mt-3 space-y-1.5 text-sm" style={{ fontFamily: monoFont, color: TOKENS.ink }}>
                    <div>Case ID: #{result.caseNumber}</div>
                    <div>Input type: {result.mode === "url" ? "URL" : "Pasted text"}</div>
                    <div>Analysis method: {result.source}</div>
                    <div>Verdict: {result.verdict}</div>
                  </div>
                </details>
              </div>
            </>
          )}
        </div>

        {/* RIGHT COLUMN */}
        <div className={result ? "order-1 md:order-2 min-w-0" : "min-w-0"}>
          {!result && (
            <div
              className="rounded-sm p-5 sm:p-6"
              style={{ background: TOKENS.paperCard, border: `1px solid ${TOKENS.lineBright}`, boxShadow: "0 12px 32px rgba(0,0,0,0.06)" }}
            >
              {renderInputPanel()}
            </div>
          )}

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
              className="rounded-sm p-6 sm:p-7"
              style={{
                background: TOKENS.paperCard,
                border: `1px solid ${TOKENS.line}`,
                borderLeft: `3px solid ${TONES[result.tone].ink}`,
                boxShadow: "0 12px 32px rgba(0,0,0,0.06)",
              }}
            >
              <div className="mb-6">
                <VerdictBadge tone={result.tone} size="large" showCheck={result.tone === "safe"} />
              </div>

              <div>
                <TrustMeter score={result.score} tone={result.tone} />
              </div>

              <QuickChecklist positiveSignals={positiveSignals} warningSignals={warningSignals} tone={result.tone} />

              <SectionDivider />
              <div
                className="rounded-sm p-4"
                style={{
                  background: `color-mix(in srgb, ${TONES[result.tone].ink} 8%, transparent)`,
                  borderLeft: `2px solid ${TONES[result.tone].ink}`,
                }}
              >
                <div
                  className="text-xs mb-2"
                  style={{ fontFamily: monoFont, color: TONES[result.tone].ink, letterSpacing: "0.12em", fontWeight: 600 }}
                >
                  RECOMMENDED ACTION
                </div>
                <p className="text-sm leading-relaxed" style={{ fontFamily: bodyFont, color: TOKENS.ink }}>
                  {RECOMMENDATIONS[result.tone]}
                </p>
              </div>

              {positiveSignals.length > 0 && (
                <>
                  <SectionDivider />
                  <div>
                    <div
                      className="text-xs mb-3"
                      style={{ fontFamily: monoFont, color: TOKENS.inkMuted, letterSpacing: "0.12em" }}
                    >
                      POSITIVE SIGNALS
                    </div>
                    <div className="space-y-3">
                      {positiveSignals.map((s, i) => (
                        <div key={i} className="flex items-start gap-2.5">
                          <SignalMark ok={s.ok} />
                          <span className="text-sm leading-snug" style={{ fontFamily: bodyFont, color: TOKENS.ink }}>
                            {s.text}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {warningSignals.length > 0 && (
                <>
                  <SectionDivider />
                  <div>
                    <div
                      className="text-xs mb-3"
                      style={{ fontFamily: monoFont, color: TOKENS.inkMuted, letterSpacing: "0.12em" }}
                    >
                      WARNINGS
                    </div>
                    <div className="space-y-3">
                      {warningSignals.map((s, i) => (
                        <div key={i} className="flex items-start gap-2.5">
                          <SignalMark ok={s.ok} />
                          <span className="text-sm leading-snug" style={{ fontFamily: bodyFont, color: TOKENS.ink }}>
                            {s.text}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              <SectionDivider />
              <div>
                <div
                  className="text-xs mb-2"
                  style={{ fontFamily: monoFont, color: TOKENS.inkMuted, letterSpacing: "0.12em" }}
                >
                  AI SUMMARY
                </div>
                <div
                  className="rounded-sm p-4"
                  style={{ background: TOKENS.paper, border: `1px solid ${TOKENS.line}` }}
                >
                  <p className="text-sm leading-relaxed" style={{ fontFamily: bodyFont, color: TOKENS.ink }}>
                    {aiUsed && result.aiSummary
                      ? result.aiSummary
                      : aiUsed
                      ? "This review combined automated rule-based checks with AI analysis of the listing's language and structure."
                      : result.llmError?.includes("quota exhausted")
                      ? "AI analysis is unavailable right now — the free-tier daily limit has been reached. This resets in 24 hours. The findings above are based on rule-based checks only."
                      : "AI analysis was unavailable for this review — the findings above are based on rule-based checks only."}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );

  function renderInputPanel() {
    return (
      <>
        <div
          className="flex gap-1 mb-5 p-1 rounded-sm w-fit"
          style={{ background: TOKENS.paper, border: `1px solid ${TOKENS.line}` }}
        >
          {[
            { key: "url", label: "Link" },
            { key: "text", label: "Paste text" },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setMode(t.key)}
              className="px-4 py-2.5 sm:py-1.5 text-sm rounded-sm transition-all duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
              style={{
                fontFamily: monoFont,
                letterSpacing: "0.04em",
                color: mode === t.key ? TOKENS.paperCard : TOKENS.inkMuted,
                fontWeight: mode === t.key ? 600 : 400,
                background: mode === t.key ? TOKENS.ink : "transparent",
                boxShadow: mode === t.key ? "0 1px 3px rgba(0,0,0,0.15)" : "none",
                outlineColor: TOKENS.ink,
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {mode === "url" ? (
          <div>
            <p className="text-xs mb-2" style={{ fontFamily: bodyFont, color: TOKENS.inkMuted }}>
              We'll fetch and read the live page.
            </p>
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
          </div>
        ) : (
          <div>
            <div
              className="text-xs mb-2"
              style={{ fontFamily: monoFont, color: TOKENS.inkMuted, letterSpacing: "0.1em" }}
            >
              JOB DESCRIPTION TEXT
            </div>
            <textarea
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="Paste the full job description here — the more complete, the better the review."
              rows={result ? 6 : 9}
              className="w-full rounded-sm px-4 py-4 text-sm resize-y transition-shadow focus:outline-none"
              style={{
                fontFamily: bodyFont,
                background: TOKENS.paper,
                border: `1px solid ${TOKENS.line}`,
                color: TOKENS.ink,
                minHeight: result ? "120px" : "180px",
              }}
              onFocus={(e) => (e.target.style.borderColor = TOKENS.ink)}
              onBlur={(e) => (e.target.style.borderColor = TOKENS.line)}
            />
            <div
              className="text-right text-xs mt-1.5"
              style={{ fontFamily: monoFont, color: TOKENS.inkMuted }}
            >
              {textInput.trim().length} characters
            </div>
          </div>
        )}

        <button
          onClick={analyze}
          disabled={loading || !(mode === "url" ? urlInput : textInput).trim()}
          className="mt-5 sm:mt-4 w-full py-3.5 sm:py-3 rounded-sm transition-all hover:-translate-y-px disabled:hover:translate-y-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-40"
          style={{
            fontFamily: monoFont,
            fontWeight: 600,
            letterSpacing: "0.06em",
            background: TOKENS.cta,
            color: TOKENS.paperCard,
            outlineColor: TOKENS.cta,
            opacity: loading ? 1 : undefined,
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = TOKENS.ctaHover)}
          onMouseLeave={(e) => (e.currentTarget.style.background = TOKENS.cta)}
        >
          {loading ? (
            <span className="inline-flex items-center gap-2.5">
              <span>REVIEWING</span>
              <span className="inline-flex items-center gap-1">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="rounded-full"
                    style={{
                      width: 4,
                      height: 4,
                      background: "currentColor",
                      animation: "pulseDot 1.2s ease-in-out infinite",
                      animationDelay: `${i * 0.15}s`,
                    }}
                  />
                ))}
              </span>
            </span>
          ) : (
            "RUN VERIFICATION →"
          )}
        </button>

        <p
          className="text-center text-[13px] mt-5 sm:mt-4 leading-relaxed"
          style={{ fontFamily: monoFont, color: TOKENS.ink, fontWeight: 500 }}
        >
          Nothing you submit here is stored.
        </p>
      </>
    );
  }
}
