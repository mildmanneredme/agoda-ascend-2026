# Intent Engine → rethinking the "empathy" demo

> Brainstorm for replacing/upgrading the **Intent Engine** app (Human-Edge pillar, "I am cared for").
> Status: ideas for discussion — no code changed yet.

## Why the current Intent Engine feels weak

Today it does: detect language → extract intent → route to a department → reply in the guest's language + an English gloss for staff.

It's competent, but for a 2026 audience it lands flat because:

- **"Understands languages" reads as solved.** Translation is a capability people already assume LLMs have, so it doesn't feel like a leap.
- **It demonstrates comprehension, not care.** The pillar is *"I am cared for,"* but the app proves *"I was parsed correctly."* Routing a request to Housekeeping is logistics, not empathy.
- **It overlaps with Concierge + Sentiment Lab.** Both already show NL understanding and task dispatch, so Intent Engine feels like a thinner third copy.
- **No emotional stakes.** Every sample is a neutral service request. Nothing makes you *feel* the hotel cared.

**Design principle for a stronger empathy demo:** show the AI perceiving and responding to the *human state behind the words* — the emotion, the occasion, the unspoken need — and then doing something a kind, attentive human would do. Empathy = perception + restraint + the right gesture.

---

## Concepts (diverge)

### 1. ⭐ The Care Radar — "reads the emotion, not just the request"  *(top pick)*
**Moment:** A guest sends a message or it's pulled from context. The AI surfaces the *emotional subtext* and the unspoken need, not just the literal task.
**What it does:**
- Detects emotional state + intensity (stressed, anxious, grieving, celebrating, exhausted, delighted).
- Infers the *occasion* and what it implies (memorial trip → suppress all upsells, alert staff to quiet warmth; proposal tonight → discreet orchestration; sick child → pharmacy + soft food + a doctor on call).
- Produces: a **care brief for staff** (what's really going on + how to show up), a calibrated **guest reply** in the right register, and **proactive gestures** (or deliberate *restraint*).
**Empathy payoff:** The wow is the AI choosing *not* to upsell, flagging sensitivity, and prompting humans to be human. That's "I am cared for" made visceral.
**Sample inputs:** "We're in town for my mother's funeral." · "It's our 25th anniversary 🥹" · "Honestly just completely fried after this trip." · "My son spiked a fever overnight."
**Build sketch:** Gemini → `{ emotion, intensity, occasion, unspokenNeed, careBrief, guestReply, gestures[], restraint[] }`. Keep multilingual as a quiet bonus (detect + reply in-language) so we *keep the old strength and add the soul.*

### 2. The Quiet Signal — surfacing what guests won't say
**Moment:** Guests rarely complain; they go quiet, hedge, or under-ask. The AI reads weak signals ("it's fine, whatever's easiest", a clipped one-word reply, a declined turndown) and flags likely dissatisfaction *before* it becomes a bad review.
**What it does:** Scores "satisfaction risk" from tone/brevity/politeness-masking, explains the tell, and proposes a low-key check-in.
**Empathy payoff:** Catching the guest who'd never tell you. Pairs naturally with Sentiment Lab (pre-emptive vs post-hoc).

### 3. The Apology Engine — empathy under pressure
**Moment:** Something went wrong. The AI crafts a *genuinely* specific, accountable apology (never templated), calibrated to how upset the guest is and what they value, plus the right remedy and a staff coaching note on tone.
**What it does:** `{ severity, whatWeOwn, apology, remedy, gesture, staffCoaching, recoveryCheck }`.
**Empathy payoff:** Turns the worst moment into the most human one. Very demo-able with an upset message.

### 4. Occasion & Milestone Engine — tasteful, not creepy
**Moment:** Detects birthdays, anniversaries, first trips, graduations, hard anniversaries — and orchestrates *appropriate* touches, with an explicit "is this welcome?" judgment so it never over-steps.
**Empathy payoff:** Shows judgment and taste — the line between delightful and intrusive.

### 5. Empathetic Translation+ (evolve the current app, don't replace)
**Moment:** Keep the multilingual core, but translate **emotion and cultural register**, not just words: detect formality norms, indirectness, face-saving, and respond with culturally-attuned warmth — and tell staff *how* to speak to this guest.
**Empathy payoff:** Lowest-risk upgrade; reframes the existing app from "translator" to "cultural-emotional interpreter." Good fallback if we want to keep the slot.

### 6. Continuity of Care — the guest never re-explains
**Moment:** A sensitive context ("travelling with my elderly father, he tires easily") is captured once and carried across shifts, departments and sister properties, so no one ever makes the guest repeat a painful or private thing.
**Empathy payoff:** Empathy as *memory* — strong, but overlaps with the Memory Engine app; better as a feature than a standalone.

---

## Converge — recommendation

**Build #1 (Care Radar), and fold #5 into it.** Reasons:
- It directly dramatizes the *"I am cared for"* pillar instead of a generic NLU capability.
- The standout beats — **suppressing an upsell**, **flagging sensitivity**, **prompting human warmth** — are things audiences don't expect an AI to do, so it *feels* like a leap.
- Keeping the multilingual detect-and-reply as a sub-layer preserves everything good about today's Intent Engine while adding the emotional core, so we lose nothing.
- It's distinct from Concierge (does tasks), Sentiment Lab (reads reviews after the fact), and Memory (recalls preferences): Care Radar reads *emotional state in the moment*.

**Suggested name/framing:** "Care Radar" or "Reading the Room" — tagline *"It hears what you didn't say."*

**Demo script:** 3-4 colour-coded sample messages spanning grief → celebration → exhaustion → a sick child. For each, show: detected emotion + occasion, the **care brief for staff**, the calibrated reply, and the gestures — with at least one example where the AI's move is *restraint* (no upsell, just kindness).

**Suggested response shape (Gemini structured output):**
```
{
  emotion: "grief" | "joy" | "stress" | "exhaustion" | "anxiety" | ...,
  intensity: 0-100,
  occasion: string,            // "memorial trip", "25th anniversary", ...
  unspokenNeed: string,        // what they actually need but didn't ask for
  careBrief: string,           // for staff: what's going on + how to show up
  guestReply: string,          // calibrated to register (+ native language)
  gestures: string[],          // tasteful proactive touches
  restraint: string[],         // what NOT to do right now (e.g. "no upsell")
  sensitivityFlag: boolean
}
```

**Open questions for you:**
- Replace the Intent Engine entirely, or add Care Radar as a new app and demote Intent Engine?
- Keep multilingual visible (detect + reply in-language), or focus purely on the emotional read?
- How far should proactive *gestures* go in the demo — suggestions only, or show them being "dispatched" like Sentiment Lab does?
