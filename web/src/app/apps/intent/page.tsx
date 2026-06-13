"use client";

import { useRef, useState } from "react";
import AppHeader from "@/components/AppHeader";
import { useDevTrace } from "@/components/DevTrace";
import { prettyJson } from "@/lib/trace";

const SAMPLES = [
  { flag: "🇹🇭", label: "ไทย", text: "พรุ่งนี้เช้าขอรถไปสนามบินตอนตี 5 ได้ไหมครับ แล้วก็อยากได้กาแฟร้อนส่งมาที่ห้องด้วย" },
  { flag: "🇯🇵", label: "日本語", text: "夜遅くにチェックインしますが、静かな高層階の部屋に変更できますか？あと、明日の朝食を6時にお願いしたいです。" },
  { flag: "🇸🇦", label: "العربية", text: "هل يمكنكم ترتيب رحلة بحرية لتناول العشاء الليلة لشخصين؟ ونحتاج إلى نقل من المطار غدًا." },
  { flag: "🇪🇸", label: "Español", text: "El aire acondicionado de mi habitación no enfría bien y hace mucho calor. ¿Pueden enviar a alguien, por favor? Es urgente." },
  { flag: "🇫🇷", label: "Français", text: "Bonjour, nous fêtons notre anniversaire de mariage ce soir. Serait-il possible d'avoir une table romantique au restaurant avec vue sur le fleuve ?" },
];

const URGENCY_STYLE: Record<string, string> = {
  urgent: "var(--ray-red)",
  soon: "var(--ray-amber)",
  routine: "var(--ray-cyan)",
};

type Result = {
  language: string;
  languageNative: string;
  flag: string;
  intent: string;
  urgency: string;
  routedTo: string;
  entities: Array<{ key: string; value: string }>;
  replyNative: string;
  replyEnglish: string;
  _debug?: { prompt: string; rawResponse: string; model: string; latencyMs: number };
};

export default function Intent() {
  const { record } = useDevTrace();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  async function interpret(text: string) {
    if (!text.trim() || busy) return;
    setBusy(true);
    setError(null);
    setResult(null);
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    try {
      const res = await fetch("/api/intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
        signal: ctrl.signal,
      });
      if (!res.ok) throw new Error(await res.text());
      const data = (await res.json()) as Result;
      setResult(data);
      record({
        appKey: "intent",
        title: `Understood ${data.language} and replied in kind`,
        model: data._debug?.model,
        latencyMs: data._debug?.latencyMs,
        steps: [
          { agentId: "linguist", note: `Detected ${data.language} (${data.languageNative})` },
          { agentId: "reasoning", note: `Extracted intent: ${data.intent}` },
          { agentId: "dispatch", note: `Routed to ${data.routedTo} · ${data.urgency}` },
          { agentId: "concierge", note: "Replied natively, with an English gloss for staff" },
        ],
        sections: [
          { label: "Guest message (input)", body: text, mono: false },
          { label: "Prompt → Gemini", body: data._debug?.prompt ?? "(unavailable)", mono: true },
          { label: "Structured response", body: prettyJson(data._debug?.rawResponse ?? "{}"), mono: true },
        ],
      });
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setError("The language engine hiccuped — try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="relative min-h-dvh overflow-hidden">
      <AppHeader title="Intent Engine" pillar="human-edge" />

      <div className="relative z-10 px-5 pb-24">
        <p className="rise mb-1 text-xs font-semibold uppercase tracking-[0.24em] text-ray-magenta">
          Any language · any guest
        </p>
        <h2 className="rise display mb-2 text-2xl font-bold leading-tight">
          The language barrier, <span className="prism-text">dissolved.</span>
        </h2>
        <p className="rise mb-4 text-sm leading-relaxed text-ink-dim">
          Write in any language. The engine understands, structures the request, and answers in
          your language — with a translation for the staff who act on it.
        </p>

        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="اكتب بأي لغة… / 何でも… / type anything…"
          rows={3}
          dir="auto"
          className="glass-deep mb-3 w-full resize-none rounded-2xl px-4 py-3 text-[0.95rem] text-ink caret-ray-aqua outline-none placeholder:text-ink-faint focus:border-ray-aqua/50"
        />
        <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
          {SAMPLES.map((s) => (
            <button
              key={s.label}
              onClick={() => setMessage(s.text)}
              className="press glass flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-[0.78rem] font-medium text-ink-dim"
            >
              <span className="text-base">{s.flag}</span> {s.label}
            </button>
          ))}
        </div>
        <button
          onClick={() => interpret(message)}
          disabled={busy || !message.trim()}
          className="press w-full rounded-2xl bg-ink py-4 font-display text-base font-semibold text-abyss transition-opacity disabled:opacity-30"
        >
          {busy ? "Understanding…" : "Understand & respond"}
        </button>

        {error && (
          <p className="mt-4 rounded-xl border border-ray-red/40 bg-ray-red/10 px-4 py-3 text-sm text-ink">{error}</p>
        )}

        {busy && (
          <div className="mt-6 flex items-center gap-2 text-ink-dim">
            <span className="thinking-dots flex gap-1.5">
              <span /><span /><span />
            </span>
            <span className="text-sm">Reading in their words…</span>
          </div>
        )}

        {result && (
          <div className="mt-6">
            <div className="bloom mb-4 flex items-center gap-3">
              <span className="text-3xl">{result.flag}</span>
              <div>
                <p className="display text-lg font-semibold">
                  {result.language} <span className="text-ink-faint">· {result.languageNative}</span>
                </p>
                <p className="text-[0.7rem] uppercase tracking-[0.14em] text-ink-faint">Detected automatically</p>
              </div>
            </div>

            {/* structured intent */}
            <div className="bloom glass-deep mb-4 rounded-2xl p-4">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <p className="text-[0.6rem] uppercase tracking-[0.18em] text-ink-faint">Intent</p>
                  <p className="text-[0.95rem] font-semibold text-ink">{result.intent}</p>
                </div>
                <span
                  className="rounded-full px-2.5 py-1 text-[0.6rem] font-bold uppercase tracking-[0.1em]"
                  style={{ background: `color-mix(in srgb, ${URGENCY_STYLE[result.urgency]} 16%, transparent)`, color: URGENCY_STYLE[result.urgency] }}
                >
                  {result.urgency}
                </span>
              </div>
              <div className="flex flex-wrap gap-2 border-t border-hairline pt-3">
                <span className="rounded-lg bg-ray-aqua/12 px-2.5 py-1 text-[0.72rem] text-ray-aqua">
                  → {result.routedTo}
                </span>
                {result.entities?.map((e, i) => (
                  <span key={i} className="glass rounded-lg px-2.5 py-1 text-[0.72rem] text-ink-dim">
                    <span className="text-ink-faint">{e.key}:</span> {e.value}
                  </span>
                ))}
              </div>
            </div>

            {/* native reply */}
            <div className="bloom glass mb-3 rounded-2xl p-4">
              <p className="mb-2 text-[0.6rem] font-bold uppercase tracking-[0.18em] text-ray-aqua">
                Reply · in their language
              </p>
              <p dir="auto" className="text-[0.95rem] leading-relaxed text-ink">{result.replyNative}</p>
            </div>
            <div className="glass-deep rounded-2xl p-4">
              <p className="mb-2 text-[0.6rem] font-bold uppercase tracking-[0.18em] text-ink-faint">
                For staff · English
              </p>
              <p className="text-[0.86rem] leading-relaxed text-ink-dim">{result.replyEnglish}</p>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
