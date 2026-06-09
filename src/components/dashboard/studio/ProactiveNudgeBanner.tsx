"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { useLocationWeather } from "@/hooks/use-location-weather";

export default function ProactiveNudgeBanner() {
  const { place, weather } = useLocationWeather();
  const [dismissed, setDismissed] = useState(false);
  const [stubNote, setStubNote] = useState<string | null>(null);

  if (dismissed) return null;

  const copy = weather && place
    ? `It's ${weather.temp}° in ${place.label} — draft a timely post while engagement is warm.`
    : "Posterboy can suggest timely posts based on your location and calendar.";

  function handleNudgeClick() {
    // Phase 2 scaffold — future: open intent picker pre-filled from weather + events.
    setStubNote("Smart nudges are coming soon — weather and calendar hooks will land here.");
  }

  return (
    <div className="pb-nudge-banner">
      <button type="button" className="pb-nudge-main" onClick={handleNudgeClick}>
        <Sparkles size={15} />
        <span>{copy}</span>
      </button>
      <button
        type="button"
        className="pb-nudge-dismiss"
        onClick={() => setDismissed(true)}
        aria-label="Dismiss nudge"
      >
        Dismiss
      </button>
      {stubNote ? <p className="pb-nudge-stub">{stubNote}</p> : null}
      <style>{`
        .pb-nudge-banner {
          position: absolute; top: 56px; left: 50%; transform: translateX(-50%);
          z-index: 12; width: min(560px, calc(100% - 32px));
          display: flex; flex-direction: column; gap: 6px;
        }
        .pb-nudge-main {
          display: flex; align-items: flex-start; gap: 10px; width: 100%;
          padding: 10px 14px; border-radius: 14px; text-align: left;
          border: 1px solid rgba(238,37,50,0.2); background: rgba(255,255,255,0.92);
          box-shadow: 0 8px 24px rgba(15,15,20,0.08); font-size: 12.5px;
          line-height: 1.45; color: rgba(22,22,28,0.82);
        }
        .pb-nudge-main svg { flex: none; margin-top: 2px; color: #c41e2a; }
        .pb-nudge-dismiss {
          align-self: flex-end; font-size: 10px; font-weight: 600;
          text-transform: uppercase; letter-spacing: 0.06em;
          color: rgba(22,22,28,0.4); padding: 2px 4px;
        }
        .pb-nudge-dismiss:hover { color: rgba(22,22,28,0.7); }
        .pb-nudge-stub {
          margin: 0; padding: 8px 12px; border-radius: 10px;
          background: rgba(0,0,0,0.04); font-size: 11px; color: rgba(22,22,28,0.6);
        }
      `}</style>
    </div>
  );
}
