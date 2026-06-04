"use client";

import AnimatedBorderButton from "@/lib/ui-snippets/buttons/AnimatedBorderButton";
import ShimmerButton from "@/lib/ui-snippets/buttons/ShimmerButton";
import GradientBorderButton from "@/lib/ui-snippets/buttons/GradientBorderButton";
import RippleButton from "@/lib/ui-snippets/buttons/RippleButton";
import HoverGlowButton from "@/lib/ui-snippets/buttons/HoverGlowButton";
import ShimmerSkeleton from "@/lib/ui-snippets/loaders/ShimmerSkeleton";
import Marquee from "@/lib/ui-snippets/animations/Marquee";
import GradientText from "@/lib/ui-snippets/text/GradientText";
import TiltCard from "@/lib/ui-snippets/cards/TiltCard";
import AnimatedGradientBg from "@/lib/ui-snippets/backgrounds/AnimatedGradientBg";

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
      </div>
    </div>
  );
}
