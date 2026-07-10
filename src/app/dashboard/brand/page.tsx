"use client";

import { useState, useEffect, useRef, useMemo, createContext, useContext, type CSSProperties, type ReactNode } from "react";
import Link from "next/link";
import {
  type BrandBookTier,
  TIER_LABEL,
  TIER_BLURB,
  isSectionUnlocked,
  sectionRequiredTier,
  nextTier,
  parseTier,
} from "@/lib/brand-book-tiers";
import type {
  BrandBook,
  BrandPalette,
  BrandTypography,
  BrandVoice,
  PhotographyStyle,
  ContentPillar,
  BrandApplications,
  VoiceTrait,
  Tagline,
} from "@/lib/brand-book-schema";
import { SITE_NAME } from "@/lib/site";
import { applyCuratedPaletteToBook } from "@/lib/color-registry";
import { useBrandBook } from "@/lib/use-brand-book";
import RegenerateBrandButton from "@/components/dashboard/brand/RegenerateBrandButton";
import LearnVoiceFromDocs from "@/components/dashboard/brand/LearnVoiceFromDocs";
import CollateralPromptsSection from "@/components/dashboard/brand/CollateralPromptsSection";
import LocationSwitcher from "@/components/LocationSwitcher";
import { usePlanFeatures } from "@/components/dashboard/PlanProvider";
import { ErrorState, SkeletonText, EmptyState } from "@/components/dashboard/StateViews";

/* eslint-disable @next/next/no-img-element */

/* ═══════════════════════════════════════════════════════════════
   DESIGN TOKENS — injected as CSS custom properties from the
   brand book palette. Follows the RECREATION-GUIDE-TEMPLATE
   editorial spec: 4-color system, 0.5px hairlines, wide-tracked
   caps, giant serif headlines, two directions.
   ═══════════════════════════════════════════════════════════════ */

function essenceHeadline(industry?: string): ReactNode {
  if (industry === "real-estate") {
    return (
      <>
        It&rsquo;s never just <em style={{ fontStyle: "italic", color: "var(--accent)" }}>about</em> the listing.
      </>
    );
  }
  if (industry === "food-restaurant") {
    return (
      <>
        It&rsquo;s never just <em style={{ fontStyle: "italic", color: "var(--accent)" }}>about</em> the menu.
      </>
    );
  }
  return (
    <>
      It&rsquo;s never just <em style={{ fontStyle: "italic", color: "var(--accent)" }}>about</em> the post.
    </>
  );
}

function photographyHeadline(industry?: string): ReactNode {
  if (industry === "real-estate") {
    return (
      <>
        Less listing photo, more <em style={{ fontStyle: "italic", color: "var(--accent)" }}>editorial</em> spread.
      </>
    );
  }
  return (
    <>
      Less stock, more <em style={{ fontStyle: "italic", color: "var(--accent)" }}>real</em> moments.
    </>
  );
}

const SECTIONS = [
  { id: "essence", no: "01", label: "Essence" },
  { id: "voice", no: "02", label: "Voice" },
  { id: "logo", no: "03", label: "Logo" },
  { id: "color", no: "04", label: "Color" },
  { id: "typography", no: "05", label: "Typography" },
  { id: "photography", no: "06", label: "Photography" },
  { id: "applications", no: "07", label: "In Use" },
];

const FALLBACK_PALETTE: BrandPalette = {
  ink: { name: "Ink", hex: "#1A1814", role: "primary-dark", rgb: "26, 24, 20" },
  bone: { name: "Bone", hex: "#F5F0E8", role: "primary-light", rgb: "245, 240, 232" },
  signal: { name: "Signal", hex: "#ee2532", role: "accent", rgb: "238, 37, 50" },
  muted: { name: "Muted", hex: "#9A9288", role: "accent", rgb: "154, 146, 136" },
  proportion: { ink: 15, bone: 55, signal: 10, muted: 20 },
};

function useTokens(palette: BrandPalette) {
  return {
    "--primary": palette.ink.hex,
    "--primary-deep": darken(palette.ink.hex, 0.08),
    "--canvas": palette.bone.hex,
    "--canvas-warm": warmShift(palette.bone.hex),
    "--paper": lighten(palette.bone.hex, 0.02),
    "--neutral": palette.muted.hex,
    "--neutral-soft": lighten(palette.muted.hex, 0.15),
    "--accent": palette.signal.hex,
    "--accent-deep": darken(palette.signal.hex, 0.1),
    "--ink": "#1A1814",
    "--rule": `rgba(${hexToRgb(palette.muted.hex)}, .35)`,
  } as Record<string, string>;
}

