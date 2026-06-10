"use client";

import { scheduleMarketingScrollRefresh } from "@/lib/marketing-scroll-engine";

const KICKER = "The creator studio";
const HEADLINE = "A quick photo. A finished post.";
const LEDE =
  "Drop a snapshot from your phone. Posterboy reads it, writes the caption in your voice, and styles it to your brand. One studio, scroll-stopping posts for every kind of business.";

// A curated wall — range at a glance. Photos and graphics, feed posts and
// stories, across very different businesses.
const POSTS = [
  { src: "/images/social-mocks/02.png", alt: "Florist post made by Posterboy" },
  { src: "/images/social-mocks/06.png", alt: "Design studio post made by Posterboy" },
  { src: "/images/social-mocks/01.png", alt: "Landscaping post made by Posterboy" },
  { src: "/images/social-mocks/04.png", alt: "Wellness story made by Posterboy" },
  { src: "/images/social-mocks/05.png", alt: "Creator post made by Posterboy" },
  { src: "/images/social-mocks/08.png", alt: "Café post made by Posterboy" },
  { src: "/images/social-mocks/03.png", alt: "Home services post made by Posterboy" },
  { src: "/images/social-mocks/07.png", alt: "Design studio post made by Posterboy" },
];

/**
 * AI Creator Studio — a gallery wall of finished posts. Range at a glance:
 * one studio, polished posts for any kind of business. Calm masonry, tiles
 * reveal in on scroll via the shared [data-reveal] system. No cycling.
 */
export default function DashboardZoomSection() {
  return (
    <section
      id="studio"
      className="studio-gal"
      aria-label="The Posterboy creator studio — finished posts for every kind of business"
    >
      <div className="studio-gal-intro">
        <p className="studio-gal-kicker" data-reveal="up-sm">{KICKER}</p>
        <h2 className="type-display studio-gal-title" data-reveal>{HEADLINE}</h2>
        <p className="studio-gal-lede" data-reveal>{LEDE}</p>
      </div>

      <div className="studio-gal-wall" aria-label="A wall of posts made by Posterboy">
        {POSTS.map((p, i) => (
          <figure className="studio-gal-tile" data-reveal="up-sm" key={p.src}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={p.src}
              alt={p.alt}
              loading="lazy"
              decoding="async"
              onLoad={i < 4 ? () => scheduleMarketingScrollRefresh(120) : undefined}
            />
          </figure>
        ))}
      </div>

      <style>{`
        .pb-marketing-site .studio-gal {
          --pb-red: #ee2532;
          background: var(--paper);
          padding: clamp(72px, 12vh, 140px) var(--px);
        }
        .pb-marketing-site .studio-gal-intro {
          max-width: 640px;
          margin: 0 auto clamp(36px, 5vh, 60px);
          text-align: center;
        }
        .pb-marketing-site .studio-gal-kicker { color: var(--pb-red); }
        .pb-marketing-site .studio-gal-title {
          margin: 0.55em 0 0;
          font-size: clamp(30px, 5vw, 56px);
          line-height: 1.04;
          letter-spacing: -0.025em;
        }
        .pb-marketing-site .studio-gal-lede {
          margin: 1.1em auto 0;
          max-width: 54ch;
          font-size: clamp(15px, 1.1vw, 18px);
          line-height: 1.6;
          color: color-mix(in srgb, var(--ink) 64%, transparent);
        }

        .pb-marketing-site .studio-gal-wall {
          max-width: 1120px;
          margin: 0 auto;
          column-count: 4;
          column-gap: clamp(12px, 1.4vw, 20px);
        }
        @media (max-width: 1024px) { .pb-marketing-site .studio-gal-wall { column-count: 3; } }
        @media (max-width: 720px)  { .pb-marketing-site .studio-gal-wall { column-count: 2; } }
        @media (max-width: 420px)  { .pb-marketing-site .studio-gal-wall { column-count: 1; } }

        .pb-marketing-site .studio-gal-tile {
          break-inside: avoid;
          margin: 0 0 clamp(10px, 1.2vw, 18px);
          transition: transform 0.3s ease;
        }
        .pb-marketing-site .studio-gal-tile:hover { transform: translateY(-3px); }
        .pb-marketing-site .studio-gal-tile img {
          display: block;
          width: 100%;
          height: auto;
          vertical-align: top;
          /* The mock PNGs sit on white; multiply melts that white into the
             warm paper so the posts read as a collage, not white cards. */
          mix-blend-mode: multiply;
        }
      `}</style>
    </section>
  );
}
