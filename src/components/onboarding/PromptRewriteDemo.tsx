"use client";

import { useEffect, useRef, useState } from "react";
import { Sparkles } from "lucide-react";

// A tiny looping "watch Posterboy work" demo: a rough note types in, Posterboy
// thinks for a beat, then the polished, on-brand version reveals. The example
// adapts to the selected business type. Self-contained and reduced-motion safe.
interface Example {
  prompt: string;
  result: string;
}

const EXAMPLES: Record<string, Example> = {
  realtor: {
    prompt: "open house sat 11-1, 3br on oak st",
    result:
      "Open house this Saturday, 11–1 — a light-filled 3-bed on Oak St that feels like home the moment you walk in. Come see it before someone else does.",
  },
  hospitality: {
    prompt: "weekend brunch, 10-2, bottomless coffee",
    result:
      "Weekend brunch is on — 10 to 2, bottomless coffee and the cinnamon rolls that vanish by noon. Pull up a chair, we saved you one.",
  },
  beauty: {
    prompt: "booking spring color, few spots left",
    result:
      "Spring color is filling up — grab your chair while there's still room. A little change, a lot of glow.",
  },
  fitness: {
    prompt: "new 6am class starts monday",
    result:
      "New 6am class kicks off Monday — start the week ahead of it. First one's on us, just bring the grit.",
  },
  healthcare: {
    prompt: "flu shots in, walk-ins welcome",
    result:
      "Flu shots are in — walk in any time this week. Five quiet minutes now beats a week on the couch later.",
  },
  professional: {
    prompt: "free 15 min consult this week",
    result:
      "Got something that's been nagging you? Grab a free 15-minute consult this week — no pitch, just straight answers.",
  },
  homeServices: {
    prompt: "booking gutter cleaning b4 fall",
    result:
      "Beat the fall rush — we're booking gutter cleanings now. One visit and you can forget about it till spring.",
  },
};
EXAMPLES.default = EXAMPLES.hospitality;

// Map a compliance vertical slug (e.g. "real-estate-residential-sales",
// "hospitality-restaurants") to the closest example by its root.
function pickExample(businessType?: string): Example {
  const s = (businessType ?? "").toLowerCase();
  if (s.startsWith("real-estate")) return EXAMPLES.realtor;
  if (s.startsWith("hospitality")) return EXAMPLES.hospitality;
  if (s.startsWith("beauty")) return EXAMPLES.beauty;
  if (s.startsWith("fitness")) return EXAMPLES.fitness;
  if (s.startsWith("healthcare")) return EXAMPLES.healthcare;
  if (s.startsWith("professional")) return EXAMPLES.professional;
  if (s.startsWith("local-services") || s.startsWith("home")) return EXAMPLES.homeServices;
  return EXAMPLES.default;
}

type Phase = "typing" | "thinking" | "result";

export default function PromptRewriteDemo({ businessType }: { businessType?: string }) {
  const { prompt: PROMPT, result: RESULT } = pickExample(businessType);
  const [typed, setTyped] = useState("");
  const [phase, setPhase] = useState<Phase>("typing");
  const reduced = useRef(false);

  useEffect(() => {
    reduced.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced.current) {
      setTyped(PROMPT);
      setPhase("result");
      return;
    }
    let cancelled = false;
    const timers: number[] = [];
    const at = (fn: () => void, ms: number) => {
      timers.push(window.setTimeout(() => !cancelled && fn(), ms));
    };

    const run = () => {
      setTyped("");
      setPhase("typing");
      const speed = 52;
      for (let i = 1; i <= PROMPT.length; i++) {
        at(() => setTyped(PROMPT.slice(0, i)), 350 + i * speed);
      }
      const typedDone = 350 + PROMPT.length * speed;
      at(() => setPhase("thinking"), typedDone + 480);
      at(() => setPhase("result"), typedDone + 480 + 1150);
      at(run, typedDone + 480 + 1150 + 3800);
    };
    run();

    return () => {
      cancelled = true;
      timers.forEach((t) => clearTimeout(t));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [PROMPT, RESULT]);

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