export default function BrandPage() {
  const features = usePlanFeatures();
  const { book, locationId, onboardingAnswers, loading, error, reload } = useBrandBook();
  const [activeSec, setActiveSec] = useState("essence");
  const [userTier, setUserTier] = useState<BrandBookTier>("basic");
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Tier source: persisted Organization.accountSettings.brandBookTier (set by the
  // upgrade/billing flow — Gemini). `?tier=` overrides it for preview/QA.
  useEffect(() => {
    const urlTier = new URLSearchParams(window.location.search).get("tier");
    if (urlTier) {
      setUserTier(parseTier(urlTier));
      return;
    }
    let cancelled = false;
    fetch("/api/account/settings", { credentials: "same-origin" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (cancelled) return;
        const t = (d?.settings as { brandBookTier?: string } | null | undefined)?.brandBookTier;
        if (t) setUserTier(parseTier(t));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    document.title = `My Brand | ${SITE_NAME}`;
  }, []);

  useEffect(() => {
    if (!book) return;
    const ids = SECTIONS.map((s) => s.id);
    const els = ids.map((id) => document.getElementById(id)).filter(Boolean) as HTMLElement[];
    if (!els.length) return;
    observerRef.current = new IntersectionObserver(
      (entries) => { entries.forEach((e) => { if (e.isIntersecting) setActiveSec(e.target.id); }); },
      { rootMargin: "-35% 0px -55% 0px", threshold: 0 },
    );
    els.forEach((el) => observerRef.current!.observe(el));
    return () => observerRef.current?.disconnect();
  }, [book]);

  useEffect(() => {
    if (!book) return;
    const { typography } = book;
    const families = [typography.display.family, typography.body.family]
      .filter(Boolean)
      .map((f) => f.replace(/ /g, "+"))
      .map((f) => `family=${f}:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400;1,500;1,600`)
      .join("&");
    const href = `https://fonts.googleapis.com/css2?${families}&display=swap`;
    if (!document.querySelector(`link[href="${href}"]`)) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = href;
      document.head.appendChild(link);
    }
  }, [book]);

  const migrated = useMemo(
    () => (book ? migrateBrandBook(applyCuratedPaletteToBook(book)) : null),
    [book],
  );
  const palette = migrated?.palette ?? FALLBACK_PALETTE;
  const tokens = useTokens(palette);

  if (loading) {
    return (
      <div className="pb-app p-6">
        <SkeletonText className="mb-4 h-10 w-48" />
        <SkeletonText className="h-64 w-full rounded-[24px]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="pb-app p-6">
        <ErrorState message={error} onRetry={() => void reload()} />
      </div>
    );
  }

  if (!book) {
    return (
      <div className="pb-app p-6">
        <EmptyState
          title="No brand book yet"
          sub="Complete onboarding to generate your personalized brand guidelines."
          action={
            <Link href="/onboarding" className="pb-btn-primary text-sm px-5 py-2">
              Start onboarding
            </Link>
          }
        />
      </div>
    );
  }

  const brandBook = migrated!;
  const {
    identity: rawIdentity,
    glance,
    typography,
    voice,
    mark,
    photography,
    pillars,
    applications,
    collateralPrompts,
  } = brandBook;
  // Title-case the display name so lowercase input ("brad") doesn't read as
  // "the brad brand". Only fully-lowercase words are capitalized (McDonald, iPhone stay).
  const identity = {
    ...rawIdentity,
    name: (rawIdentity.name ?? "").replace(/\S+/g, (w) =>
      w === w.toLowerCase() ? w.charAt(0).toUpperCase() + w.slice(1) : w,
    ),
  };
  const serif = `'${typography.display.family}', Georgia, serif`;
  const sans = `'${typography.body.family}', system-ui, sans-serif`;

  return (
    <TierContext.Provider value={userTier}>
    <main role="article" aria-label="Brand Guidelines" style={{ ...tokens, "--font-serif": serif, "--font-sans": sans, background: "var(--canvas)", color: "var(--ink)", fontFamily: "var(--font-sans)", fontWeight: 400, lineHeight: 1.55, WebkitFontSmoothing: "antialiased" } as CSSProperties}>
      <SideToc active={activeSec} palette={palette} />

      {/* 00 · COVER */}
      <CoverEditorial identity={identity} palette={palette} typography={typography} createdAt={brandBook.createdAt} voice={voice} />

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 clamp(24px, 4vw, 64px)" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            alignItems: "flex-start",
            gap: 10,
            padding: "20px 0 8px",
            position: "sticky",
            top: 12,
            zIndex: 30,
          }}
        >
          <LearnVoiceFromDocs locationId={locationId} onLearned={reload} />
          <RegenerateBrandButton
            book={brandBook}
            locationId={locationId}
            onboardingAnswers={onboardingAnswers}
            onRegenerated={reload}
          />
        </div>
        <UpgradeBanner tier={userTier} />
        {userTier === "premium" && (
          <div className="brand-print-hide" style={{ marginTop: 24 }}>
            <button
              type="button"
              onClick={() => window.print()}
              style={{ display: "inline-flex", alignItems: "center", gap: 9, padding: "11px 24px", borderRadius: 999, border: "1px solid var(--primary)", background: "transparent", color: "var(--primary)", fontWeight: 600, fontSize: 13.5, cursor: "pointer" }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M12 3v12m0 0l-4-4m4 4l4-4M5 21h14" /></svg>
              Download brand book (PDF)
            </button>
          </div>
        )}
        <style>{`
          @media print {
            nav[aria-label="Sections"], .brand-print-hide { display: none !important; }
            * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            section[id] { break-inside: avoid; page-break-inside: avoid; page-break-before: always; }
            section:first-of-type { page-break-before: avoid; }
          }
        `}</style>
        {/* 01 · ESSENCE */}
        <Section id="essence">
          <SecHead no="01" eyebrow="The Essence" title={essenceHeadline(identity.industry)} lede={glance.howWeSound} palette={palette} />
          <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.05fr) minmax(0, 1fr)", gap: "clamp(32px, 5vw, 80px)", alignItems: "start" }}>
            <div style={{ fontSize: 15, lineHeight: 1.72, color: "var(--ink)", maxWidth: "60ch" }}>
              <p style={{ margin: "0 0 1.1em" }}>{glance.story}</p>
              <p style={{ margin: "0 0 1.1em" }}>{glance.whatItIs}</p>
              <p style={{ margin: "0 0 1.1em" }}>{glance.howItWorks}</p>
              <hr style={{ height: 0.5, background: "var(--rule)", border: 0, margin: "40px 0 32px" }} />
              <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "18px 28px", fontSize: 13.5 }}>
                <LabelSm>Target</LabelSm><div>{identity.target || glance.whoItsFor}</div>
                <LabelSm>Markets</LabelSm><div>{identity.markets?.join(", ") || identity.location}</div>
                {(identity.company ?? identity.brokerage) && (
                  <>
                    <LabelSm>
                      {identity.industry === "real-estate" ? "Brokerage" : "Business"}
                    </LabelSm>
                    <div>{identity.company ?? identity.brokerage}</div>
                  </>
                )}
                {identity.experience && <><LabelSm>Experience</LabelSm><div>{identity.experience}</div></>}
              </div>
            </div>
            <div style={{ background: "var(--paper)", border: ".5px solid var(--rule)", padding: 32 }}>
              <LabelSm>Brand Positioning</LabelSm>
              <p style={{ marginTop: 16, fontFamily: "var(--font-serif)", fontStyle: "italic", fontSize: "clamp(18px, 1.8vw, 26px)", lineHeight: 1.5, color: "var(--ink)", opacity: 0.9 }}>
                &ldquo;{glance.howWeSound}&rdquo;
              </p>
            </div>
          </div>
        </Section>

        <DividerMark />

        {/* 02 · VOICE & TONE */}
        <Section id="voice">
          <SecHead no="02" eyebrow="Voice &amp; Tone" title={<>Like advice from a <em style={{ fontStyle: "italic", color: "var(--accent)" }}>trusted</em> friend.</>} lede={voice.hero} palette={palette} />

          {/* Tagline showcase */}
          {voice.taglines && voice.taglines.length > 0 && (
            <div style={{ marginBottom: "clamp(56px, 8vw, 104px)", background: "var(--paper)", padding: "clamp(40px, 6vw, 84px) clamp(28px, 5vw, 72px)", border: ".5px solid var(--rule)" }}>
              <LabelSm>The Taglines — in italic, on the emotional beat</LabelSm>
              <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: "clamp(28px, 3vw, 48px)", marginTop: 28 }}>
                {voice.taglines.map((t: Tagline, i: number) => (
                  <li key={i} style={{ fontFamily: "var(--font-serif)", fontWeight: 400, fontSize: "clamp(28px, 4vw, 56px)", lineHeight: 1.08, letterSpacing: "-.012em", color: "var(--ink)", borderBottom: i < voice.taglines.length - 1 ? ".5px solid var(--rule)" : "none", paddingBottom: i < voice.taglines.length - 1 ? "clamp(28px, 3vw, 48px)" : 0 }}>
                    <span style={{ color: "var(--neutral)" }}>{t.quiet}</span>{" "}
                    <em style={{ fontStyle: "italic", color: "var(--primary)" }}>{t.loud}</em>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Traits + Do/Don't */}
          <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1.1fr)", gap: "clamp(40px, 6vw, 96px)", alignItems: "start" }}>
            <div>
              <LabelSm>Three Traits</LabelSm>
              <ol style={{ listStyle: "none", margin: 0, padding: 0, marginTop: 24 }}>
                {(voice.traits && voice.traits.length > 0
                  ? voice.traits
                  : [{ name: "Always", description: voice.always }, { name: "Sometimes", description: voice.sometimes }, { name: "Never", description: voice.never }]
                ).map((trait: VoiceTrait, i: number) => (
                  <li key={i} style={{ display: "grid", gridTemplateColumns: "40px 1fr", gap: 18, padding: "22px 0", borderTop: ".5px solid var(--rule)", alignItems: "baseline" }}>
                    <span style={{ fontFamily: "var(--font-serif)", fontStyle: "italic", color: "var(--neutral)", fontSize: 18 }}>{String(i + 1).padStart(2, "0")}</span>
                    <div>
                      <div style={{ fontFamily: "var(--font-serif)", fontSize: 22, color: "var(--primary)", marginBottom: 6 }}>{trait.name}</div>
                      <div style={{ fontSize: 14.5, color: "#34302A", lineHeight: 1.6 }}>{trait.description}</div>
                    </div>
                  </li>
                ))}
                <li style={{ borderTop: ".5px solid var(--rule)" }} />
              </ol>
            </div>
            <div style={{ display: "grid", gap: 28 }}>
              <VoiceDoDont kind="do" items={voice.weSay} palette={palette} />
              <VoiceDoDont kind="dont" items={voice.weDontSay} palette={palette} />
            </div>
          </div>

          {collateralPrompts && collateralPrompts.length > 0 && (
            <CollateralPromptsSection prompts={collateralPrompts} />
          )}
        </Section>

        <DividerMark />

        {/* 03 · LOGO */}
        {mark.variants.length > 0 && (
          <Section id="logo">
            <SecHead no="03" eyebrow="The Logo" title={<>Your mark, treated with <em style={{ fontStyle: "italic", color: "var(--accent)" }}>confidence</em>.</>} lede="Treat the logo with generous clear space, consistent sizing, and respect for the approved variants." palette={palette} />
            <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: "clamp(20px, 2.5vw, 32px)", marginBottom: "clamp(40px, 5vw, 72px)" }}>
              <LockupCard variant="primary" title="Primary — on dark" usage={`Reverse on ${palette.ink.name.toLowerCase()}. Use for covers, hero blocks, dark applications.`} palette={palette} mark={mark} />
              <LockupCard variant="canvas" title="Primary — on light" usage={`Default on light. Pair with generous negative space.`} palette={palette} mark={mark} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.05fr) minmax(0, 1fr)", gap: "clamp(40px, 6vw, 96px)", alignItems: "start" }}>
              <ClearSpaceBlock palette={palette} mark={mark} />
              <DontGrid mark={mark} />
            </div>
          </Section>
        )}

        <DividerMark />

        {/* 04 · COLOR */}
        <Section id="color">
          <SecHead no="04" eyebrow="The Palette" title={<>Classic <em style={{ fontStyle: "italic", color: "var(--accent)" }}>trust</em>, warm neutrals.</>} lede={`Four colors, used with discipline. ${palette.ink.name} anchors. ${palette.bone.name} carries. ${palette.muted.name} and ${palette.signal.name} accent.`} palette={palette} />
          <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr 1fr", gap: "clamp(14px, 1.6vw, 20px)" }}>
            {[
              { ...palette.ink, roleLabel: "Primary" },
              { ...palette.bone, roleLabel: "Foundation" },
              { ...palette.muted, roleLabel: "Secondary" },
              { ...palette.signal, roleLabel: "Accent" },
            ].map((c, i) => <Swatch key={i} c={c} hero={i === 0} />)}
          </div>
          <div style={{ marginTop: "clamp(56px, 7vw, 96px)", display: "grid", gridTemplateColumns: "minmax(0, 1.05fr) minmax(0, 1fr)", gap: "clamp(40px, 5vw, 72px)", alignItems: "start" }}>
            <Proportion palette={palette} />
            <Pairings palette={palette} />
          </div>
        </Section>

        <DividerMark />

        {/* 05 · TYPOGRAPHY */}
        <Section id="typography">
          <SecHead no="05" eyebrow="Typography" title={<>A <em style={{ fontStyle: "italic", color: "var(--accent)" }}>high-contrast</em> pairing.</>} lede="Serif handles the heart — sans handles the work. Italics carry the emotional beat." palette={palette} />
          <SerifSpecimen typography={typography} identity={identity} palette={palette} />
          <SansSpecimen typography={typography} identity={identity} />
          <ItalicRule typography={typography} palette={palette} voice={voice} />
        </Section>

        <DividerMark />

        {/* 06 · PHOTOGRAPHY */}
        <Section id="photography">
          <SecHead no="06" eyebrow="Photography" title={photographyHeadline(identity.industry)} lede={photography.description} palette={palette} />
          <div style={{ marginTop: "clamp(48px, 6vw, 84px)", display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "clamp(24px, 2.5vw, 40px)", borderTop: ".5px solid var(--rule)", paddingTop: 36 }}>
            {photography.principles.map((p, i) => (
              <div key={i} style={{ display: "grid", gap: 10 }}>
                <span style={{ fontFamily: "var(--font-serif)", fontStyle: "italic", color: "var(--neutral)", fontSize: 14 }}>{String(i + 1).padStart(2, "0")}</span>
                <div style={{ fontFamily: "var(--font-serif)", fontSize: 22, lineHeight: 1.15, color: "var(--primary)" }}>{p.name}</div>
                <div style={{ fontSize: 13, color: "#5C544A", lineHeight: 1.6 }}>{p.description}</div>
              </div>
            ))}
          </div>
        </Section>

        <DividerMark />

        {/* 07 · IN USE */}
        <Section id="applications">
          <SecHead no="07" eyebrow="In Use" title={<>The brand <em style={{ fontStyle: "italic", color: "var(--accent)" }}>at work</em>.</>} lede="Business card, email signature, yard sign, and post templates — keeping everything consistent." palette={palette} />
          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "clamp(20px, 2.5vw, 32px)" }}>
            <BusinessCard identity={identity} palette={palette} typography={typography} />
            <EmailSig identity={identity} palette={palette} typography={typography} voice={voice} />
          </div>
          <div style={{ marginTop: "clamp(20px, 2.5vw, 32px)", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "clamp(20px, 2.5vw, 32px)" }}>
            <ForSaleSign identity={identity} palette={palette} typography={typography} />
            {applications?.postTemplates?.[0] && (
              <div>
                <PostCard template={applications.postTemplates[0]} palette={palette} typography={typography} />
                <AppLabel>Social Post — {applications.postTemplates[0].name}</AppLabel>
              </div>
            )}
          </div>
          {/* Content pillars */}
          <div style={{ marginTop: "clamp(48px, 6vw, 80px)" }}>
            <LabelSm>Content Pillars</LabelSm>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginTop: 20 }}>
              {pillars.map((p, i) => (
                <div key={i} style={{ background: "var(--paper)", border: ".5px solid var(--rule)", padding: 20 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
                    <span style={{ fontFamily: "var(--font-serif)", fontSize: 18, color: "var(--primary)" }}>{p.name}</span>
                    <span style={{ fontSize: 10, letterSpacing: ".2em", textTransform: "uppercase" as const, color: "var(--accent)" }}>{p.frequency}</span>
                  </div>
                  <div style={{ fontSize: 13, color: "#5C544A", lineHeight: 1.6 }}>{p.description}</div>
                </div>
              ))}
            </div>
          </div>
        </Section>

        {/* COLOPHON */}
        <footer style={{ background: "var(--primary)", color: "var(--canvas)", padding: "clamp(72px, 9vw, 144px) 0 clamp(40px, 5vw, 64px)", margin: "clamp(40px, 6vw, 80px) calc(-1 * clamp(24px, 4vw, 64px))", borderRadius: "16px 16px 0 0", paddingLeft: "clamp(24px, 4vw, 64px)", paddingRight: "clamp(24px, 4vw, 64px)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "clamp(40px, 6vw, 96px)", alignItems: "flex-end" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 18, marginBottom: 24, opacity: 0.55 }}>
                <span style={{ width: 28, height: 0.5, background: "currentColor", display: "inline-block" }} />
                <span style={{ fontSize: 11, fontWeight: 500, letterSpacing: ".32em", textTransform: "uppercase" as const }}>Colophon</span>
              </div>
              <div style={{ fontFamily: "var(--font-serif)", fontWeight: 400, fontSize: "clamp(40px, 5vw, 72px)", lineHeight: 1, letterSpacing: "-.012em" }}>
                <em style={{ fontStyle: "italic" }}>End</em> of Vol.&nbsp;I.
              </div>
              <p style={{ fontFamily: "var(--font-serif)", fontStyle: "italic", fontSize: "clamp(18px, 1.4vw, 22px)", lineHeight: 1.5, opacity: 0.78, maxWidth: "40ch", marginTop: 20 }}>
                {glance.howWeSound}
              </p>
            </div>
            <div style={{ display: "grid", gap: 6, fontSize: 12.5, lineHeight: 1.7, opacity: 0.82 }}>
              <div><strong style={{ fontWeight: 600 }}>{identity.name}</strong> &middot; {identity.title || "Owner"}{(identity.company ?? identity.brokerage) ? ` · ${identity.company ?? identity.brokerage}` : ""}</div>
              <div>{identity.location}</div>
              {identity.phone && <div>{identity.phone}</div>}
              {identity.email && <div>{identity.email}</div>}
              {identity.website && <div>{identity.website}</div>}
            </div>
          </div>
          <div style={{ marginTop: "clamp(56px, 7vw, 96px)", paddingTop: 28, borderTop: ".5px solid rgba(255,255,255,.2)", display: "flex", justifyContent: "space-between", flexWrap: "wrap" as const, gap: 12, fontSize: 10.5, letterSpacing: ".2em", textTransform: "uppercase" as const, opacity: 0.55 }}>
            <span>Brand Guidelines &middot; Vol. I &middot; v1.0</span>
            <span>Set in {typography.display.family} + {typography.body.family}</span>
            <span>&copy; {new Date(brandBook.createdAt).getFullYear()} {identity.name}</span>
          </div>
        </footer>
      </div>
    </main>
    </TierContext.Provider>
  );
}

/* ─────────────────────────────────────────────────────────────
   PRIMITIVES
   ───────────────────────────────────────────────────────────── */

const TierContext = createContext<BrandBookTier>("basic");

function LockIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" style={{ display: "inline-block", verticalAlign: "-3px", marginRight: 8 }}>
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

function LockedSection({ sectionId }: { sectionId: string }) {
  const req = sectionRequiredTier(sectionId);
  return (
    <div
      style={{
        position: "relative",
        borderRadius: 18,
        border: "1px solid var(--rule)",
        background: "rgba(0,0,0,0.018)",
        padding: "clamp(44px, 6vw, 84px)",
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: ".3em", textTransform: "uppercase", color: "var(--neutral)", marginBottom: 16 }}>
        <LockIcon />Locked &middot; {TIER_LABEL[req]}
      </div>
      <h3 style={{ fontFamily: "var(--font-serif)", fontWeight: 400, fontSize: "clamp(28px, 3.4vw, 46px)", lineHeight: 1.05, color: "var(--primary)", margin: 0 }}>
        Unlock with {TIER_LABEL[req]}
      </h3>
      <p style={{ color: "var(--neutral)", maxWidth: "46ch", margin: "16px auto 0", lineHeight: 1.6, fontSize: 15 }}>{TIER_BLURB[req]}</p>
      <a
        href="/dashboard/settings?tab=billing"
        style={{ display: "inline-block", marginTop: 26, padding: "12px 30px", borderRadius: 999, background: "var(--primary)", color: "#fff", fontWeight: 600, fontSize: 14, textDecoration: "none" }}
      >
        Upgrade to {TIER_LABEL[req]}
      </a>
    </div>
  );
}

function UpgradeBanner({ tier }: { tier: BrandBookTier }) {
  const up = nextTier(tier);
  if (!up) return null;
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" as const, gap: 16, marginTop: 28, padding: "15px 22px", borderRadius: 14, border: "1px solid var(--rule)", background: "rgba(0,0,0,0.018)" }}>
      <div style={{ fontSize: 13.5, color: "var(--neutral)", lineHeight: 1.5, maxWidth: "62ch" }}>
        You&rsquo;re on the <strong style={{ color: "var(--primary)", fontWeight: 600 }}>{TIER_LABEL[tier]}</strong> brand book. Unlock <strong style={{ color: "var(--ink)" }}>{TIER_LABEL[up]}</strong> — {TIER_BLURB[up]}
      </div>
      <a href="/dashboard/settings?tab=billing" style={{ flexShrink: 0, padding: "10px 24px", borderRadius: 999, background: "var(--primary)", color: "#fff", fontWeight: 600, fontSize: 13.5, textDecoration: "none" }}>
        Upgrade to {TIER_LABEL[up]}
      </a>
    </div>
  );
}

function Section({ id, children }: { id: string; children: React.ReactNode }) {
  const userTier = useContext(TierContext);
  const unlocked = isSectionUnlocked(id, userTier);
  return (
    <section id={id} style={{ padding: "clamp(80px, 10vw, 140px) 0", scrollMarginTop: 40 }}>
      {unlocked ? children : <LockedSection sectionId={id} />}
    </section>
  );
}

function SecHead({ no, eyebrow, title, lede, palette }: { no: string; eyebrow: string; title: React.ReactNode; lede?: string; palette: BrandPalette }) {
  return (
    <header style={{ marginBottom: 48 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 18, fontSize: 11, fontWeight: 500, letterSpacing: ".32em", textTransform: "uppercase" as const, color: "var(--neutral)", marginBottom: 18 }}>
        <span style={{ color: "var(--primary)" }}>{no}</span>
        <span style={{ width: 28, height: 0.5, background: "var(--neutral)", display: "inline-block" }} aria-hidden="true" />
        <span>{eyebrow}</span>
      </div>
      <h2 style={{ fontFamily: "var(--font-serif)", fontWeight: 400, fontSize: "clamp(40px, 5.6vw, 76px)", lineHeight: 1.02, letterSpacing: "-.012em", margin: 0, color: "var(--primary)", textWrap: "balance" as CSSProperties["textWrap"] }}>{title}</h2>
      {lede && <p style={{ fontFamily: "var(--font-serif)", fontStyle: "italic", fontWeight: 400, fontSize: "clamp(18px, 1.4vw, 22px)", lineHeight: 1.5, color: "var(--neutral)", maxWidth: "56ch", marginTop: 18 }}>{lede}</p>}
    </header>
  );
}

function LabelSm({ children }: { children: React.ReactNode }) {
  return <span style={{ fontSize: 10.5, fontWeight: 500, letterSpacing: ".22em", textTransform: "uppercase" as const, color: "var(--neutral)" }}>{children}</span>;
}

function AppLabel({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 10.5, fontWeight: 500, letterSpacing: ".22em", textTransform: "uppercase" as const, color: "var(--neutral)", marginTop: 12 }}>{children}</div>;
}

