"use client";

import { useEffect, useRef, useState } from "react";
import { Sparkles } from "lucide-react";

// Looping "watch Posterboy work" demo: a rough note types in, Posterboy thinks,
// then the polished version reveals — cycling through a couple of examples
// tailored to the business type. Self-contained and reduced-motion safe.
interface Example {
  prompt: string;
  result: string;
}

const EXAMPLES: Record<string, Example[]> = {
  realtor: [
    {
      prompt: "open house sat 11-1, 3br on oak st",
      result:
        "Open house this Saturday, 11–1 — a light-filled 3-bed on Oak St that feels like home the moment you walk in. Come see it before someone else does.",
    },
    {
      prompt: "just sold in 5 days over ask",
      result:
        "Sold in 5 days, over asking — and on to the next happy ending. Thinking about your own move? Let's talk before spring.",
    },
  ],
  hospitality: [
    {
      prompt: "weekend brunch, 10-2, bottomless coffee",
      result:
        "Weekend brunch is on — 10 to 2, bottomless coffee and the cinnamon rolls that vanish by noon. Pull up a chair, we saved you one.",
    },
    {
      prompt: "new fall latte menu out now",
      result:
        "The fall latte menu just landed — maple, spiced pear, the works. Cozy season starts right here at the counter.",
    },
  ],
  beauty: [
    {
      prompt: "booking spring color, few spots left",
      result:
        "Spring color is filling up — grab your chair while there's still room. A little change, a lot of glow.",
    },
    {
      prompt: "gift cards make great gifts",
      result:
        "Stuck on a gift? A little self-care never misses. Grab a gift card in-shop or online — we'll wrap the good vibes in.",
    },
  ],
  fitness: [
    {
      prompt: "new 6am class starts monday",
      result:
        "New 6am class kicks off Monday — start the week ahead of it. First one's on us, just bring the grit.",
    },
    {
      prompt: "bring a friend free this week",
      result:
        "Bring-a-friend week is here — your favorite workout's better with a buddy. First class on us for both of you.",
    },
  ],
  healthcare: [
    {
      prompt: "flu shots in, walk-ins welcome",
      result:
        "Flu shots are in — walk in any time this week. Five quiet minutes now beats a week on the couch later.",
    },
    {
      prompt: "now accepting new patients",
      result:
        "We're welcoming new patients this month — same-week appointments and a team that actually listens. Come as you are.",
    },
  ],
  professional: [
    {
      prompt: "free 15 min consult this week",
      result:
        "Got something that's been nagging you? Grab a free 15-minute consult this week — no pitch, just straight answers.",
    },
    {
      prompt: "tax deadline closer than you think",
      result:
        "Tax season sneaks up fast. Let's get ahead of it together — book a spot now and breathe easy come April.",
    },
  ],
  homeServices: [
    {
      prompt: "booking gutter cleaning b4 fall",
      result:
        "Beat the fall rush — we're booking gutter cleanings now. One visit and you can forget about it till spring.",
    },
    {
      prompt: "spring tune-up specials on now",
      result:
        "Spring tune-up season's open — a quick once-over now saves the surprise breakdown later. Booking this week's spots.",
    },
  ],
  default: [
    {
      prompt: "new this week, come see",
      result:
        "Something new just dropped — we've been quietly working on it. Come take a look, the first peek's yours.",
    },
    {
      prompt: "thank you to our regulars",
      result: "To everyone who keeps coming back — thank you. You're the reason we love what we do.",
    },
  ],
};

// Map an industry id (e.g. "food-restaurant", "real-estate") to its examples.
function pickExamples(businessType?: string): Example[] {
  const s = (businessType ?? "").toLowerCase();
  if (s.startsWith("real-estate")) return EXAMPLES.realtor;
  if (s.startsWith("food") || s.startsWith("hospitality")) return EXAMPLES.hospitality;
  if (s.startsWith("beauty")) return EXAMPLES.beauty;
  if (s.startsWith("fitness")) return EXAMPLES.fitness;
  if (s.startsWith("healthcare")) return EXAMPLES.healthcare;
  if (s.startsWith("professional")) return EXAMPLES.professional;
  if (s.startsWith("local-services") || s.startsWith("home")) return EXAMPLES.homeServices;
  return EXAMPLES.default;
}

type Phase = "typing" | "thinking" | "result";

