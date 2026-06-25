import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { FileText, Copy, Check } from "lucide-react";
import { toast } from "sonner";

export const NoticeDialog = ({ recId, recLabel }) => {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (open && !data) {
      setLoading(true);
      api.notice(recId).then((d) => {
        setData(d);
        setLoading(false);
      });
    }
  }, [open, data, recId]);

  const onCopy = async () => {
    if (!data) return;
    try {
      await navigator.clipboard.writeText(data.notice_text);
    } catch {
      // Fallback for iframes / restricted contexts
      const ta = document.createElement("textarea");
      ta.value = data.notice_text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand("copy"); } catch { /* ignore */ }
      document.body.removeChild(ta);
    }
    setCopied(true);
    toast.success("Notice copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          data-testid={`notice-trigger-${recId}`}
          onClick={(e) => e.stopPropagation()}
          className="font-mono-data text-[10px] uppercase tracking-wider px-2 py-1 border border-white/20 hover:border-white/50 text-white/70 hover:text-white rounded-sm transition-colors"
        >
          <FileText className="w-3 h-3 inline mr-1" />
          Notice
        </button>
      </DialogTrigger>
      <DialogContent
        data-testid={`notice-dialog-${recId}`}
        className="bg-[#0A0A0A] border-white/10 max-w-3xl text-white"
      >
        <DialogHeader>
          <DialogTitle className="font-display text-xl flex items-center justify-between">
            <span>
              Notice of Violation · <span className="text-[#EAB308]">{recId}</span>
            </span>
            <button
              onClick={onCopy}
              data-testid={`notice-copy-${recId}`}
              disabled={!data}
              className="font-mono-data text-[10px] uppercase tracking-wider px-3 py-1.5 bg-white text-black hover:bg-[#EAB308] rounded-sm disabled:opacity-40"
            >
              {copied ? (
                <><Check className="w-3 h-3 inline mr-1" /> Copied</>
              ) : (
                <><Copy className="w-3 h-3 inline mr-1" /> Copy</>
              )}
            </button>
          </DialogTitle>
        </DialogHeader>
        <div className="font-mono-data text-[10px] uppercase tracking-wider text-white/40">
          {recLabel} · auto-drafted by Gemini 3 Flash
        </div>
        <div className="border border-white/10 bg-[#141414] rounded-sm p-5 max-h-[60vh] overflow-y-auto">
          {loading || !data ? (
            <div className="space-y-2 animate-pulse">
              <div className="h-3 bg-white/5 rounded-sm w-full" />
              <div className="h-3 bg-white/5 rounded-sm w-5/6" />
              <div className="h-3 bg-white/5 rounded-sm w-4/6" />
              <div className="h-3 bg-white/5 rounded-sm w-full" />
              <div className="h-3 bg-white/5 rounded-sm w-3/6" />
              <div className="font-mono-data text-[10px] uppercase tracking-wider text-white/30 mt-3">
                Drafting notice via Gemini 3 Flash…
              </div>
            </div>
          ) : (
            <pre
              data-testid={`notice-text-${recId}`}
              className="whitespace-pre-wrap text-sm leading-relaxed font-mono-data text-white/90"
            >
              {data.notice_text}
            </pre>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