function DividerMark() {
  return (
    <div aria-hidden="true" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 22, margin: "0 auto", maxWidth: 600, padding: "4px 0" }}>
      <div style={{ flex: 1, height: 0.5, background: "var(--rule)" }} />
      <span style={{ color: "var(--neutral)", fontFamily: "var(--font-serif)", fontStyle: "italic", fontSize: 18, opacity: 0.6 }}>&middot;</span>
      <div style={{ flex: 1, height: 0.5, background: "var(--rule)" }} />
    </div>
  );
}

function SideToc({ active, palette }: { active: string; palette: BrandPalette }) {
  return (
    <nav className="hidden md:flex" style={{ position: "fixed", right: 22, top: "50%", transform: "translateY(-50%)", flexDirection: "column", gap: 10, zIndex: 50 }} aria-label="Sections">
      {SECTIONS.map((s) => {
        const isActive = active === s.id;
        return (
          <a key={s.id} href={`#${s.id}`} style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", color: isActive ? "var(--primary)" : "var(--neutral)", fontSize: "var(--text-eyebrow)", fontWeight: 600, letterSpacing: "var(--tracking-section)", textTransform: "uppercase" as const, opacity: isActive ? 1 : 0.6, transition: "color var(--duration-standard) var(--ease-standard), opacity var(--duration-standard) var(--ease-standard)" }}>
            <span style={{ display: "inline-block", width: isActive ? 28 : 18, height: isActive ? 1 : 0.5, background: "currentColor", transition: "width var(--duration-standard) var(--ease-standard), height var(--duration-standard) var(--ease-standard), opacity var(--duration-standard) var(--ease-standard)" }} />
            <span className="hidden xl:inline">{s.no} &middot; {s.label}</span>
          </a>
        );
      })}
    </nav>
  );
}

