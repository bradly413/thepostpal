# Posterboy Studio — Particle Reveal Animation

## Overview

When users generate images in Posterboy Studio, a dramatic particle animation plays during the loading phase. ~2000 gold particles spawn and swirl chaotically, then coalesce into the generated image as it arrives — forming a low-res mosaic before cross-fading to the actual image.

## Technical Implementation

**Stack:** HTML Canvas 2D + GSAP (no Three.js). GSAP is used for timeline control and the coalesce animation. A `requestAnimationFrame` loop handles per-frame rendering.

### Component: `src/components/ParticleReveal.tsx`

Props:
- `active: boolean` — show/hide the canvas
- `imageUrl: string | null` — when set, triggers coalesce phase
- `onComplete: () => void` — called after reveal fade-out

### Animation Phases

1. **SPAWN** (Generate button pressed)
   - Canvas overlays the image container (1:1 aspect ratio)
   - 2000 particles initialized at random positions around center
   - Warm gold/amber palette: `#D4A853`, `#FFDF96`, `#B48C3C`, `#FFF5DC`, `#F0C878`, `#A08250`, `#FFFFFF`, `#C8B48C`

2. **SWIRL** (API in flight, ~3-8 seconds)
   - Particles drift with organic vortex physics
   - Gentle pull toward center + tangential swirl + sin-wave noise
   - Velocity damping (0.965) keeps motion smooth
   - Soft boundary bounce keeps particles in view
   - Alpha pulses: `0.35 + 0.35 * sin(time * 0.003 + phase)`
   - First 60 frames: gradual fade-in

3. **COALESCE** (Image data received)
   - Base64 image drawn to offscreen 50x50 canvas
   - `getImageData` samples pixel colors
   - Each particle assigned a target position + target color from grid
   - GSAP animates all particles to targets over 1.8s with random stagger (0.5s spread)
   - `ease: "power3.inOut"` for organic motion

4. **REVEAL** (Coalesce complete)
   - Canvas global alpha fades to 0 over 0.5s
   - `onComplete()` fires — parent swaps canvas for real `<img>`
   - Canvas removed from DOM

### DPR Handling

Critical detail: canvas physical size is `w * dpr` by `h * dpr`, with `ctx.scale(dpr, dpr)` applied. All particle coordinates and draw calls use **logical (CSS) pixels**. The `dimsRef` stores logical dimensions so the draw loop never reads `canvas.width/height` (which are physical).

### Integration in Studio Page

In `src/app/dashboard/studio/page.tsx`:

State:
- `showParticles` — controls ParticleReveal visibility
- `particleImageUrl` — set when API returns, triggers coalesce
- `pendingImageRef` — holds the GeneratedImage object until animation completes

Flow:
1. `handleGenerate()` sets `showParticles(true)`, calls API
2. On API success, stores image in `pendingImageRef`, sets `particleImageUrl`
3. ParticleReveal coalesces then calls `onComplete`
4. `handleParticleComplete()` reads `pendingImageRef`, adds to `generated[]`, clears particle state

Two render locations:
- First generation (no existing images): inside a standalone 1:1 container with `bg-black/80`
- Subsequent generations: overlaid on the carousel area with `bg-black/90`

## Gotchas

- The Gemini API returns `{ image: "data:image/png;base64,..." }` — the `image` key, not `url`
- GSAP grid stagger doesn't work well when particle count doesn't match grid dimensions (2000 vs 50x50=2500) — use `from: "random"` instead
- Always store logical dimensions in a ref for the draw loop; never derive them from `canvas.width/height` on Retina displays
- The particle swirl phase directly sets `alpha` each frame — don't also use GSAP to animate alpha during swirl (they fight)
