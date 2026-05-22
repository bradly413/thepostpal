import Link from "next/link";
import { AI_MODULES } from "@/lib/dashboard-modules";

export default function BentoAiStudio() {
  const mod = AI_MODULES[0];

  return (
    <div className="dbento-ai-wrap">
      <Link href={mod.href} className="dbento-card dbento-ai feature">
        <div className="dbento-ai-head">
          <div className="dbento-ai-ic">
            <svg viewBox="0 0 24 24">
              <path d="M12 2l2 6 6 2-6 2-2 6-2-6-6-2 6-2z" />
            </svg>
          </div>
          <span className="dbento-ai-tag">{mod.tag}</span>
        </div>
        <div className="dbento-ai-body">
          <h3>{mod.title}</h3>
          <p>{mod.description}</p>
        </div>
        <span className="dbento-ai-arrow" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="14" height="14">
            <line x1="7" y1="17" x2="17" y2="7" stroke="currentColor" strokeWidth="2.2" />
            <polyline points="7 7 17 7 17 17" fill="none" stroke="currentColor" strokeWidth="2.2" />
          </svg>
        </span>
      </Link>
    </div>
  );
}