/* ─────────────────────────────────────────────────────────────
   00 · COVER — editorial split layout
   ───────────────────────────────────────────────────────────── */

function CoverEditorial({ identity, palette, typography, createdAt, voice }: { identity: BrandBook["identity"]; palette: BrandPalette; typography: BrandTypography; createdAt: string; voice: BrandVoice }) {
  const year = new Date(createdAt).getFullYear();
  const firstName = identity.name.split(" ")[0];
  const tagline = voice.taglines?.[0];

  return (
    <section style={{ minHeight: "100vh", position: "relative", overflow: "hidden", background: palette.ink.hex, color: palette.bone.hex }}>
      <div style={{ display: "grid", gridTemplateColumns: "1.05fr 1fr", minHeight: "100vh", gap: 0 }}>
        {/* Left — type */}
        <div style={{ padding: "clamp(48px, 6vw, 96px) clamp(36px, 5vw, 88px)", display: "flex", flexDirection: "column", justifyContent: "space-between", gap: 32 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
            <span style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: ".32em", textTransform: "uppercase" as const, color: `${palette.bone.hex}99` }}>{identity.name} &middot; {identity.title || "Owner"}</span>
            <span style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: ".32em", textTransform: "uppercase" as const, color: `${palette.bone.hex}66` }}>{identity.location}</span>
          </div>

          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 18, color: `${palette.bone.hex}88`, marginBottom: 28 }}>
              <span style={{ display: "inline-block", width: 28, height: 0.5, background: "currentColor" }} />
              <span style={{ fontSize: 11, fontWeight: 500, letterSpacing: ".32em", textTransform: "uppercase" as const }}>Brand Guidelines &middot; Volume One &middot; {year}</span>
            </div>
            <h1 style={{ fontFamily: `'${typography.display.family}', serif`, fontWeight: 400, fontSize: "clamp(56px, 8vw, 132px)", lineHeight: 0.94, letterSpacing: "-.02em", margin: 0 }}>
              {tagline ? (
                <>{tagline.quiet}<br /><em style={{ fontStyle: "italic" }}>{tagline.loud}</em></>
              ) : (
                <>What <em style={{ fontStyle: "italic" }}>{firstName}</em><br />Means <em style={{ fontStyle: "italic" }}>to</em> Me.</>
              )}
            </h1>
            <div style={{ marginTop: 36, fontFamily: `'${typography.display.family}', serif`, fontStyle: "italic", fontSize: "clamp(18px, 1.5vw, 24px)", lineHeight: 1.45, color: `${palette.bone.hex}C7`, maxWidth: "38ch" }}>
              A field guide to the voice, marks, palette &amp; pictures of the {identity.name} brand.
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16 }}>
            <span style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: ".32em", textTransform: "uppercase" as const, color: `${palette.bone.hex}80` }}>Prepared by Posterboy</span>
            <span style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: ".32em", textTransform: "uppercase" as const, color: `${palette.bone.hex}66` }}>v1.0 &middot; {year}</span>
          </div>
        </div>

        {/* Right — ambient visual */}
        <div style={{ position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", inset: 0, background: `linear-gradient(135deg, ${palette.signal.hex}22 0%, ${palette.ink.hex}88 50%, ${palette.signal.hex}11 100%)` }} />
          <div style={{ position: "absolute", inset: 0, opacity: 0.04, backgroundImage: `radial-gradient(circle at 30% 70%, ${palette.signal.hex} 0%, transparent 50%)` }} />
          {identity.headshot && <img src={identity.headshot} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0.2, mixBlendMode: "luminosity" }} />}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────
   VOICE — Do / Don't
   ───────────────────────────────────────────────────────────── */

