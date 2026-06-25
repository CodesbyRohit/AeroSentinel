import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { Sparkles, Send, X, Loader2, Bot } from "lucide-react";

/**
 * AeroCopilot — global floating drawer answering questions about the city
 * using Gemini 3 Flash with the AeroSentinel state as context.
 */
const SUGGESTED = [
  "Why is Anand Vihar severe?",
  "Which ward needs inspection first?",
  "Show highest-risk schools.",
  "Generate today's enforcement plan.",
];

export const Copilot = ({ wardId }) => {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([
    {
      role: "bot",
      text: "I'm AeroCopilot — ask me anything about Delhi's air-quality state, hotspots, or enforcement queue.",
    },
  ]);
  const [busy, setBusy] = useState(false);
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, busy, open]);

  const ask = async (q) => {
    if (!q.trim() || busy) return;
    setMessages((m) => [...m, { role: "user", text: q }]);
    setInput("");
    setBusy(true);
    try {
      const res = await api.copilot(q, wardId);
      setMessages((m) => [...m, { role: "bot", text: res.answer, context: res.context_used }]);
    } catch (e) {
      setMessages((m) => [...m, { role: "bot", text: "Network error. Try again." }]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button
        data-testid="copilot-fab"
        onClick={() => setOpen(true)}
        className="fixed bottom-20 right-6 z-50 group bg-white text-black hover:bg-[#22C55E] rounded-sm border-2 border-white px-5 py-3.5 shadow-[0_0_40px_rgba(255,255,255,0.25)] transition-all flex items-center gap-2.5 font-mono-data text-xs uppercase tracking-wider hover:scale-105"
      >
        <Sparkles className="w-4 h-4" />
        Ask AeroCopilot
        <span className="hidden md:inline-block w-1.5 h-1.5 rounded-full bg-[#22C55E] pulse-dot ml-1" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end md:items-stretch md:justify-end" data-testid="copilot-drawer">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <div className="relative w-full md:w-[480px] h-[75vh] md:h-full bg-[#0A0A0A] border-l border-white/10 flex flex-col">
            <div className="border-b border-white/10 px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-sm bg-[#EAB308] flex items-center justify-center">
                  <Bot className="w-4 h-4 text-black" />
                </div>
                <div>
                  <div className="font-display text-base font-bold">AeroCopilot</div>
                  <div className="font-mono-data text-[10px] uppercase tracking-wider text-white/50">
                    gemini-3-flash · {wardId ? `ward ${wardId}` : "citywide"}
                  </div>
                </div>
              </div>
              <button
                data-testid="copilot-close"
                onClick={() => setOpen(false)}
                className="text-white/60 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {messages.map((m, i) => (
                <div key={i} data-testid={`copilot-msg-${i}`} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[85%] px-4 py-3 rounded-sm text-sm leading-relaxed ${
                      m.role === "user"
                        ? "bg-white text-black"
                        : "bg-[#141414] border border-white/10 text-white/90"
                    }`}
                  >
                    {m.text}
                    {m.context && (
                      <div className="mt-3 pt-2 border-t border-white/10 font-mono-data text-[10px] uppercase tracking-wider text-white/40">
                        {m.context.map((c, idx) => (
                          <div key={idx} className="truncate">• {c}</div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {busy && (
                <div className="flex justify-start">
                  <div className="bg-[#141414] border border-white/10 rounded-sm px-4 py-3 flex items-center gap-2 text-white/50 text-sm">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Thinking…
                  </div>
                </div>
              )}
              <div ref={endRef} />
            </div>

            {messages.length <= 1 && (
              <div className="px-5 pb-3 border-t border-white/5 pt-3">
                <div className="font-mono-data text-[10px] uppercase tracking-wider text-white/40 mb-2">
                  Try
                </div>
                <div className="flex flex-wrap gap-2">
                  {SUGGESTED.map((s) => (
                    <button
                      key={s}
                      data-testid={`copilot-suggest-${s.slice(0, 10).replace(/\s/g, "-")}`}
                      onClick={() => ask(s)}
                      className="text-[11px] px-2.5 py-1.5 border border-white/10 hover:border-white/30 text-white/70 hover:text-white rounded-sm"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <form
              onSubmit={(e) => { e.preventDefault(); ask(input); }}
              className="border-t border-white/10 px-5 py-4 flex items-center gap-2"
            >
              <input
                data-testid="copilot-input"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about a ward, source, or recommendation…"
                className="flex-1 bg-[#141414] border border-white/10 rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-white/30 text-white"
              />
              <button
                data-testid="copilot-send"
                type="submit"
                disabled={!input.trim() || busy}
                className="px-3 py-2 bg-white text-black hover:bg-[#22C55E] rounded-sm disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