export default function PromptRewriteDemo({ businessType }: { businessType?: string }) {
  const examples = pickExamples(businessType);
  const [idx, setIdx] = useState(0);
  const [typed, setTyped] = useState("");
  const [phase, setPhase] = useState<Phase>("typing");
  const reduced = useRef(false);

  const RESULT = examples[idx % examples.length].result;

  useEffect(() => {
    reduced.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced.current) {
      setIdx(0);
      setTyped(examples[0].prompt);
      setPhase("result");
      return;
    }
    let cancelled = false;
    const timers: number[] = [];
    const at = (fn: () => void, ms: number) => {
      timers.push(window.setTimeout(() => !cancelled && fn(), ms));
    };

    let i = 0;
    const run = () => {
      const ex = examples[i % examples.length];
      setIdx(i % examples.length);
      setTyped("");
      setPhase("typing");
      const speed = 52;
      for (let c = 1; c <= ex.prompt.length; c++) {
        at(() => setTyped(ex.prompt.slice(0, c)), 350 + c * speed);
      }
      const typedDone = 350 + ex.prompt.length * speed;
      at(() => setPhase("thinking"), typedDone + 480);
      at(() => setPhase("result"), typedDone + 480 + 1150);
      at(() => {
        i += 1;
        run();
      }, typedDone + 480 + 1150 + 3800);
    };
    run();

    return () => {
      cancelled = true;
      timers.forEach((t) => clearTimeout(t));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessType]);

  return (
    <div className="prdemo" aria-hidden>
      <div className="prdemo-line">
        <span className="prdemo-who">You</span>
        <span className="prdemo-text">
          {typed}
          {phase === "typing" && !reduced.current ? <span className="prdemo-caret" /> : null}
        </span>
      </div>

      <div className={`prdemo-line prdemo-out ${phase === "typing" ? "" : "show"}`}>
        <span className="prdemo-spark">
          <Sparkles size={14} strokeWidth={2} />
        </span>
        <span className="prdemo-who prdemo-who--pb">Posterboy</span>
        <span className="prdemo-text prdemo-text--pb">
          {phase === "thinking" ? (
            <span className="prdemo-think">
              writing<span className="prdemo-dot" />
              <span className="prdemo-dot" />
              <span className="prdemo-dot" />
            </span>
          ) : (
            RESULT
          )}
        </span>
      </div>

      <style>{`
        .prdemo {
          width: 100%; max-width: 100%; margin: 0;
          background: rgba(255,255,255,0.72);
          backdrop-filter: blur(22px) saturate(1.5); -webkit-backdrop-filter: blur(22px) saturate(1.5);
          border: 1px solid rgba(255,255,255,0.62); border-radius: 18px;
          box-shadow: 0 24px 56px -38px rgba(20,20,40,0.4), inset 0 1px 0 rgba(255,255,255,0.65);
          padding: 16px 18px; text-align: left;
        }
        .prdemo-line { display: flex; gap: 10px; align-items: flex-start; }
        .prdemo-line + .prdemo-line { margin-top: 12px; padding-top: 12px; border-top: 1px solid rgba(20,20,30,0.07); }
        .prdemo-who {
          flex: none; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em;
          color: #9a9aa2; padding-top: 3px; min-width: 56px;
        }
        .prdemo-who--pb { color: #ee2532; min-width: 0; }
        .prdemo-spark { flex: none; color: #ee2532; display: inline-flex; padding-top: 2px; }
        .prdemo-text { font-size: 14px; line-height: 1.5; color: #1c1c1e; min-height: 21px; }
        .prdemo-text--pb { font-weight: 500; }
        .prdemo-caret {
          display: inline-block; width: 2px; height: 1em; margin-left: 1px; vertical-align: -2px;
          background: #ee2532; animation: prCaret 0.9s steps(1) infinite;
        }
        .prdemo-out { opacity: 0; transform: translateY(6px); transition: opacity 0.5s ease, transform 0.5s cubic-bezier(.34,1.4,.64,1); }
        .prdemo-out.show { opacity: 1; transform: translateY(0); }
        .prdemo-think { color: #9a9aa2; font-weight: 500; }
        .prdemo-dot { display: inline-block; width: 3px; height: 3px; margin-left: 2px; border-radius: 50%; background: #9a9aa2; animation: prDot 1.1s infinite; }
        .prdemo-dot:nth-child(2) { animation-delay: 0.15s; }
        .prdemo-dot:nth-child(3) { animation-delay: 0.3s; }
        @keyframes prCaret { 0%,50%{opacity:1} 51%,100%{opacity:0} }
        @keyframes prDot { 0%,100%{opacity:0.3;transform:translateY(0)} 50%{opacity:1;transform:translateY(-2px)} }
        @media (prefers-reduced-motion: reduce) {
          .prdemo-out { opacity: 1; transform: none; transition: none; }
          .prdemo-caret, .prdemo-dot { animation: none; }
        }
      `}</style>
    </div>
  );
}