function VoiceDoDont({ kind, items, palette }: { kind: "do" | "dont"; items: string[]; palette: BrandPalette }) {
  const isDo = kind === "do";
  return (
    <div style={{ background: isDo ? `${palette.signal.hex}0F` : `${palette.muted.hex}14`, borderLeft: `2px solid ${isDo ? palette.signal.hex : palette.muted.hex}`, padding: "22px 26px" }}>
      <LabelSm>{isDo ? "Sounds like us" : "Sounds like someone else"}</LabelSm>
      <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 14, marginTop: 14 }}>
        {items.map((q, i) => (
          <li key={i} style={{ fontFamily: "var(--font-serif)", fontStyle: "italic", fontSize: 17, lineHeight: 1.45, color: isDo ? "var(--ink)" : "#7C7368", textDecoration: isDo ? "none" : "line-through", textDecorationColor: "rgba(140,130,118,.4)" }}>
            &ldquo;{q}&rdquo;
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   LOGO
   ───────────────────────────────────────────────────────────── */

function LockupCard({ variant, title, usage, palette, mark }: { variant: "primary" | "canvas"; title: string; usage: string; palette: BrandPalette; mark: BrandBook["mark"] }) {
  const isPrimary = variant === "primary";
  const bg = isPrimary ? palette.ink.hex : palette.bone.hex;
  const logoUrl = mark.variants[0]?.url;
  return (
    <div>
      <div style={{ background: bg, aspectRatio: "5/3", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", border: !isPrimary ? ".5px solid var(--rule)" : "none" }}>
        {logoUrl && <img src={logoUrl} alt={title} style={{ width: "62%", maxWidth: 360, filter: isPrimary ? "brightness(0) invert(1)" : "none" }} />}
      </div>
      <div style={{ marginTop: 14 }}>
        <LabelSm>{title}</LabelSm>
        <div style={{ fontSize: 12.5, color: "#5C544A", lineHeight: 1.55, marginTop: 6 }}>{usage}</div>
      </div>
    </div>
  );
}

function ClearSpaceBlock({ palette, mark }: { palette: BrandPalette; mark: BrandBook["mark"] }) {
  return (
    <div>
      <LabelSm>Clear Space &amp; Minimum Size</LabelSm>
      <div style={{ background: "var(--paper)", border: ".5px solid var(--rule)", padding: 32, position: "relative", marginTop: 18 }}>
        <div style={{ border: `1px dashed ${palette.muted.hex}66`, padding: "clamp(20px, 4vw, 48px)" }}>
          <div style={{ background: palette.ink.hex, padding: "clamp(28px, 5vw, 56px)", display: "flex", justifyContent: "center" }}>
            {mark.variants[0] && <img src={mark.variants[0].url} alt="" style={{ width: "min(360px, 70%)", filter: "brightness(0) invert(1)" }} />}
          </div>
        </div>
        <span style={{ position: "absolute", top: 18, left: "50%", transform: "translateX(-50%)", background: "var(--paper)", padding: "2px 8px", fontSize: 10.5, letterSpacing: ".18em", color: "var(--neutral)", textTransform: "uppercase" as const }}>x &middot; equal to cap-height</span>
      </div>
      <p style={{ fontSize: 13, color: "#5C544A", lineHeight: 1.6, marginTop: 16, maxWidth: "52ch" }}>
        {mark.clearSpace} Minimum digital size <strong style={{ color: "var(--ink)" }}>{mark.minSizePx}px</strong> wide.
      </p>
    </div>
  );
}

function DontGrid({ mark }: { mark: BrandBook["mark"] }) {
  const logoUrl = mark.variants[0]?.url;
  return (
    <div>
      <LabelSm>What to Avoid</LabelSm>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 18 }}>
        {mark.donts.slice(0, 4).map((d, i) => (
          <div key={i} style={{ background: "var(--paper)", border: ".5px solid var(--rule)", position: "relative", padding: 20, aspectRatio: "4/3", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ position: "absolute", top: 10, left: 12, fontSize: 10.5, letterSpacing: ".18em", color: "var(--neutral)", textTransform: "uppercase" as const }}>{d.replace(/^Don't\s+/i, "")}</span>
            <span style={{ position: "absolute", top: 10, right: 12, color: "#B85C5C", fontSize: 14 }}>✕</span>
            {logoUrl && <img src={logoUrl} alt="" style={{ width: "78%", opacity: 0.4, filter: i === 1 ? "hue-rotate(120deg) saturate(2.5)" : i === 2 ? "drop-shadow(4px 6px 8px rgba(0,0,0,.45))" : "none", transform: i === 0 ? "scaleX(1.4)" : "none" }} />}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   COLOR
   ───────────────────────────────────────────────────────────── */

function Swatch({ c, hero }: { c: { name: string; hex: string; role: string; rgb: string; cmyk?: string; pantone?: string; roleLabel?: string }; hero: boolean }) {
  const isLight = isLightColor(c.hex);
  const fg = isLight ? "#1A1A1A" : "#F5F5F5";
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ background: c.hex, color: fg, aspectRatio: hero ? "1.05" : "0.75", padding: "clamp(18px, 2vw, 26px)", display: "flex", flexDirection: "column", justifyContent: "space-between", border: isLight ? ".5px solid var(--rule)" : "none" }}>
        <span style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: ".32em", textTransform: "uppercase" as const, opacity: 0.72 }}>{c.roleLabel || c.role}</span>
        <div>
          <div style={{ fontFamily: "var(--font-serif)", fontWeight: 400, fontSize: hero ? "clamp(28px, 3vw, 38px)" : "clamp(20px, 1.7vw, 24px)", lineHeight: 1.05, letterSpacing: "-.01em" }}>{c.name}</div>
          <div style={{ marginTop: 12, fontSize: 11.5, letterSpacing: ".14em", textTransform: "uppercase" as const, opacity: 0.75, fontVariantNumeric: "tabular-nums" }}>{c.hex}</div>
        </div>
      </div>
      <div style={{ fontSize: 11.5, color: "var(--neutral)", letterSpacing: ".08em", textTransform: "uppercase" as const, display: "grid", gridTemplateColumns: "auto 1fr", columnGap: 10, rowGap: 4 }}>
        <span style={{ color: "#34302A" }}>RGB</span><span>{c.rgb}</span>
        {c.cmyk && <><span style={{ color: "#34302A" }}>CMYK</span><span>{c.cmyk}</span></>}
        {c.pantone && <><span style={{ color: "#34302A" }}>PMS</span><span>{c.pantone}</span></>}
      </div>
    </div>
  );
}

function Proportion({ palette }: { palette: BrandPalette }) {
  return (
    <div>
      <LabelSm>Proportion — how the palette adds up</LabelSm>
      <div style={{ display: "flex", height: 56, border: ".5px solid var(--rule)", marginTop: 18 }}>
        <div style={{ flex: `0 0 ${palette.proportion.bone}%`, background: palette.bone.hex }} />
        <div style={{ flex: `0 0 ${palette.proportion.ink}%`, background: palette.ink.hex }} />
        <div style={{ flex: `0 0 ${palette.proportion.muted}%`, background: palette.muted.hex }} />
        <div style={{ flex: `0 0 ${palette.proportion.signal}%`, background: palette.signal.hex }} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: `${palette.proportion.bone}fr ${palette.proportion.ink}fr ${palette.proportion.muted}fr ${palette.proportion.signal}fr`, marginTop: 10, fontSize: 10.5, letterSpacing: ".14em", textTransform: "uppercase" as const, color: "var(--neutral)" }}>
        <span>{palette.bone.name}&nbsp;&middot;&nbsp;{palette.proportion.bone}%</span>
        <span>{palette.ink.name}&nbsp;&middot;&nbsp;{palette.proportion.ink}%</span>
        <span>{palette.muted.name}&nbsp;&middot;&nbsp;{palette.proportion.muted}%</span>
        <span>{palette.signal.name}&nbsp;&middot;&nbsp;{palette.proportion.signal}%</span>
      </div>
      <p style={{ fontSize: 13, color: "#5C544A", lineHeight: 1.6, marginTop: 22, maxWidth: "52ch" }}>
        The room reads as {palette.bone.name.toLowerCase()}, anchored by {palette.ink.name.toLowerCase()} type and details. {palette.muted.name} softens the edges; {palette.signal.name.toLowerCase()} appears only where emphasis needs grounding.
      </p>
    </div>
  );
}

function Pairings({ palette }: { palette: BrandPalette }) {
  const pairs = [
    { bg: palette.bone.hex, fg: palette.ink.hex, label: `Default — body text on ${palette.bone.name.toLowerCase()}` },
    { bg: palette.ink.hex, fg: palette.bone.hex, label: `Hero — reverse on ${palette.ink.name.toLowerCase()}` },
    { bg: palette.signal.hex, fg: palette.bone.hex, label: `Accent — ${palette.signal.name.toLowerCase()} + light` },
    { bg: palette.muted.hex, fg: palette.bone.hex, label: `Soft canvas — ${palette.muted.name.toLowerCase()}` },
  ];
  return (
    <div>
      <LabelSm>Approved Pairings</LabelSm>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 18 }}>
        {pairs.map((p, i) => (
          <div key={i} style={{ background: p.bg, color: p.fg, padding: "22px 22px 18px", border: ".5px solid var(--rule)", minHeight: 140, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <span style={{ fontFamily: "var(--font-serif)", fontSize: 38, lineHeight: 1, letterSpacing: "-.01em" }}>Aa Bb 123</span>
            <span style={{ fontSize: 10.5, letterSpacing: ".16em", textTransform: "uppercase" as const, opacity: 0.8 }}>{p.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   TYPOGRAPHY
   ───────────────────────────────────────────────────────────── */

function SerifSpecimen({ typography, identity, palette }: { typography: BrandTypography; identity: BrandBook["identity"]; palette: BrandPalette }) {
  return (
    <div style={{ marginBottom: "clamp(48px, 6vw, 88px)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 22, paddingBottom: 14, borderBottom: ".5px solid var(--rule)" }}>
        <div>
          <LabelSm>Primary — Display Serif</LabelSm>
          <div style={{ fontFamily: "var(--font-serif)", fontSize: 28, color: "var(--primary)", marginTop: 6 }}>{typography.display.family}</div>
        </div>
        <div style={{ fontSize: 11, letterSpacing: ".18em", textTransform: "uppercase" as const, color: "var(--neutral)" }}>Headlines &middot; Accents &middot; Italic emphasis</div>
      </div>
      <div style={{ fontFamily: "var(--font-serif)", fontWeight: 400, fontSize: "clamp(72px, 11vw, 168px)", lineHeight: 0.94, letterSpacing: "-.02em", color: "var(--primary)" }}>
        Aa Gg <em style={{ fontStyle: "italic" }}>Home</em>
      </div>
      <div style={{ marginTop: 18, fontSize: 12.5, letterSpacing: ".16em", textTransform: "uppercase" as const, color: "var(--neutral)", display: "flex", flexWrap: "wrap" as const, gap: 22 }}>
        <span>ABCDEFGHIJKLMNOPQRSTUVWXYZ</span><span>abcdefghijklmnopqrstuvwxyz</span><span>0123456789 &amp; .,:;!?</span>
      </div>
      <div style={{ marginTop: 36, display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 28, borderTop: ".5px solid var(--rule)", paddingTop: 28 }}>
        {[
          { sz: 64, lbl: "H1 / Hero", txt: `What ${identity.name.split(" ")[0]} Means.` },
          { sz: 44, lbl: "H2 / Section", txt: "It’s never just…" },
          { sz: 28, lbl: "H3 / Subhead", txt: "A trusted friend." },
          { sz: 20, lbl: "Pull-quote (italic)", txt: "Home.", italic: true },
        ].map((r, i) => (
          <div key={i}>
            <div style={{ fontFamily: "var(--font-serif)", fontSize: r.sz, lineHeight: 1.05, letterSpacing: "-.012em", color: "var(--primary)", fontStyle: r.italic ? "italic" : "normal" }}>{r.txt}</div>
            <div style={{ marginTop: 10, fontSize: 10.5, letterSpacing: ".16em", textTransform: "uppercase" as const, color: "var(--neutral)" }}>{r.lbl} &middot; {r.sz}px</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SansSpecimen({ typography, identity }: { typography: BrandTypography; identity: BrandBook["identity"] }) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 22, paddingBottom: 14, borderBottom: ".5px solid var(--rule)" }}>
        <div>
          <LabelSm>Secondary — Body Sans</LabelSm>
          <div style={{ fontFamily: "var(--font-sans)", fontSize: 28, fontWeight: 500, color: "var(--primary)", marginTop: 6 }}>{typography.body.family}</div>
        </div>
        <div style={{ fontSize: 11, letterSpacing: ".18em", textTransform: "uppercase" as const, color: "var(--neutral)" }}>Body &middot; UI &middot; Wide-tracked labels</div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "clamp(28px, 3vw, 56px)" }}>
        <div>
          <div style={{ fontFamily: "var(--font-sans)", fontSize: 11, letterSpacing: ".32em", textTransform: "uppercase" as const, color: "var(--primary)", fontWeight: 500, marginBottom: 10 }}>{identity.name} &middot; {identity.title || "Owner"}</div>
          <LabelSm>Eyebrow — tracking .32em</LabelSm>
        </div>
        <div>
          <div style={{ fontFamily: "var(--font-sans)", fontSize: 16, lineHeight: 1.6, color: "#34302A" }}>Body copy lives here. Comfortable, generous line-height, and just enough breathing room for a long paragraph to feel inviting.</div>
          <div style={{ marginTop: 10 }}><LabelSm>Body — 16/1.6</LabelSm></div>
        </div>
        <div>
          <div style={{ fontFamily: "var(--font-sans)", fontSize: 13, lineHeight: 1.55, color: "#5C544A" }}>
            <strong style={{ fontWeight: 600, color: "var(--primary)" }}>Caption / fine print.</strong> Used for plate numbers, footnotes, and small UI labels at 12–13px.
          </div>
          <div style={{ marginTop: 10 }}><LabelSm>Caption — 13/1.55</LabelSm></div>
        </div>
      </div>
    </div>
  );
}

function ItalicRule({ typography, palette, voice }: { typography: BrandTypography; palette: BrandPalette; voice: BrandVoice }) {
  if (!voice.italicRule) return null;
  return (
    <div style={{ marginTop: "clamp(48px, 6vw, 80px)", borderTop: ".5px solid var(--rule)", paddingTop: 36 }}>
      <LabelSm>The Italic Rule</LabelSm>
      <div style={{ fontFamily: "var(--font-serif)", fontSize: "clamp(28px, 3.4vw, 44px)", lineHeight: 1.18, color: "var(--ink)", maxWidth: "24ch", marginTop: 16 }}>
        Use <em style={{ fontStyle: "italic", color: "var(--primary)" }}>italic</em> on the emotional word. Never on the verb. Never on three words in a row.
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginTop: 28, maxWidth: 760 }}>
        <div style={{ fontFamily: "var(--font-serif)", fontStyle: "italic", fontSize: 20, color: "var(--primary)", borderLeft: `2px solid ${palette.signal.hex}`, paddingLeft: 16 }}>
          What <em style={{ fontStyle: "italic" }}>Home</em> Means To Me.
        </div>
        <div style={{ fontFamily: "var(--font-serif)", fontStyle: "italic", fontSize: 20, color: "#9A9085", borderLeft: `2px solid ${palette.muted.hex}`, paddingLeft: 16, textDecoration: "line-through", textDecorationColor: "rgba(140,130,118,.5)" }}>
          <em style={{ fontStyle: "italic" }}>What Home Means To</em> Me.
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   APPLICATIONS
   ───────────────────────────────────────────────────────────── */

function BusinessCard({ identity, palette, typography }: { identity: BrandBook["identity"]; palette: BrandPalette; typography: BrandTypography }) {
  return (
    <div>
      <div style={{ display: "grid", gap: 16 }}>
        {/* Front */}
        <div style={{ background: palette.ink.hex, color: palette.bone.hex, aspectRatio: "1.75", padding: "clamp(20px, 2.5vw, 32px)", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <span style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: ".32em", textTransform: "uppercase" as const, opacity: 0.55 }}>{identity.title || "Owner"} &middot; {identity.location}</span>
          <div style={{ fontFamily: `'${typography.display.family}', serif`, fontSize: "clamp(22px, 2.5vw, 34px)", lineHeight: 1.05, letterSpacing: "-.01em" }}>{identity.name}</div>
          <span style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: ".32em", textTransform: "uppercase" as const, opacity: 0.4, alignSelf: "flex-end" }}>Vol. I</span>
        </div>
        {/* Back */}
        <div style={{ background: palette.bone.hex, color: palette.ink.hex, aspectRatio: "1.75", padding: "clamp(20px, 2.5vw, 32px)", border: ".5px solid var(--rule)", display: "grid", gridTemplateColumns: "auto 1fr", columnGap: 22, alignItems: "center" }}>
          <div style={{ fontFamily: `'${typography.display.family}', serif`, fontStyle: "italic", color: palette.signal.hex, fontSize: 56, lineHeight: 1 }}>{identity.name.charAt(0)}</div>
          <div style={{ display: "grid", gap: 6, fontSize: 12.5 }}>
            <div style={{ fontFamily: `'${typography.display.family}', serif`, fontSize: 22, color: palette.ink.hex }}>{identity.name}</div>
            <div style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: ".32em", textTransform: "uppercase" as const, color: palette.muted.hex }}>{identity.title || "Owner"}{(identity.company ?? identity.brokerage) ? ` · ${identity.company ?? identity.brokerage}` : ""}</div>
            <div style={{ color: "#34302A", lineHeight: 1.6, marginTop: 6 }}>
              {identity.phone && <>{identity.phone}<br /></>}
              {identity.email && <>{identity.email}<br /></>}
              {identity.website && <>{identity.website}</>}
            </div>
          </div>
        </div>
      </div>
      <AppLabel>Business Card — 3.5 × 2 in &middot; front + back</AppLabel>
    </div>
  );
}

function EmailSig({ identity, palette, typography, voice }: { identity: BrandBook["identity"]; palette: BrandPalette; typography: BrandTypography; voice: BrandVoice }) {
  const tagline = voice.taglines?.[0] ? `${voice.taglines[0].quiet} ${voice.taglines[0].loud}` : "";
  return (
    <div>
      <div style={{ background: palette.bone.hex, padding: "24px 26px", border: ".5px solid var(--rule)", display: "grid", gridTemplateColumns: "72px 1fr", gap: 18, alignItems: "center", minHeight: 200 }}>
        <div style={{ width: 72, height: 72, overflow: "hidden", borderRadius: "50%", border: ".5px solid var(--rule)", background: palette.ink.hex, display: "flex", alignItems: "center", justifyContent: "center", color: palette.bone.hex }}>
          {identity.headshot ? (
            <img src={identity.headshot} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <span style={{ fontFamily: `'${typography.display.family}', serif`, fontSize: 28 }}>{identity.name.charAt(0)}</span>
          )}
        </div>
        <div style={{ display: "grid", gap: 4 }}>
          <div style={{ fontFamily: `'${typography.display.family}', serif`, fontSize: 22, color: palette.ink.hex, lineHeight: 1 }}>{identity.name}</div>
          <div style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: ".32em", textTransform: "uppercase" as const, color: palette.muted.hex }}>{identity.title || "Owner"}{(identity.company ?? identity.brokerage) ? ` · ${identity.company ?? identity.brokerage}` : ""}</div>
          <div style={{ height: 0.5, background: "var(--rule)", margin: "8px 0" }} />
          <div style={{ fontSize: 12, color: "#34302A", lineHeight: 1.7 }}>
            {identity.phone && <>{identity.phone} &middot; </>}{identity.email}<br />
            {tagline && <em style={{ fontFamily: `'${typography.display.family}', serif`, color: palette.muted.hex, fontStyle: "italic" }}>{tagline}</em>}
          </div>
        </div>
      </div>
      <AppLabel>Email Signature</AppLabel>
    </div>
  );
}

function ForSaleSign({ identity, palette, typography }: { identity: BrandBook["identity"]; palette: BrandPalette; typography: BrandTypography }) {
  return (
    <div>
      <div style={{ background: palette.bone.hex, aspectRatio: "1.3", border: ".5px solid var(--rule)", padding: "clamp(20px, 2vw, 28px)", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div style={{ fontFamily: `'${typography.display.family}', serif`, fontSize: "clamp(16px, 2vw, 22px)", fontWeight: 500, color: palette.ink.hex }}>{identity.name}</div>
          <span style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: ".32em", textTransform: "uppercase" as const, color: palette.muted.hex }}>For Sale</span>
        </div>
        <div style={{ fontFamily: `'${typography.display.family}', serif`, fontSize: "clamp(28px, 3vw, 40px)", lineHeight: 1.05, letterSpacing: "-.012em", color: palette.ink.hex }}>
          A home <em style={{ fontStyle: "italic", color: palette.signal.hex }}>here</em>,<br />guided by {identity.name.split(" ")[0]}.
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", borderTop: ".5px solid var(--rule)", paddingTop: 12 }}>
          <span style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: ".32em", textTransform: "uppercase" as const, color: palette.ink.hex }}>{identity.phone || ""}</span>
          <span style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: ".32em", textTransform: "uppercase" as const, color: palette.muted.hex }}>{identity.website || ""}</span>
        </div>
      </div>
      <AppLabel>Yard Sign &amp; Open-House Card</AppLabel>
    </div>
  );
}

