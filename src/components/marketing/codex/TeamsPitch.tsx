"use client";

import Link from "next/link";
import { CONTACT_EMAIL } from "@/lib/site";

const POINTS = [
  {
    title: "Separate workspace per location",
    body: "Each location gets its own brand kit, calendar, and social connections. No cross-contamination.",
  },
  {
    title: "Centralized approvals",
    body: "Editors draft. Approvers sign off. The feed stays on-brand without freelancing the caption.",
  },
  {
    title: "One bill, many presences",
    body: "Command rolls up multi-location brands under one login — visibility without chaos.",
  },
] as const;

/** Command / multi-location pitch — Munch “for agencies” analog. */
export default function TeamsPitch() {
  return (
    <section className="pb-teams" id="teams" aria-labelledby="pb-teams-title">
      <p className="pb-teams-eyebrow">For teams</p>
      <h2 id="pb-teams-title">
        One platform.
        <br />
        <strong>Every location&rsquo;s social.</strong>
      </h2>
      <p className="pb-teams-lead">
        Multi-location brands need infrastructure, not another freelanced Canva file.
        Command gives each location its own voice and queue — with roll-up visibility for
        the people who own the brand.
      </p>

      <div className="pb-teams-grid">
        {POINTS.map((p) => (
          <article key={p.title} className="pb-teams-card">
            <h3>{p.title}</h3>
            <p>{p.body}</p>
          </article>
        ))}
      </div>

      <div className="pb-teams-cta-row">
        <Link href="/pricing" className="pb-teams-cta">
          See Command pricing
        </Link>
        <a
          href={`mailto:${CONTACT_EMAIL}?subject=Posterboy%20Command`}
          className="pb-teams-link"
        >
          Talk to us about Command
        </a>
      </div>
    </section>
  );
}
