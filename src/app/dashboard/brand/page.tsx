"use client";

import { useState } from "react";
import { brandKnowledge } from "@/lib/brand-knowledge";

/* eslint-disable @next/next/no-img-element */

const bk = brandKnowledge;

const TABS = [
  { id: "essence", label: "Essence" },
  { id: "voice", label: "Voice & Tone" },
  { id: "logo", label: "Logo" },
  { id: "color", label: "Color" },
  { id: "typography", label: "Typography" },
  { id: "photography", label: "Photography" },
  { id: "applications", label: "In Use" },
];

export default function BrandPage() {
  const [activeTab, setActiveTab] = useState("essence");

  return (
    <div className="px-4 py-6 md:px-6">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-text font-heading">My Brand</h1>
          <p className="text-sm text-text-secondary mt-1">
            Brand guidelines for Angie Nichols Realtor
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl overflow-hidden bg-[#0E2547]">
            <img src="/brand/logo-mark.png" alt="Brand Mark" className="w-8 h-8 object-contain" />
          </div>
          <div>
            <p className="text-sm font-semibold text-text">{bk.identity.name}</p>
            <p className="text-xs text-text-secondary">{bk.identity.title} · {bk.identity.brokerage}</p>
          </div>
        </div>
      </div>

      {/* Tab nav */}
      <div className="mb-6 flex gap-1.5 overflow-x-auto rounded-xl bg-surface border border-border p-1" style={{ scrollbarWidth: "none" }}>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`shrink-0 rounded-lg px-3 py-2 text-xs font-semibold transition-all ${
              activeTab === tab.id
                ? "bg-elevated text-text shadow-sm"
                : "text-text-secondary hover:text-text"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="max-w-5xl">
        {activeTab === "essence" && <EssenceTab />}
        {activeTab === "voice" && <VoiceTab />}
        {activeTab === "logo" && <LogoTab />}
        {activeTab === "color" && <ColorTab />}
        {activeTab === "typography" && <TypographyTab />}
        {activeTab === "photography" && <PhotographyTab />}
        {activeTab === "applications" && <ApplicationsTab />}
      </div>
    </div>
  );
}

function SectionHead({ number, title, subtitle }: { number: string; title: string; subtitle: string }) {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[10px] font-bold text-accent tracking-widest uppercase">{number}</span>
        <div className="h-px flex-1 bg-border" />
      </div>
      <h2 className="text-lg font-bold text-text font-heading">{title}</h2>
      <p className="text-sm text-text-secondary mt-1">{subtitle}</p>
    </div>
  );
}

function EssenceTab() {
  return (
    <div className="space-y-6">
      <SectionHead number="01" title="The Essence" subtitle="It's never just about the house." />

      <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-6">
        <div className="rounded-2xl bg-surface border border-border p-6">
          <p className="text-sm text-text leading-relaxed mb-4">{bk.essence.summary}</p>
          <p className="text-sm text-text-secondary leading-relaxed">{bk.essence.description}</p>
          <div className="mt-5 rounded-xl bg-elevated/50 p-4">
            <p className="text-xs font-semibold text-accent mb-1">Positioning</p>
            <p className="text-sm text-text italic">{bk.essence.positioning}</p>
          </div>
        </div>

        <div className="rounded-2xl bg-surface border border-border p-6">
          <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-3">Quick Facts</p>
          <div className="space-y-3">
            {[
              { label: "Target", value: bk.identity.target },
              { label: "Markets", value: bk.identity.markets.join(", ") },
              { label: "Service", value: bk.identity.service },
              { label: "Experience", value: bk.identity.experience },
            ].map((item) => (
              <div key={item.label} className="rounded-xl bg-elevated/50 p-3">
                <p className="text-[10px] font-bold text-accent uppercase tracking-wider mb-1">{item.label}</p>
                <p className="text-xs text-text leading-relaxed">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Hero image */}
      <div className="relative rounded-2xl overflow-hidden aspect-[21/9]">
        <img src="/brand/interior-staircase.jpg" alt="Brand mood" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        <div className="absolute bottom-4 left-5">
          <p className="text-[10px] uppercase tracking-widest text-white/70">Mood — The Threshold</p>
        </div>
      </div>
    </div>
  );
}

function VoiceTab() {
  return (
    <div className="space-y-6">
      <SectionHead number="02" title="Voice & Tone" subtitle="Like advice from a trusted friend." />

      {/* Taglines */}
      <div className="rounded-2xl bg-surface border border-border p-6">
        <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-4">The Taglines</p>
        <div className="space-y-4">
          {bk.voice.taglines.map((t, i) => (
            <p key={i} className="text-lg font-heading text-text italic border-b border-border pb-4 last:border-0 last:pb-0">
              &ldquo;{t}&rdquo;
            </p>
          ))}
        </div>
      </div>

      {/* Traits */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {bk.voice.traits.map((trait, i) => (
          <div key={i} className="rounded-2xl bg-surface border border-border p-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs font-bold text-accent">0{i + 1}</span>
              <h3 className="text-sm font-bold text-text">{trait.name}</h3>
            </div>
            <p className="text-xs text-text-secondary leading-relaxed">{trait.description}</p>
          </div>
        ))}
      </div>

      {/* Do / Don't */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-success/30 bg-success/5 p-5">
          <p className="text-xs font-bold text-success uppercase tracking-wider mb-3">Sounds like us</p>
          <div className="space-y-3">
            {bk.voice.doSay.map((s, i) => (
              <p key={i} className="text-xs text-text leading-relaxed italic pl-3 border-l-2 border-success/40">
                &ldquo;{s}&rdquo;
              </p>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-danger/30 bg-danger/5 p-5">
          <p className="text-xs font-bold text-danger uppercase tracking-wider mb-3">Sounds like someone else</p>
          <div className="space-y-3">
            {bk.voice.dontSay.map((s, i) => (
              <p key={i} className="text-xs text-text-secondary leading-relaxed line-through pl-3 border-l-2 border-danger/40">
                &ldquo;{s}&rdquo;
              </p>
            ))}
          </div>
        </div>
      </div>

      {/* Italic rule */}
      <div className="rounded-2xl bg-surface border border-border p-5">
        <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">The Italic Rule</p>
        <p className="text-sm text-text">{bk.voice.italicRule}</p>
        <div className="grid grid-cols-2 gap-3 mt-4">
          <div className="rounded-xl bg-success/10 border border-success/20 p-3">
            <p className="text-sm text-text italic">What <strong className="text-accent font-bold not-italic">Home</strong> Means To Me.</p>
          </div>
          <div className="rounded-xl bg-danger/10 border border-danger/20 p-3">
            <p className="text-sm text-text-secondary line-through italic">What Home Means To Me.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function LogoTab() {
  return (
    <div className="space-y-6">
      <SectionHead number="03" title="The Logo" subtitle="A single letter that does the work." />

      {/* Primary lockups */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-2xl bg-surface border border-border overflow-hidden">
          <div className="flex items-center justify-center p-10 bg-[#0E2547]" style={{ aspectRatio: "5/3" }}>
            <img src="/brand/logo-white.png" alt="Logo on Navy" className="object-contain" />
          </div>
          <div className="p-4">
            <p className="text-xs font-semibold text-text">Primary — on Navy</p>
            <p className="text-[11px] text-text-secondary mt-1">Reverse on signature navy. Use for covers, leave-behinds, dark applications.</p>
          </div>
        </div>
        <div className="rounded-2xl bg-surface border border-border overflow-hidden">
          <div className="flex items-center justify-center p-10 bg-[#F6F4EF] border-b border-border" style={{ aspectRatio: "5/3" }}>
            <img src="/brand/logo-navy.png" alt="Logo on Parchment" className="object-contain" />
          </div>
          <div className="p-4">
            <p className="text-xs font-semibold text-text">Primary — on Parchment</p>
            <p className="text-[11px] text-text-secondary mt-1">Default on light. Pair with generous negative space; never on busy imagery.</p>
          </div>
        </div>
      </div>

      {/* Secondary lockups */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-2xl bg-surface border border-border overflow-hidden">
          <div className="flex items-center justify-center p-8 bg-[#4A5340]" style={{ aspectRatio: "4/3" }}>
            <img src="/brand/logo-white.png" alt="Logo on Moss" className="object-contain" />
          </div>
          <div className="p-3">
            <p className="text-xs font-semibold text-text">Accent — on Moss</p>
            <p className="text-[11px] text-text-secondary mt-1">Seasonal or editorial moments only.</p>
          </div>
        </div>
        <div className="rounded-2xl bg-surface border border-border overflow-hidden">
          <div className="relative flex items-center justify-center" style={{ aspectRatio: "4/3" }}>
            <img src="/brand/streetscape.jpg" alt="" className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-b from-black/10 to-black/45" />
            <img src="/brand/logo-white.png" alt="Logo over imagery" className="relative object-contain" />
          </div>
          <div className="p-3">
            <p className="text-xs font-semibold text-text">Reverse over Imagery</p>
            <p className="text-[11px] text-text-secondary mt-1">Photo must read calm. 16-20% of frame width.</p>
          </div>
        </div>
        <div className="rounded-2xl bg-surface border border-border overflow-hidden">
          <div className="flex items-center justify-center p-8 bg-[#0E2547]" style={{ aspectRatio: "4/3" }}>
            <img src="/brand/logo-mark.png" alt="Standalone mark" className="object-contain" />
          </div>
          <div className="p-3">
            <p className="text-xs font-semibold text-text">Standalone Mark</p>
            <p className="text-[11px] text-text-secondary mt-1">Favicons, watermarks, tight crops.</p>
          </div>
        </div>
      </div>

      {/* Clear space */}
      <div className="rounded-2xl bg-surface border border-border p-5">
        <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-3">Clear Space & Minimum Size</p>
        <p className="text-sm text-text">{bk.logos.clearSpace}</p>
        <div className="flex gap-4 mt-3">
          <div className="rounded-lg bg-elevated/50 px-3 py-2">
            <p className="text-[10px] text-text-secondary uppercase tracking-wider">Full lockup min</p>
            <p className="text-sm font-bold text-text">{bk.logos.minSize.fullLockup}</p>
          </div>
          <div className="rounded-lg bg-elevated/50 px-3 py-2">
            <p className="text-[10px] text-text-secondary uppercase tracking-wider">Standalone mark min</p>
            <p className="text-sm font-bold text-text">{bk.logos.minSize.standaloneMark}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ColorTab() {
  return (
    <div className="space-y-6">
      <SectionHead number="04" title="The Palette" subtitle="Classic trust, warm neutrals. Four colors, used with discipline." />

      {/* Swatches */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {bk.colors.map((c, i) => (
          <div key={i} className="rounded-2xl bg-surface border border-border overflow-hidden">
            <div
              className="p-5 flex flex-col justify-between"
              style={{
                backgroundColor: c.hex,
                color: c.hex === "#F6F4EF" ? "#0E2547" : "#F6F4EF",
                aspectRatio: i === 0 ? "1.05" : "0.85",
              }}
            >
              <span className="text-[10px] uppercase tracking-widest opacity-70">{c.role}</span>
              <div>
                <p className="text-base font-heading font-bold">{c.name}</p>
                <p className="text-[11px] uppercase tracking-wider opacity-70 mt-1">{c.hex}</p>
              </div>
            </div>
            <div className="p-3 space-y-1.5">
              <div className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5 text-[10px] text-text-secondary">
                <span className="font-semibold text-text">PMS</span><span>{c.pantone}</span>
                <span className="font-semibold text-text">CMYK</span><span>{c.cmyk}</span>
                <span className="font-semibold text-text">RGB</span><span>{c.rgb}</span>
              </div>
              <p className="text-[11px] text-text-secondary leading-relaxed mt-2">{c.usage}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Proportion */}
      <div className="rounded-2xl bg-surface border border-border p-5">
        <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-3">Proportion</p>
        <div className="flex h-10 rounded-lg overflow-hidden border border-border">
          <div style={{ flex: "0 0 55%", backgroundColor: "#F6F4EF" }} />
          <div style={{ flex: "0 0 30%", backgroundColor: "#0E2547" }} />
          <div style={{ flex: "0 0 10%", backgroundColor: "#8C8276" }} />
          <div style={{ flex: "0 0 5%", backgroundColor: "#4A5340" }} />
        </div>
        <div className="flex mt-2 text-[10px] text-text-secondary uppercase tracking-wider">
          <span style={{ flex: "0 0 55%" }}>Parchment · 55%</span>
          <span style={{ flex: "0 0 30%" }}>Navy · 30%</span>
          <span style={{ flex: "0 0 10%" }}>Taupe · 10%</span>
          <span style={{ flex: "0 0 5%" }}>Moss · 5%</span>
        </div>
        <p className="text-xs text-text-secondary mt-3">
          The room reads as parchment, anchored by navy type and details. Taupe softens the edges; moss appears only where warmth needs grounding.
        </p>
      </div>

      {/* Approved pairings */}
      <div className="rounded-2xl bg-surface border border-border p-5">
        <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-3">Approved Pairings</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { bg: "#F6F4EF", fg: "#0E2547", label: "Body text on parchment" },
            { bg: "#0E2547", fg: "#F6F4EF", label: "Reverse on navy" },
            { bg: "#4A5340", fg: "#F6F4EF", label: "Moss + paper" },
            { bg: "#EDE9E0", fg: "#1A1814", label: "Warm parchment" },
          ].map((p, i) => (
            <div
              key={i}
              className="rounded-xl p-4 flex flex-col justify-between border border-border"
              style={{ backgroundColor: p.bg, color: p.fg, minHeight: 100 }}
            >
              <span className="font-heading text-2xl font-bold">Aa</span>
              <span className="text-[10px] uppercase tracking-wider opacity-80">{p.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function TypographyTab() {
  return (
    <div className="space-y-6">
      <SectionHead number="05" title="Typography" subtitle="A high-contrast pairing. Serif handles the heart — sans handles the work." />

      {/* Serif */}
      <div className="rounded-2xl bg-surface border border-border p-6">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-border">
          <div>
            <p className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">Primary — Display Serif</p>
            <p className="text-xl font-heading text-text mt-1">{bk.typography.serif.family}</p>
          </div>
          <p className="text-[10px] text-text-secondary uppercase tracking-wider">Headlines · Accents · Italic emphasis</p>
        </div>
        <p className="font-heading text-5xl text-text tracking-tight">
          Aa Gg <span className="italic">Home</span>
        </p>
        <div className="mt-4 text-[10px] text-text-secondary uppercase tracking-[0.16em]">
          ABCDEFGHIJKLMNOPQRSTUVWXYZ &nbsp; abcdefghijklmnopqrstuvwxyz &nbsp; 0123456789
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-5 border-t border-border">
          {[
            { size: "text-5xl", label: "H1 / Hero · 64px", text: "What Home Means." },
            { size: "text-3xl", label: "H2 / Section · 44px", text: "It's never just…" },
            { size: "text-xl", label: "H3 / Subhead · 28px", text: "A trusted friend." },
            { size: "text-lg italic", label: "Pull-quote · 20px", text: "Home." },
          ].map((r, i) => (
            <div key={i}>
              <p className={`font-heading ${r.size} text-text tracking-tight`}>{r.text}</p>
              <p className="text-[10px] text-text-secondary uppercase tracking-wider mt-2">{r.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Sans */}
      <div className="rounded-2xl bg-surface border border-border p-6">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-border">
          <div>
            <p className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">Secondary — Geometric Sans</p>
            <p className="text-xl font-semibold text-text mt-1">{bk.typography.sans.family}</p>
          </div>
          <p className="text-[10px] text-text-secondary uppercase tracking-wider">Body · UI · Wide-tracked labels</p>
        </div>
        <div className="grid grid-cols-3 gap-6">
          <div>
            <p className="text-[11px] uppercase tracking-[0.32em] font-medium text-text">Realtor · St. Louis</p>
            <p className="text-[10px] text-text-secondary mt-2">Eyebrow — tracking .32em</p>
          </div>
          <div>
            <p className="text-sm text-text leading-relaxed">
              Body copy lives here. Comfortable, generous line-height, and just enough breathing room.
            </p>
            <p className="text-[10px] text-text-secondary mt-2">Body — 16/1.6</p>
          </div>
          <div>
            <p className="text-xs text-text-secondary leading-relaxed">
              <strong className="text-text">Caption / fine print.</strong> Used for plate numbers, footnotes, and small UI labels.
            </p>
            <p className="text-[10px] text-text-secondary mt-2">Caption — 13/1.55</p>
          </div>
        </div>
      </div>

      {/* Italic rule */}
      <div className="rounded-2xl bg-surface border border-border p-5">
        <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-3">The Italic Rule</p>
        <p className="font-heading text-2xl text-text tracking-tight">
          Use <span className="italic text-accent">italic</span> on the emotional word. Never on the verb. Never on three words in a row.
        </p>
      </div>
    </div>
  );
}

function PhotographyTab() {
  return (
    <div className="space-y-6">
      <SectionHead number="06" title="Photography" subtitle="Less listing photo, more editorial spread." />

      {/* Hero images */}
      <div className="grid grid-cols-[2fr_1fr] gap-3">
        <div className="relative rounded-2xl overflow-hidden" style={{ aspectRatio: "16/10" }}>
          <img src="/brand/interior-staircase.jpg" alt="" className="absolute inset-0 w-full h-full object-cover" />
        </div>
        <div className="relative rounded-2xl overflow-hidden" style={{ aspectRatio: "4/5" }}>
          <img src="/brand/angie-portrait.jpg" alt="" className="absolute inset-0 w-full h-full object-cover" />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="relative rounded-2xl overflow-hidden" style={{ aspectRatio: "4/5" }}>
          <img src="/brand/interior-arch.jpg" alt="" className="absolute inset-0 w-full h-full object-cover" />
        </div>
        <div className="relative rounded-2xl overflow-hidden" style={{ aspectRatio: "4/5" }}>
          <img src="/brand/streetscape.jpg" alt="" className="absolute inset-0 w-full h-full object-cover" />
        </div>
        <div className="relative rounded-2xl overflow-hidden" style={{ aspectRatio: "4/5" }}>
          <img src="/brand/ad-fireplace.jpg" alt="" className="absolute inset-0 w-full h-full object-cover" />
        </div>
      </div>

      {/* Principles */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {bk.photography.principles.map((p, i) => (
          <div key={i} className="rounded-2xl bg-surface border border-border p-5">
            <span className="text-xs font-bold text-accent italic">0{i + 1}</span>
            <h3 className="text-sm font-bold text-text mt-2 mb-2">{p.name}</h3>
            <p className="text-xs text-text-secondary leading-relaxed">{p.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function ApplicationsTab() {
  return (
    <div className="space-y-6">
      <SectionHead number="07" title="In Use" subtitle="The brand at work — social posts, business card, signature." />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Social card */}
        <div className="rounded-2xl bg-surface border border-border overflow-hidden">
          <div className="relative" style={{ aspectRatio: "1320/1725" }}>
            <img src="/brand/ad-fireplace.jpg" alt="Social post" className="absolute inset-0 w-full h-full object-cover" />
          </div>
          <div className="p-3">
            <p className="text-xs font-semibold text-text">Landscape Post</p>
            <p className="text-[11px] text-text-secondary">&ldquo;It&rsquo;s Never Just About the House&rdquo;</p>
          </div>
        </div>

        {/* Business card */}
        <div className="space-y-3">
          <div className="rounded-2xl overflow-hidden" style={{ aspectRatio: "1.75" }}>
            <div className="w-full h-full bg-[#0E2547] p-6 flex flex-col justify-between">
              <span className="text-[10px] uppercase tracking-[0.2em] text-white/50">Realtor · St. Louis</span>
              <img src="/brand/logo-white.png" alt="" className="object-contain" />
              <span className="text-[10px] uppercase tracking-[0.2em] text-white/40 self-end">Vol. I · 2026</span>
            </div>
          </div>
          <div className="rounded-2xl overflow-hidden border border-border" style={{ aspectRatio: "1.75" }}>
            <div className="w-full h-full bg-[#F6F4EF] p-6 flex items-center gap-5">
              <span className="font-heading text-5xl italic text-[#0E2547]">A</span>
              <div className="space-y-1">
                <p className="font-heading text-lg font-bold text-[#0E2547]">Angie Nichols</p>
                <p className="text-[10px] uppercase tracking-[0.2em] text-[#8C8276]">Realtor · CB Gundaker</p>
                <div className="text-xs text-[#34302A] mt-2 leading-relaxed">
                  <p>(314) 805-3728</p>
                  <p>angie.nichols@cbgundaker.com</p>
                  <p>angienichols.com</p>
                </div>
              </div>
            </div>
          </div>
          <p className="text-xs font-semibold text-text">Business Card — Front + Back</p>
        </div>
      </div>

      {/* Portrait post */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-2xl bg-surface border border-border overflow-hidden">
          <div className="relative" style={{ aspectRatio: "1320/1710" }}>
            <img src="/brand/ad-portrait.jpg" alt="Portrait post" className="absolute inset-0 w-full h-full object-cover" />
          </div>
          <div className="p-3">
            <p className="text-xs font-semibold text-text">Portrait Post</p>
            <p className="text-[11px] text-text-secondary">&ldquo;What Home Means To Me&rdquo;</p>
          </div>
        </div>

        {/* Email signature */}
        <div className="rounded-2xl bg-surface border border-border overflow-hidden md:col-span-2">
          <div className="bg-[#F6F4EF] p-6 flex items-center gap-4">
            <div className="relative w-16 h-16 rounded-full overflow-hidden shrink-0 border border-[#8C8276]/30">
              <img src="/brand/angie-portrait.jpg" alt="" className="absolute inset-0 w-full h-full object-cover object-[center_25%]" />
            </div>
            <div>
              <p className="font-heading text-lg font-bold text-[#0E2547]">Angie Nichols</p>
              <p className="text-[10px] uppercase tracking-[0.2em] text-[#8C8276]">Realtor · Coldwell Banker Gundaker</p>
              <div className="h-px bg-[#8C8276]/20 my-2" />
              <p className="text-xs text-[#34302A]">(314) 805-3728 · angie.nichols@cbgundaker.com</p>
              <p className="text-xs italic text-[#8C8276] mt-1">What home means to me.</p>
            </div>
          </div>
          <div className="p-3">
            <p className="text-xs font-semibold text-text">Email Signature</p>
          </div>
        </div>
      </div>
    </div>
  );
}
