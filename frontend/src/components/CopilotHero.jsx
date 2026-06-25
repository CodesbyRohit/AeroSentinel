import { useState } from "react";
import { api } from "@/lib/api";
import { Sparkles, ArrowRight, Loader2, Bot } from "lucide-react";

/**
 * Inline, attention-grabbing Copilot prompt. Sits on the Landing/Command
 * routes to make the LLM front-and-centre — not buried in a FAB.
 */
const SUGGESTED = [
  "Why is Anand Vihar severe?",
  "Which ward needs inspection first?",
  "Show highest-risk schools.",
  "Generate today's enforcement plan.",
];

export const CopilotHero = ({ wardId }) => {
  const [q, setQ] = useState("");
  const [answer, setAnswer] = useState(null);
  const [busy, setBusy] = useState(false);

  const ask = async (text) => {
    if (!text.trim() || busy) return;
    setBusy(true);
    setAnswer({ q: text, a: null });
    try {
      const res = await api.copilot(text, wardId);
      setAnswer({ q: text, a: res.answer, context: res.context_used });
    } catch {
      setAnswer({ q: text, a: "Network error. Please try again." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <section
      data-testid="copilot-hero"
      className="bg-[#141414] border-2 border-white rounded-sm p-6 lg:p-8 relative overflow-hidden"
    >
      <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-white/[0.04] blur-3xl pointer-events-none" />

      <div className="flex items-start gap-3 mb-5 relative z-10">
        <div className="w-10 h-10 rounded-sm bg-white text-black flex items-center justify-center">
          <Bot className="w-5 h-5" strokeWidth={2.5} />
        </div>
        <div>
          <div className="font-mono-data text-[10px] uppercase tracking-[0.22em] text-white/60 mb-1">
            Ask AeroCopilot · Gemini 3 Flash
          </div>
          <div className="font-display text-2xl md:text-3xl font-bold tracking-tighter leading-tight">
            What should we do <em>right now</em>?
          </div>
        </div>
      </div>

      <form
        onSubmit={(e) => { e.preventDefault(); ask(q); }}
        className="flex items-stretch gap-2 mb-5 relative z-10"
      >
        <input
          data-testid="copilot-hero-input"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Ask about a ward, source attribution, or enforcement plan…"
          className="flex-1 bg-[#0A0A0A] border border-white/15 rounded-sm px-4 py-3 text-sm focus:outline-none focus:border-white text-white placeholder-white/30"
        />
        <button
          data-testid="copilot-hero-send"
          type="submit"
          disabled={!q.trim() || busy}
          className="px-5 py-3 bg-white text-black hover:bg-[#22C55E] rounded-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 font-mono-data text-xs uppercase tracking-wider"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
          Ask
        </button>
      </form>

      <div className="flex flex-wrap gap-2 relative z-10">
        {SUGGESTED.map((s) => (
          <button
            key={s}
            data-testid={`copilot-hero-suggest-${s.slice(0, 8).replace(/\s/g, "-")}`}
            onClick={() => ask(s)}
            className="text-xs px-3 py-1.5 border border-white/15 hover:border-white/50 text-white/70 hover:text-white rounded-sm transition-colors flex items-center gap-1.5"
          >
            <Sparkles className="w-3 h-3" />
            {s}
          </button>
        ))}
      </div>

      {answer && (
        <div data-testid="copilot-hero-answer" className="mt-5 pt-5 border-t border-white/10 relative z-10">
          <div className="font-mono-data text-[10px] uppercase tracking-wider text-white/50 mb-2">
            You asked
          </div>
          <div className="text-sm text-white/70 mb-3">{answer.q}</div>
          <div className="font-mono-data text-[10px] uppercase tracking-wider text-white/50 mb-2">
            AeroCopilot answers
          </div>
          <div className="text-base leading-relaxed text-white/90 min-h-[3rem]">
            {answer.a || (
              <span className="text-white/40 flex items-center gap-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Thinking…
              </span>
            )}
          </div>
          {answer.context && (
            <div className="mt-3 pt-2 border-t border-white/5 font-mono-data text-[9px] uppercase tracking-wider text-white/30 space-y-0.5">
              <div className="mb-1">Context used:</div>
              {answer.context.map((c, i) => (
                <div key={i} className="truncate">• {c}</div>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
};