function PostCard({ template, palette, typography }: { template: BrandApplications["postTemplates"][0]; palette: BrandPalette; typography: BrandTypography }) {
  const isDark = template.surface === "dark";
  const bg = isDark ? palette.ink.hex : palette.bone.hex;
  const fg = isDark ? palette.bone.hex : palette.ink.hex;
  return (
    <div style={{ border: ".5px solid var(--rule)" }}>
      <div style={{ background: bg, color: fg, padding: 24, aspectRatio: "4/5", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontSize: 10, letterSpacing: ".28em", textTransform: "uppercase" as const, fontWeight: 500, opacity: 0.6 }}>{template.kicker}</span>
          {template.stamp && <span style={{ fontSize: 10, letterSpacing: ".18em", textTransform: "uppercase" as const, textAlign: "right" as const, whiteSpace: "pre-line", opacity: 0.5 }}>{template.stamp}</span>}
        </div>
        <div style={{ fontFamily: `'${typography.display.family}', serif`, fontSize: "clamp(22px, 2.5vw, 32px)", lineHeight: 1.05, letterSpacing: "-.01em" }}>{template.headlinePattern}</div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontSize: 10, letterSpacing: ".14em", textTransform: "uppercase" as const, opacity: 0.6 }}>{template.footerLeft}</span>
          <span style={{ fontSize: 10, letterSpacing: ".14em", textTransform: "uppercase" as const, opacity: 0.5 }}>{template.footerRight}</span>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   UTILS
   ───────────────────────────────────────────────────────────── */

