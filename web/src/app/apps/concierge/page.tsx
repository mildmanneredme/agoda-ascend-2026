"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import { AgodaDots } from "@/components/Wordmark";
import { PARTNERS } from "@/lib/hotel";
import { loadGuest, styleOf, type GuestProfile } from "@/lib/guest";
import { personaOf } from "@/lib/personas";
import { useDevTrace } from "@/components/DevTrace";
import { AGENTS, type AgentId, type TraceStep } from "@/lib/trace";

type Action = { type: string; partnerId?: string; detail?: string };
type Msg = {
  role: "user" | "model";
  text: string;
  actions?: Action[];
  nudge?: boolean; // proactive cards get special styling
};

const SENTINEL = "@@ACTIONS@@";
const DEBUG = "@@DEBUG@@";

/** Strip the trailing meta markers to get just what the guest reads. */
function visibleOf(full: string): string {
  return full.split(SENTINEL)[0].split(DEBUG)[0];
}

/** Map a booked action to the logical agent that handled it, for the X-ray map. */
function agentForAction(type: string): { id: AgentId; note: string } {
  switch (type) {
    case "book_housekeeping":
      return { id: "housekeeping", note: "Checked the live team schedule, then confirmed the slot" };
    case "book_activity":
      return { id: "activities", note: "Matched a vetted partner and applied the 10% guest rate" };
    case "provision_esim":
      return { id: "connectivity", note: "Provisioned an eSIM and billed it to the room" };
    case "late_checkout":
      return { id: "journey", note: "Held the room and updated the day's plan" };
    default:
      return { id: "concierge", note: "Carried out the request" };
  }
}

const CHIPS = [
  "Book the sunset kayaking 🛶",
  "Housekeeping at 2pm, please",
  "Where should I eat tonight?",
];

function actionCard(action: Action): { title: string; body: string } {
  switch (action.type) {
    case "book_activity": {
      const p = PARTNERS.find((x) => x.id === action.partnerId);
      return {
        title: `Booked — ${p?.name ?? "activity"}`,
        body: `${action.detail ?? ""}${p ? ` · $${Math.round(p.price * (1 - p.discountPct / 100))} with your ${p.discountPct}% guest rate` : ""}`,
      };
    }
    case "book_housekeeping":
      return { title: `Housekeeping confirmed — ${action.detail}`, body: "Checked against the team's live schedule. You'll get a note when it's done." };
    case "provision_esim":
      return { title: "eSIM provisioned", body: action.detail ?? "Active now — no roaming needed." };
    case "late_checkout":
      return { title: `Late checkout — ${action.detail}`, body: "Your room is yours until then." };
    default:
      return { title: "Done", body: action.detail ?? "" };
  }
}

