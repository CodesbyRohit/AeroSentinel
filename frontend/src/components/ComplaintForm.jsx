import { useRef, useState } from "react";
import { api } from "@/lib/api";
import { Camera, Upload, Loader2, CheckCircle, AlertTriangle, X } from "lucide-react";
import { toast } from "sonner";

const SEVERITY = {
  low: { c: "#22C55E", label: "LOW" },
  medium: { c: "#F97316", label: "MEDIUM" },
  high: { c: "#EF4444", label: "HIGH" },
  unknown: { c: "#71717A", label: "UNVERIFIED" },
};

export const ComplaintForm = ({ wards = [] }) => {
  const [preview, setPreview] = useState(null);
  const [base64, setBase64] = useState(null);
  const [wardId, setWardId] = useState("");
  const [locationText, setLocationText] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const fileRef = useRef(null);

  const onFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!/^image\/(jpeg|png|webp)/i.test(f.type)) {
      toast.error("Please upload a JPEG, PNG, or WEBP image.");
      return;
    }
    if (f.size > 6 * 1024 * 1024) {
      toast.error("Image too large (max 6MB).");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      setPreview(dataUrl);
      setBase64(dataUrl.split(",", 2)[1]);
    };
    reader.readAsDataURL(f);
  };

  const submit = async () => {
    if (!base64) {
      toast.error("Please attach a photo of the pollution event.");
      return;
    }
    setBusy(true);
    setResult(null);
    try {
      const res = await api.submitComplaint({
        image_base64: base64,
        ward_id: wardId || null,
        location_text: locationText || null,
        citizen_note: note || null,
      });
      setResult(res);
      toast.success(`Complaint ${res.id} submitted · ${res.status}`);
    } catch (e) {
      toast.error("Submission failed. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    setPreview(null);
    setBase64(null);
    setResult(null);
    setNote("");
    setLocationText("");
    setWardId("");
    if (fileRef.current) fileRef.current.value = "";
  };

  if (result) {
    const sev = SEVERITY[result.analysis.severity] || SEVERITY.unknown;
    return (
      <div data-testid="complaint-result" className="bg-[#141414] border border-white/10 rounded-sm p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="font-mono-data text-[10px] uppercase tracking-[0.18em] text-[#22C55E] flex items-center gap-2">
              <CheckCircle className="w-3 h-3" />
              Complaint Submitted · {result.id}
            </div>
            <div className="font-display text-xl font-semibold mt-1">AI Analysis Complete</div>
          </div>
          <button onClick={reset} data-testid="complaint-new" className="text-white/60 hover:text-white text-xs font-mono-data uppercase">
            New complaint
          </button>
        </div>

        {preview && (
          <img src={preview} alt="submitted" className="w-full max-h-64 object-cover border border-white/10 rounded-sm mb-4" />
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="font-mono-data text-[10px] uppercase tracking-wider text-white/40 mb-1">Detected</div>
            <div className="flex flex-wrap gap-1.5">
              {result.analysis.detected.map((d) => (
                <span key={d} className="font-mono-data text-[10px] uppercase tracking-wider px-2 py-1 rounded-sm bg-[#EAB308]/10 border border-[#EAB308]/40 text-[#EAB308]">
                  {d.replace(/_/g, " ")}
                </span>
              ))}
            </div>
          </div>
          <div>
            <div className="font-mono-data text-[10px] uppercase tracking-wider text-white/40 mb-1">Severity · Confidence</div>
            <div className="flex items-center gap-2">
              <span
                className="font-mono-data text-[10px] px-2 py-1 rounded-sm border"
                style={{ color: sev.c, borderColor: `${sev.c}66`, background: `${sev.c}1a` }}
              >
                {sev.label}
              </span>
              <span className="font-mono-data tabular text-sm text-white/80">
                {(result.analysis.confidence * 100).toFixed(0)}%
              </span>
            </div>
          </div>
          <div className="md:col-span-2">
            <div className="font-mono-data text-[10px] uppercase tracking-wider text-white/40 mb-1">Description</div>
            <p className="text-sm text-white/80">{result.analysis.description}</p>
          </div>
          <div className="md:col-span-2">
            <div className="font-mono-data text-[10px] uppercase tracking-wider text-white/40 mb-1">Recommended Action</div>
            <p className="text-sm text-white/80">{result.analysis.recommended_action}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#141414] border border-white/10 rounded-sm p-6" data-testid="complaint-form">
      <div className="font-mono-data text-[10px] uppercase tracking-[0.18em] text-white/50 flex items-center gap-2 mb-2">
        <Camera className="w-3 h-3 text-[#EAB308]" />
        Citizen Evidence-based Complaint
      </div>
      <div className="font-display text-xl font-semibold mb-1">Report a pollution event</div>
      <p className="text-xs text-white/50 mb-5">
        Snap a photo of smoke, dust, open burning, or vehicle emissions. AeroSentinel will analyse it and route it to the right enforcement officer.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <label
          data-testid="complaint-upload"
          className="border border-dashed border-white/20 hover:border-white/50 rounded-sm p-6 cursor-pointer flex flex-col items-center justify-center text-center min-h-[200px] transition-colors"
        >
          {preview ? (
            <img src={preview} alt="preview" className="max-h-44 object-contain" />
          ) : (
            <>
              <Upload className="w-6 h-6 text-white/40 mb-2" />
              <div className="text-sm text-white/70">Click to attach a photo</div>
              <div className="font-mono-data text-[10px] uppercase tracking-wider text-white/40 mt-1">
                JPEG / PNG / WEBP · max 6MB
              </div>
            </>
          )}
          <input
            ref={fileRef}
            data-testid="complaint-file"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={onFile}
            className="hidden"
          />
        </label>

        <div className="space-y-3">
          <Field label="Ward (optional)">
            <select
              data-testid="complaint-ward"
              value={wardId}
              onChange={(e) => setWardId(e.target.value)}
              className="w-full bg-[#0A0A0A] border border-white/10 rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-white/30 text-white"
            >
              <option value="">-- select ward --</option>
              {wards.map((w) => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Location detail">
            <input
              data-testid="complaint-location"
              value={locationText}
              onChange={(e) => setLocationText(e.target.value)}
              placeholder="e.g. Near metro station, block C"
              className="w-full bg-[#0A0A0A] border border-white/10 rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-white/30 text-white"
            />
          </Field>
          <Field label="Note">
            <textarea
              data-testid="complaint-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="What did you observe?"
              className="w-full bg-[#0A0A0A] border border-white/10 rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-white/30 text-white"
            />
          </Field>
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between gap-3">
        <div className="font-mono-data text-[10px] uppercase tracking-wider text-white/40 flex items-center gap-1">
          <AlertTriangle className="w-3 h-3" />
          Image is sent to Gemini 3 Flash Vision for analysis
        </div>
        <button
          data-testid="complaint-submit"
          onClick={submit}
          disabled={busy || !base64}
          className="font-mono-data text-xs uppercase tracking-wider px-5 py-2.5 bg-white text-black hover:bg-[#EAB308] rounded-sm disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {busy ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Analysing…</> : "Submit complaint"}
        </button>
      </div>
    </div>
  );
};

const Field = ({ label, children }) => (
  <div>
    <div className="font-mono-data text-[10px] uppercase tracking-wider text-white/40 mb-1">{label}</div>
    {children}
  </div>
);
