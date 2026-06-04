"use client";

import { Heart, MessageCircle, Send, Bookmark } from "lucide-react";
import AnimatedBorderButton from "@/lib/ui-snippets/buttons/AnimatedBorderButton";
import ShimmerButton from "@/lib/ui-snippets/buttons/ShimmerButton";
import GradientBorderButton from "@/lib/ui-snippets/buttons/GradientBorderButton";
import RippleButton from "@/lib/ui-snippets/buttons/RippleButton";
import HoverGlowButton from "@/lib/ui-snippets/buttons/HoverGlowButton";
import GlassButton from "@/lib/ui-snippets/buttons/GlassButton";
import ShimmerSkeleton from "@/lib/ui-snippets/loaders/ShimmerSkeleton";
import Marquee from "@/lib/ui-snippets/animations/Marquee";
import GradientText from "@/lib/ui-snippets/text/GradientText";
import TiltCard from "@/lib/ui-snippets/cards/TiltCard";
import AnimatedGradientBg from "@/lib/ui-snippets/backgrounds/AnimatedGradientBg";
import BorderDrawBox from "@/lib/ui-snippets/borders/BorderDrawBox";
import RotatingGradientBorder from "@/lib/ui-snippets/borders/RotatingGradientBorder";
import AnimatedPostFrame from "@/lib/ui-snippets/frames/AnimatedPostFrame";

// Live gallery of the UI snippet library. Reachable at /dashboard/ui-lab.
// Each tile shows an effect + its file path so it's easy to pick one.

function Demo({ title, file, children }: { title: string; file: string; children: React.ReactNode }) {
  return (
    <div className="pb-panel flex flex-col gap-4">
      <div>
        <h2 className="pb-panel-h" style={{ marginBottom: 2 }}>{title}</h2>
        <code className="text-[11px] opacity-45">{file}</code>
      </div>
      <div className="flex min-h-[120px] flex-1 items-center justify-center rounded-2xl bg-black/[0.03] p-6">
        {children}
      </div>
    </div>
  );
}

const Chip = ({ label }: { label: string }) => (
  <span className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-black shadow-sm">{label}</span>
);

export default function UiLabPage() {
  return (
    <div className="pb-app">
      <div className="pb-app-header">
        <h1>UI Lab</h1>
        <p>Live gallery of the snippet library — src/lib/ui-snippets. Pick an effect and I&rsquo;ll wire it into a real component.</p>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        <Demo title="Animated Border Button" file="buttons/AnimatedBorderButton.tsx">
          <AnimatedBorderButton>Get started</AnimatedBorderButton>
        </Demo>
        <Demo title="Shimmer Button" file="buttons/ShimmerButton.tsx">
          <ShimmerButton>Continue</ShimmerButton>
        </Demo>
        <Demo title="Gradient Border Button" file="buttons/GradientBorderButton.tsx">
          <GradientBorderButton>Learn more</GradientBorderButton>
        </Demo>
        <Demo title="Ripple Button" file="buttons/RippleButton.tsx">
          <RippleButton>Click me</RippleButton>
        </Demo>
        <Demo title="Hover Glow Button" file="buttons/HoverGlowButton.tsx">
          <HoverGlowButton>Hover me</HoverGlowButton>
        </Demo>
        <Demo title="Glass Button" file="buttons/GlassButton.tsx">
          {/* glass needs a vibrant/dark backdrop to read — demo on a gradient */}
          <div className="flex w-full flex-wrap items-center justify-center gap-4 rounded-2xl bg-gradient-to-b from-[#5d326c] to-[#350048] p-6">
            <GlassButton accent="#ee2532">Read more</GlassButton>
            <GlassButton accent="#2db2ff">Read more</GlassButton>
            <GlassButton accent="#1eff45">Read more</GlassButton>
          </div>
        </Demo>
        <Demo title="Shimmer Skeleton" file="loaders/ShimmerSkeleton.tsx">
          <div className="w-full space-y-3">
            <ShimmerSkeleton className="h-3 w-1/3 rounded" />
            <ShimmerSkeleton className="h-3 w-full rounded" />
            <ShimmerSkeleton className="h-3 w-4/5 rounded" />
          </div>
        </Demo>
        <Demo title="Gradient Text" file="text/GradientText.tsx">
          <GradientText className="text-3xl font-extrabold tracking-tight">Posterboy</GradientText>
        </Demo>
        <Demo title="Tilt Card" file="cards/TiltCard.tsx">
          <TiltCard className="rounded-2xl">
            <div className="flex h-24 w-40 items-center justify-center rounded-2xl bg-white text-sm font-semibold text-black shadow-md">
              Move your cursor
            </div>
          </TiltCard>
        </Demo>
        <Demo title="Animated Gradient Background" file="backgrounds/AnimatedGradientBg.tsx">
          <AnimatedGradientBg className="flex h-24 w-full items-center justify-center rounded-2xl text-sm font-semibold text-white">
            Animated gradient
          </AnimatedGradientBg>
        </Demo>
        <Demo title="Marquee" file="animations/Marquee.tsx">
          <Marquee speed={16} className="w-full">
            <Chip label="Instagram" />
            <Chip label="Facebook" />
            <Chip label="TikTok" />
            <Chip label="LinkedIn" />
            <Chip label="X" />
          </Marquee>
        </Demo>
        <Demo title="Border Draw (hover)" file="borders/BorderDrawBox.tsx">
          <BorderDrawBox className="max-w-[200px] p-4 text-center text-xs text-black/60">
            Hover me — the border draws itself in.
          </BorderDrawBox>
        </Demo>
        <Demo title="Rotating Gradient Border" file="borders/RotatingGradientBorder.tsx">
          <div className="flex gap-4">
            <RotatingGradientBorder variant="conic" className="flex h-20 w-24 items-center justify-center text-[11px] text-black/60">
              conic
            </RotatingGradientBorder>
            <RotatingGradientBorder variant="radial" className="flex h-20 w-24 items-center justify-center text-[11px] text-black/60">
              radial
            </RotatingGradientBorder>
          </div>
        </Demo>
      </div>

      {/* Combined: the social post frame Brad described */}
      <h2 className="pb-app-header mt-8" style={{ marginBottom: "1rem" }}>
        <span style={{ fontSize: "1.25rem", fontWeight: 700 }}>Combination — animated social post frame</span>
      </h2>
      <div className="pb-panel flex flex-col items-center gap-4">
        <code className="self-start text-[11px] opacity-45">frames/AnimatedPostFrame.tsx — rotating conic glow + brand glow, radius-safe</code>
        <AnimatedPostFrame radius={26} className="w-[300px]">
          <div className="flex items-center gap-2 px-3 py-2.5">
            <span className="h-7 w-7 rounded-full bg-gradient-to-br from-[#ee2532] to-[#ff7a59]" />
            <span className="text-xs font-semibold">posterboy</span>
            <span className="ml-auto text-black/30">•••</span>
          </div>
          <div className="h-52 bg-gradient-to-br from-[#ffd2c2] via-[#ff7a59] to-[#ee2532]" />
          <div className="flex items-center gap-4 px-3 py-2.5 text-black/55">
            <Heart size={16} />
            <MessageCircle size={16} />
            <Send size={16} />
            <Bookmark size={16} className="ml-auto" />
          </div>
          <p className="px-3 pb-3 text-[11px] text-black/60">
            <b className="text-black/80">posterboy</b> Happy 4th of July
          </p>
        </AnimatedPostFrame>
      </div>
    </div>
  );
}
