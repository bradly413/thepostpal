"use client";

import { forwardRef } from "react";
import type { Template } from "@/lib/templates";

interface Props {
  template: Template;
  fields: Record<string, string>;
  photo: string | null;
  photoPos?: { x: number; y: number };
  photoZoom?: number;
  photoRotate?: number;
}

const TemplateCanvas = forwardRef<HTMLDivElement, Props>(
  function TemplateCanvas({ template, fields, photo, photoPos = { x: 50, y: 50 }, photoZoom = 100, photoRotate = 0 }, ref) {
    const { width, height, bgType, layout } = template;
    const transforms = [
      photoZoom !== 100 ? `scale(${photoZoom / 100})` : '',
      photoRotate !== 0 ? `rotate(${photoRotate}deg)` : '',
    ].filter(Boolean).join(' ') || undefined;
    const photoStyle: React.CSSProperties = {
      objectPosition: `${photoPos.x}% ${photoPos.y}%`,
      transform: transforms,
    };

    const listItems = (fields.list || "").split("\n").filter(Boolean);

    return (
      <div
        ref={ref}
        className="template-canvas relative overflow-hidden"
        style={{
          width,
          height,
          transform: "scale(var(--canvas-scale, 1))",
          transformOrigin: "top left",
          fontSize: 16,
        }}
      >
        {/* Background layer */}
        {bgType === "navy" && (
          <>
            {photo ? (
              <>
                <img src={photo} alt="" className="absolute inset-0 h-full w-full object-cover" style={photoStyle} />
                <div className="absolute inset-0 bg-navy/80" />
              </>
            ) : (
              <div className="absolute inset-0 bg-navy" />
            )}
          </>
        )}
        {bgType === "ivory" && (
          <>
            {photo ? (
              <>
                <img src={photo} alt="" className="absolute inset-0 h-full w-full object-cover" style={photoStyle} />
                <div className="absolute inset-0 bg-ivory/85" />
              </>
            ) : (
              <div className="absolute inset-0 bg-ivory" />
            )}
          </>
        )}
        {bgType === "photo-overlay" && (
          <>
            {photo ? (
              <img src={photo} alt="" className="absolute inset-0 h-full w-full object-cover" style={photoStyle} />
            ) : (
              <div className="absolute inset-0 bg-stone" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-navy/90 via-navy/40 to-transparent" />
          </>
        )}
        {bgType === "photo-fullbleed" && (
          <>
            {photo ? (
              <img src={photo} alt="" className="absolute inset-0 h-full w-full object-cover" style={photoStyle} />
            ) : (
              <div className="absolute inset-0 bg-stone" />
            )}
          </>
        )}
        {bgType === "split" && (
          <>
            {photo ? (
              <img src={photo} alt="" className="absolute inset-0 h-full w-full object-cover" style={photoStyle} />
            ) : (
              <>
                <div className="absolute inset-x-0 top-0 bg-navy" style={{ height: "65%" }} />
                <div className="absolute inset-x-0 bottom-0 bg-ivory" style={{ height: "35%" }} />
              </>
            )}
            {photo && (
              <div className="absolute inset-x-0 bottom-0 bg-white/50 backdrop-blur-xl" style={{ height: "35%" }} />
            )}
          </>
        )}

        {/* Arch frame for navy bg */}
        {bgType === "navy" && (
          <div className="absolute inset-[40px] rounded-t-full border-2 border-brass/30" />
        )}

        {/* Content layer */}
        <div className="relative z-10 flex h-full flex-col" style={{ padding: width * 0.07 }}>
          {layout === "centered" && (
            <CenteredLayout fields={fields} template={template} />
          )}
          {layout === "left-aligned" && (
            <LeftAlignedLayout fields={fields} listItems={listItems} template={template} />
          )}
          {layout === "bottom-text" && (
            <BottomTextLayout fields={fields} template={template} />
          )}
          {layout === "split-header" && (
            <SplitHeaderLayout fields={fields} listItems={listItems} template={template} />
          )}
        </div>

        {/* Logo watermark */}
        <div className="absolute z-20" style={{ bottom: width * 0.03, right: width * 0.03 }}>
          {bgType === "ivory" || bgType === "split" ? (
            <img src="/logos/logo-dark.png" alt="" style={{ height: width * 0.25 }} />
          ) : (
            <img src="/logos/logo-white.png" alt="" style={{ height: width * 0.25 }} />
          )}
        </div>

        {/* Full-bleed bottom bar */}
        {bgType === "photo-fullbleed" && (
          <div className="absolute inset-x-0 bottom-0 z-10 bg-navy/85 backdrop-blur-sm" style={{ padding: `${width * 0.04}px ${width * 0.07}px` }}>
            <p className="text-center font-serif text-white" style={{ fontSize: width * 0.035 }}>
              {fields.headline || ""}
            </p>
          </div>
        )}
      </div>
    );
  }
);

function CenteredLayout({ fields, template }: { fields: Record<string, string>; template: Template }) {
  const { width, bgType } = template;
  const textColor = bgType === "navy" || bgType === "photo-overlay" ? "text-white" : "text-navy";
  const subColor = bgType === "navy" || bgType === "photo-overlay" ? "text-white/70" : "text-taupe";

  return (
    <div className="flex flex-1 flex-col items-center justify-center text-center">
      {fields.eyebrow && (
        <p className={`font-sans font-semibold tracking-[0.2em] uppercase mb-6 ${bgType === "navy" ? "text-brass" : subColor}`}
          style={{ fontSize: width * 0.018 }}>
          {fields.eyebrow}
        </p>
      )}
      <h2 className={`font-serif font-bold leading-tight ${textColor}`}
        style={{ fontSize: width * 0.055, maxWidth: width * 0.7 }}>
        {fields.headline || ""}
      </h2>
      {fields.body && (
        <p className={`mt-6 font-sans leading-relaxed ${subColor}`}
          style={{ fontSize: width * 0.022, maxWidth: width * 0.65 }}>
          {fields.body}
        </p>
      )}
    </div>
  );
}

function LeftAlignedLayout({ fields, listItems, template }: { fields: Record<string, string>; listItems: string[]; template: Template }) {
  const { width } = template;

  return (
    <div className="flex flex-1 flex-col justify-center" style={{ paddingLeft: width * 0.05, paddingRight: width * 0.05, maxWidth: width * 0.8 }}>
      {fields.eyebrow && (
        <p className="font-sans font-semibold tracking-[0.2em] uppercase text-brass mb-4"
          style={{ fontSize: width * 0.016 }}>
          {fields.eyebrow}
        </p>
      )}
      <h2 className="font-serif font-bold text-navy leading-tight mb-8"
        style={{ fontSize: width * 0.045 }}>
        {fields.headline || ""}
      </h2>
      {listItems.length > 0 && (
        <ul className="space-y-4 mb-8">
          {listItems.map((item, i) => (
            <li key={i} className="flex gap-3 items-start">
              <span className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-navy text-white font-sans font-bold"
                style={{ fontSize: width * 0.016 }}>
                {i + 1}
              </span>
              <span className="font-sans text-charcoal leading-relaxed"
                style={{ fontSize: width * 0.022 }}>
                {item}
              </span>
            </li>
          ))}
        </ul>
      )}
      {fields.cta && (
        <p className="font-sans font-semibold text-brass" style={{ fontSize: width * 0.02 }}>
          {fields.cta}
        </p>
      )}
    </div>
  );
}

function BottomTextLayout({ fields, template }: { fields: Record<string, string>; template: Template }) {
  const { width, bgType } = template;
  if (bgType === "photo-fullbleed") return null;

  return (
    <div className="mt-auto" style={{ marginBottom: width * 0.12 }}>
      {fields.eyebrow && (
        <p className="font-sans font-semibold tracking-[0.2em] uppercase text-brass/90 mb-3"
          style={{ fontSize: width * 0.016 }}>
          {fields.eyebrow}
        </p>
      )}
      <h2 className="font-serif font-bold text-white leading-tight mb-3"
        style={{ fontSize: width * 0.05 }}>
        {fields.headline || ""}
      </h2>
      {fields.body && (
        <p className="font-sans text-white/80 leading-relaxed"
          style={{ fontSize: width * 0.022 }}>
          {fields.body}
        </p>
      )}
      {fields.cta && (
        <p className="mt-4 font-sans font-semibold text-white/90"
          style={{ fontSize: width * 0.02 }}>
          {fields.cta}
        </p>
      )}
    </div>
  );
}

function SplitHeaderLayout({ fields, listItems, template }: { fields: Record<string, string>; listItems: string[]; template: Template }) {
  const { width, height, bgType } = template;
  const isIvory = bgType === "ivory";
  const textColor = isIvory ? "text-navy" : "text-charcoal";

  const pad = width * 0.07;
  const ivoryTop = height * 0.65 - pad;

  return (
    <div className="flex flex-1 flex-col">
      <div style={{ flex: `0 0 ${ivoryTop}px` }} />
      <div className="flex flex-1 flex-col justify-center">
        {fields.date && (
          <p className={`font-sans font-semibold tracking-[0.15em] uppercase mb-2 ${isIvory ? "text-brass" : "text-navy"}`}
            style={{ fontSize: width * 0.016 }}>
            {fields.date}
          </p>
        )}
        {fields.eyebrow && !fields.date && (
          <p className={`font-sans font-semibold tracking-[0.2em] uppercase mb-2 ${isIvory ? "text-brass" : "text-navy"}`}
            style={{ fontSize: width * 0.016 }}>
            {fields.eyebrow}
          </p>
        )}
        <h2 className={`font-serif font-bold leading-tight mb-3 ${textColor}`}
          style={{ fontSize: width * 0.042 }}>
          {fields.headline || ""}
        </h2>
        {fields.body && (
          <p className={`font-sans leading-relaxed mb-3 ${isIvory ? "text-charcoal/80" : "text-charcoal/70"}`}
            style={{ fontSize: width * 0.022 }}>
            {fields.body}
          </p>
        )}
        {listItems.length > 0 && (
          <ul className="space-y-3 mb-4">
            {listItems.map((item, i) => {
              const parts = item.split("|").map((s) => s.trim());
              if (parts.length === 2) {
                return (
                  <li key={i} className="flex items-baseline gap-3">
                    <span className="font-serif font-bold text-navy" style={{ fontSize: width * 0.04 }}>
                      {parts[0]}
                    </span>
                    <span className="font-sans text-charcoal/70" style={{ fontSize: width * 0.018 }}>
                      {parts[1]}
                    </span>
                  </li>
                );
              }
              return (
                <li key={i} className={`font-sans ${textColor}`} style={{ fontSize: width * 0.02 }}>
                  {item}
                </li>
              );
            })}
          </ul>
        )}
        {fields.location && (
          <div className="flex items-center gap-2 mt-3">
            <svg className="h-4 w-4 text-brass" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
            </svg>
            <span className="font-sans font-semibold tracking-wider uppercase text-navy"
              style={{ fontSize: width * 0.015 }}>
              {fields.location}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export default TemplateCanvas;
