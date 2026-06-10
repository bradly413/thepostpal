"use client";

import { Sparkles } from "lucide-react";
import { scheduleMarketingScrollRefresh } from "@/lib/marketing-scroll-engine";

const POST_SRC = "/images/social-mocks/02.png";

const KICKER = "The creator studio";
const HEADLINE = "A quick photo. A finished post.";
const LEDE =
  "Drop a snapshot from your phone. Posterboy reads it, writes the caption in your voice, and styles it to your brand — a scroll-stopping post, without a photographer or a designer.";

const POINTS = [
  "Turns a quick phone photo into a polished post",
  "Writes the caption for you, in your voice",
  "Styled to match your brand",
];

const CALLOUTS = ["Read your photo", "Matched your colors", "Wrote the caption"];

/**
 * AI Creator Studio — the trash-to-treasure pitch. Editorial copy on the left;
 * a finished post on the right framed as "Posterboy made this from one quick
 * photo." Motion via the shared [data-reveal] system.
 */
export default function DashboardZoomSection() {
  return (
    <section
      id="studio"
      className="pb-dash-zoom"
      aria-label="The Posterboy creator studio — turn a phone photo into a finished post"
    >
      <div className="pb-dash-zoom-stage">
        <div className="pb-dash-zoom-copy">
          <p className="pb-dash-zoom-kicker studio-kicker" data-reveal="up-sm">{KICKER}</p>
          <h2 className="pb-dash-zoom-headline type-display" data-reveal>{HEADLINE}</h2>
          <p className="pb-dash-zoom-lede" data-reveal>{LEDE}</p>
          <ul className="studio-points">
            {POINTS.map((p) => (
              <li key={p} data-reveal="up-sm">{p}</li>
            ))}
          </ul>
        </div>

        <div className="pb-dash-zoom-canvas">
          <div className="studio-card" data-reveal="up-lg" aria-label="A finished post made by Posterboy">
            <div className="studio-shot">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                className="studio-post"
                src={POST_SRC}
                alt="A finished, on-brand social post created by Posterboy"
                loading="lazy"
                decoding="async"
                onLoad={() => scheduleMarketingScrollRefresh(100)}
              />
              <span className="studio-spark" aria-hidden>
                <Sparkles size={16} strokeWidth={1.75} />
              </span>
            </div>

            <div className="studio-cap">
              <span className="studio-cap-spark" aria-hidden>
                <Sparkles size={15} strokeWidth={1.75} />
              </span>
              <span>
                <span className="studio-cap-label">Made by Posterboy</span> from one quick photo
                of the shop.
              </span>
            </div>

            <div className="studio-callouts" aria-hidden>
              {CALLOUTS.map((c) => (
                <span key={c}>{c}</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .pb-marketing-site #studio { --pb-red: #ee2532; }
        .pb-marketing-site .studio-kicker { color: var(--pb-red); }
        .pb-marketing-site .studio-points {
          list-style: none;
          margin: 1.4em 0 0;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 9px;
        }
        .pb-marketing-site .studio-points li {
          position: relative;
          padding-left: 22px;
          font-size: 14.5px;
          line-height: 1.5;
          color: color-mix(in srgb, var(--ink) 72%, transparent);
        }
        .pb-marketing-site .studio-points li::before {
          content: "";
          position: absolute;
          left: 3px;
          top: 0.55em;
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--pb-red);
        }

        .pb-marketing-site .studio-card {
          width: 100%;
          max-width: clamp(340px, 36vw, 460px);
          margin: 0 auto;
          background: var(--white);
          border: 1px solid var(--newsprint);
          border-radius: 22px;
          overflow: hidden;
          box-shadow: 0 28px 64px -34px rgba(15,15,20,0.32), 0 8px 20px -14px rgba(15,15,20,0.14);
        }
        .pb-marketing-site .studio-shot { position: relative; }
        .pb-marketing-site .studio-post {
          display: block;
          width: 100%;
          height: auto;
          vertical-align: top;
        }
        .pb-marketing-site .studio-spark {
          position: absolute;
          top: 14px;
          right: 14px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 30px;
          height: 30px;
          border-radius: 50%;
          background: var(--pb-red);
          color: var(--white);
          box-shadow: 0 8px 20px -8px rgba(238,37,50,0.7);
        }
        .pb-marketing-site .studio-cap {
          display: flex;
          gap: 9px;
          padding: 13px 16px;
          border-top: 1px solid var(--newsprint);
          font-size: 13.5px;
          line-height: 1.55;
          color: color-mix(in srgb, var(--ink) 72%, transparent);
        }
        .pb-marketing-site .studio-cap-spark { flex: none; color: var(--pb-red); display: inline-flex; margin-top: 1px; }
        .pb-marketing-site .studio-cap-label { font-weight: 600; color: var(--pb-red); }
        .pb-marketing-site .studio-callouts {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          padding: 0 16px 16px;
        }
        .pb-marketing-site .studio-callouts span {
          font-size: 11.5px;
          color: var(--quiet-sage);
          background: color-mix(in srgb, var(--paper) 55%, var(--white));
          border: 1px solid var(--newsprint);
          border-radius: 999px;
          padding: 4px 10px;
        }
      `}</style>
    </section>
  );
}