function migrateBrandBook(book: BrandBook): BrandBook {
  const p = book.palette;
  if (!p.muted) {
    const mid = blendHex(p.ink.hex, p.bone.hex, 0.55);
    (p as BrandPalette).muted = { name: "Soft Gray", hex: mid, role: "accent", rgb: hexToRgbDot(mid) };
  }
  if (!p.proportion.muted) {
    const total = p.proportion.ink + p.proportion.bone + p.proportion.signal;
    (p.proportion as BrandPalette["proportion"]).muted = Math.max(5, 100 - total);
  }
  const v = book.voice;
  if (!v.traits) (v as BrandVoice).traits = [{ name: "Always", description: v.always }, { name: "Sometimes", description: v.sometimes }, { name: "Never", description: v.never }];
  if (!v.taglines) (v as BrandVoice).taglines = [];
  if (!v.italicRule) (v as BrandVoice).italicRule = "Use italic on the emotional word. Never on the verb. Never on three words in a row.";
  return book;
}

function hexToRgb(hex: string): string {
  const c = hex.replace("#", "");
  return `${parseInt(c.substring(0, 2), 16)}, ${parseInt(c.substring(2, 4), 16)}, ${parseInt(c.substring(4, 6), 16)}`;
}

function hexToRgbDot(hex: string): string {
  const c = hex.replace("#", "");
  return `${parseInt(c.substring(0, 2), 16)}·${parseInt(c.substring(2, 4), 16)}·${parseInt(c.substring(4, 6), 16)}`;
}

function blendHex(a: string, b: string, t: number): string {
  const pa = a.replace("#", ""), pb = b.replace("#", "");
  const r = Math.round(parseInt(pa.substring(0, 2), 16) * (1 - t) + parseInt(pb.substring(0, 2), 16) * t);
  const g = Math.round(parseInt(pa.substring(2, 4), 16) * (1 - t) + parseInt(pb.substring(2, 4), 16) * t);
  const bl = Math.round(parseInt(pa.substring(4, 6), 16) * (1 - t) + parseInt(pb.substring(4, 6), 16) * t);
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${bl.toString(16).padStart(2, "0")}`;
}

function darken(hex: string, amount: number): string { return blendHex(hex, "#000000", amount); }
function lighten(hex: string, amount: number): string { return blendHex(hex, "#FFFFFF", amount); }
function warmShift(hex: string): string { return blendHex(hex, "#E8DFD0", 0.15); }

function isLightColor(hex: string): boolean {
  const c = hex.replace("#", "");
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 128;
}