export default function Concierge() {
  const router = useRouter();
  const { record } = useDevTrace();
  const [guest, setGuest] = useState<GuestProfile | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [nudgeAnswered, setNudgeAnswered] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const g = loadGuest();
    if (!g) {
      router.replace("/");
      return;
    }
    setGuest(g);
    // Proactive opening — the hotel speaks first. Scripted, instant.
    setMessages([
      {
        role: "model",
        text: `Welcome to The Grand Neural, ${g.name}. Your minibar was restocked an hour ago with your kind of things, and a heads-up — the rooftop pool closes at 10pm tonight.`,
      },
      {
        role: "model",
        nudge: true,
        text: "One small thing before you settle in: do you have a local data plan, or shall I have an eSIM active on your phone in the next two minutes?",
      },
    ]);
  }, [router]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current); }, []);

  // lift the cog above the chat input bar while this screen is mounted
  const { setCogOffset } = useDevTrace();
  useEffect(() => {
    setCogOffset(86);
    return () => setCogOffset(0);
  }, [setCogOffset]);

  function answerNudge(yes: boolean) {
    setNudgeAnswered(true);
    if (yes) {
      setMessages((m) => [
        ...m,
        { role: "user", text: "Yes please — set up the eSIM." },
        {
          role: "model",
          text: "Done. 10GB local data, active for the length of your stay — it'll appear on your phone within two minutes. Nothing to install, nothing to pay at checkout.",
          actions: [{ type: "provision_esim", detail: "10GB · active for your stay · billed to room ($6)" }],
        },
      ]);
      record({
        appKey: "concierge",
        title: "Provisioned an eSIM before the guest asked",
        model: "rules + Gemini",
        steps: [
          { agentId: "concierge", note: "Recognised the connectivity gap on arrival" },
          { agentId: "connectivity", note: "Provisioned a 10GB local eSIM, billed to room" },
        ],
        sections: [
          { label: "Proactive trigger", body: "Guest checked in from an international origin with no local plan on file → connectivity nudge surfaced automatically.", mono: false },
          { label: "Action emitted", body: '{ "type": "provision_esim", "detail": "10GB · active for your stay · billed to room ($6)" }', mono: true },
        ],
      });
    } else {
      setMessages((m) => [
        ...m,
        { role: "user", text: "I'm covered for data, thanks." },
        { role: "model", text: "Perfect — one less thing. I'm here whenever you need me." },
      ]);
    }
  }

  async function send(text: string) {
    if (!text.trim() || busy || !guest) return;
    setInput("");
    setBusy(true);
    const history = [...messages, { role: "user" as const, text: text.trim() }];
    setMessages([...history, { role: "model", text: "" }]);

    try {
      const t0 = performance.now();
      const res = await fetch("/api/concierge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guestName: guest.name,
          travelStyle: styleOf(guest).label,
          brief: personaOf(guest)?.brief,
          messages: history.map(({ role, text }) => ({ role, text })),
        }),
      });
      if (!res.ok || !res.body) throw new Error("bad response");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let full = "";
      let firstTokenMs = 0;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        if (!firstTokenMs) firstTokenMs = performance.now() - t0;
        full += decoder.decode(value, { stream: true });
        const visible = visibleOf(full);
        setMessages((m) => {
          const copy = [...m];
          copy[copy.length - 1] = { role: "model", text: visible };
          return copy;
        });
      }
      const latencyMs = performance.now() - t0;

      // Split out the visible reply, the action block, and the debug block.
      const visibleText = visibleOf(full).trim();
      let actions: Action[] = [];
      const actIdx = full.indexOf(SENTINEL);
      const dbgIdx = full.indexOf(DEBUG);
      if (actIdx !== -1) {
        const end = dbgIdx !== -1 ? dbgIdx : full.length;
        try {
          actions = JSON.parse(full.slice(actIdx + SENTINEL.length, end).trim()) as Action[];
        } catch {
          actions = [];
        }
      }
      let systemInstruction = "";
      let model = "gemini-2.5-flash";
      if (dbgIdx !== -1) {
        try {
          const dbg = JSON.parse(full.slice(dbgIdx + DEBUG.length).trim());
          systemInstruction = dbg.systemInstruction ?? "";
          model = dbg.model ?? model;
        } catch {
          /* ignore malformed debug */
        }
      }

      setMessages((m) => {
        const copy = [...m];
        copy[copy.length - 1] = { role: "model", text: visibleText, actions: actions.length ? actions : undefined };
        return copy;
      });

      // Signature beat: housekeeping completes a moment later.
      if (actions.some((a) => a.type === "book_housekeeping")) {
        const a = actions.find((x) => x.type === "book_housekeeping");
        toastTimer.current = setTimeout(
          () => setToast(`Your room is freshly made up ✨ (${a?.detail})`),
          12000
        );
      }

      // Record the X-ray trace for this turn.
      const steps: TraceStep[] = [
        { agentId: "concierge", note: "Interpreted intent from natural language" },
      ];
      if (actions.length) {
        for (const a of actions) {
          const m = agentForAction(a.type);
          steps.push({ agentId: m.id, note: m.note });
        }
      } else {
        steps.push({ agentId: "memory", note: `Grounded the reply in ${guest.name}'s profile` });
      }
      record({
        appKey: "concierge",
        title: actions.length ? `Handled "${text.trim().slice(0, 40)}"` : "Answered as the concierge",
        model,
        latencyMs,
        steps,
        sections: [
          { label: "System instruction", body: systemInstruction || "(unavailable)", mono: true },
          { label: "Guest message", body: text.trim(), mono: false },
          { label: "Model reply", body: visibleText || "(empty)", mono: false },
          {
            label: `Actions parsed (${actions.length})`,
            body: actions.length ? JSON.stringify(actions, null, 2) : "[]  — conversational reply, no booking",
            mono: true,
          },
          { label: "Timing", body: `first token ${(firstTokenMs / 1000).toFixed(2)}s · total ${(latencyMs / 1000).toFixed(2)}s · ${AGENTS[steps[steps.length - 1].agentId].label}`, mono: false },
        ],
      });
    } catch {
      setMessages((m) => {
        const copy = [...m];
        copy[copy.length - 1] = {
          role: "model",
          text: "I lost the thread for a second — would you mind sending that again?",
        };
        return copy;
      });
    } finally {
      setBusy(false);
    }
  }

  if (!guest) return null;

  return (
    <main className="flex h-dvh flex-col">
      <AppHeader title="AI Concierge" pillar="already-handled" />

      {toast && (
        <button
          onClick={() => setToast(null)}
          className="toast-in glass-deep fixed left-4 right-4 top-20 z-50 rounded-2xl border-ray-green/40 p-4 text-left shadow-[0_8px_40px_rgba(0,176,87,0.25)]"
        >
          <p className="text-[0.65rem] font-bold uppercase tracking-[0.18em] text-ray-green">
            The Grand Neural
          </p>
          <p className="mt-1 text-sm text-ink">{toast}</p>
        </button>
      )}

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 pt-2">
        <div className="mx-auto flex max-w-lg flex-col gap-3 pb-4">
          {messages.map((msg, i) => (
            <div key={i} className={msg.role === "user" ? "self-end" : "self-start"}>
              <div
                className={`max-w-[82vw] rounded-2xl px-4 py-3 text-[0.92rem] leading-relaxed ${
                  msg.role === "user"
                    ? "rounded-br-md bg-ink text-abyss"
                    : msg.nudge
                      ? "glass-deep rounded-bl-md border-ray-amber/40 shadow-[0_0_24px_rgba(253,184,18,0.12)]"
                      : "glass rounded-bl-md text-ink"
                }`}
              >
                {msg.nudge && (
                  <p className="mb-1 text-[0.6rem] font-bold uppercase tracking-[0.18em] text-ray-amber">
                    Proactive · before you asked
                  </p>
                )}
                {msg.text || (
                  <span className="thinking-dots flex gap-1.5 py-1">
                    <span /><span /><span />
                  </span>
                )}
                {msg.nudge && !nudgeAnswered && (
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => answerNudge(true)}
                      className="press rounded-xl bg-ink px-4 py-2.5 text-[0.8rem] font-semibold text-abyss"
                    >
                      Yes, set it up
                    </button>
                    <button
                      onClick={() => answerNudge(false)}
                      className="press glass rounded-xl px-4 py-2.5 text-[0.8rem] font-semibold text-ink-dim"
                    >
                      I&apos;m covered
                    </button>
                  </div>
                )}
              </div>
              {msg.actions?.map((action, j) => {
                const card = actionCard(action);
                return (
                  <div
                    key={j}
                    className="bloom mt-2 flex items-center gap-3 rounded-2xl border border-ray-green/35 bg-ray-green/10 px-4 py-3"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ray-green/20 text-ray-green">
                      ✓
                    </span>
                    <div className="min-w-0">
                      <p className="text-[0.85rem] font-semibold text-ink">{card.title}</p>
                      {card.body && <p className="text-[0.74rem] text-ink-dim">{card.body}</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <div className="pb-safe px-4 pt-2">
        <div className="mx-auto max-w-lg">
          <div className="mb-2.5 flex gap-2 overflow-x-auto pb-1 [-webkit-overflow-scrolling:touch]">
            {CHIPS.map((chip) => (
              <button
                key={chip}
                onClick={() => send(chip)}
                disabled={busy}
                className="press glass shrink-0 rounded-full px-4 py-2 text-[0.78rem] font-medium text-ink-dim disabled:opacity-40"
              >
                {chip}
              </button>
            ))}
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="glass-deep flex items-center gap-2 rounded-2xl p-1.5 pl-4"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything…"
              className="min-w-0 flex-1 bg-transparent py-2.5 text-[0.95rem] text-ink caret-ray-aqua outline-none placeholder:text-ink-faint"
            />
            <button
              type="submit"
              disabled={busy || !input.trim()}
              className="press flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ink text-abyss transition-opacity disabled:opacity-30"
              aria-label="Send"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M8 13V3M3.5 7.5L8 3l4.5 4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </form>
          <p className="mt-2 flex items-center justify-center gap-1.5 pb-1 text-[0.6rem] uppercase tracking-[0.18em] text-ink-faint">
            <AgodaDots size={3} /> any language · any hour
          </p>
        </div>
      </div>
    </main>
  );
}
