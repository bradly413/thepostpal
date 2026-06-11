"use client";

/**
 * Full-screen WebGL particle reveal for the studio "generating" state.
 * A storm of ~65k GPU particles swirls while generating; when the image lands,
 * every particle flies to its pixel and takes its color — the image materializes
 * out of the swarm. Then the overlay fades and hands off to the real result.
 *
 * Contract mirrors the old ParticleReveal: { active, imageUrl, onComplete }.
 *   - active=true            → mount overlay, swarm swirls
 *   - imageUrl set (ready)   → morph swarm → image, then fade + onComplete()
 */

import { useEffect, useRef } from "react";
import * as THREE from "three";
import gsap from "gsap";

interface Props {
  active: boolean;
  imageUrl: string | null;
  onComplete: () => void;
  /** caption under the storm while generating */
  label?: string;
}

const GRID = 256; // 256×256 = 65,536 particles (one per image cell)
const FOV = 50;
const PLANE_H = 28; // image plane height in world units

export default function StudioParticleReveal({ active, imageUrl, onComplete, label = "Generating" }: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<{ morph: (url: string) => void } | null>(null);
  const doneRef = useRef(onComplete);
  doneRef.current = onComplete;

  // ── boot the scene while active ──
  useEffect(() => {
    if (!active) return;
    const mount = mountRef.current;
    if (!mount) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 2000);
    const fovRad = (FOV * Math.PI) / 180;
    camera.position.z = (PLANE_H / 2) / Math.tan(fovRad / 2) / 0.78;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);

    // geometry attributes
    const count = GRID * GRID;
    const geo = new THREE.BufferGeometry();
    const position = new Float32Array(count * 3); // unused but required by three
    const aUv = new Float32Array(count * 2);
    const aRandom = new Float32Array(count * 3);
    const aId = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const gx = i % GRID;
      const gy = Math.floor(i / GRID);
      aUv[i * 2] = (gx + 0.5) / GRID;
      aUv[i * 2 + 1] = (gy + 0.5) / GRID;
      aRandom[i * 3] = Math.random();
      aRandom[i * 3 + 1] = Math.random();
      aRandom[i * 3 + 2] = Math.random();
      aId[i] = i / count;
    }
    geo.setAttribute("position", new THREE.BufferAttribute(position, 3));
    geo.setAttribute("aUv", new THREE.BufferAttribute(aUv, 2));
    geo.setAttribute("aRandom", new THREE.BufferAttribute(aRandom, 3));
    geo.setAttribute("aId", new THREE.BufferAttribute(aId, 1));

    const blank = new THREE.DataTexture(new Uint8Array([128, 128, 128, 255]), 1, 1);
    blank.needsUpdate = true;

    const uniforms = {
      uTime: { value: 0 },
      uMorph: { value: 0 },
      uHasImage: { value: 0 },
      uTex: { value: blank as THREE.Texture },
      uPlane: { value: new THREE.Vector2(PLANE_H / 2, PLANE_H / 2) },
      uGrid: { value: GRID },
      uSizeScale: { value: 1 },
    };

    const material = new THREE.ShaderMaterial({
      uniforms,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      blending: THREE.NormalBlending,
      vertexShader: /* glsl */ `
        uniform float uTime, uMorph, uHasImage, uGrid, uSizeScale;
        uniform vec2 uPlane;
        uniform sampler2D uTex;
        attribute vec2 aUv;
        attribute vec3 aRandom;
        attribute float aId;
        varying vec3 vColor;
        varying float vAlpha;
        #define PI 3.14159265359
        vec3 palette(float t, vec3 a, vec3 b, vec3 c, vec3 d){ return a + b*cos(6.28318*(c*t+d)); }
        float cubicInOut(float t){ return t<0.5 ? 4.0*t*t*t : 1.0 - pow(-2.0*t+2.0,3.0)/2.0; }
        vec3 swarmPos(vec3 rnd, float id){
          float R = max(uPlane.x, uPlane.y) * 1.6;
          float a = rnd.x*PI*2.0 + uTime*(0.12 + rnd.z*0.28);
          float rad = 0.22 + rnd.y*0.9;
          vec3 p;
          p.x = cos(a)*rad*R;
          p.y = sin(a)*rad*R*0.8;
          p.z = (rnd.z-0.5)*R*0.85 + sin(uTime*0.6 + id*22.0)*1.6;
          p.x += sin(uTime*0.5 + rnd.y*10.0)*2.2;
          p.y += cos(uTime*0.43 + rnd.x*10.0)*2.2;
          return p;
        }
        void main(){
          vec2 uvFlip = vec2(aUv.x, 1.0 - aUv.y);
          vec3 target = vec3((aUv.x-0.5)*uPlane.x*2.0, (0.5-aUv.y)*uPlane.y*2.0, 0.0);
          vec3 src = swarmPos(aRandom, aId);
          float m = cubicInOut(clamp(uMorph, 0.0, 1.0));
          vec3 pos = mix(src, target, m);
          float breathe = sin(m*PI);
          pos += normalize(pos + 0.0001) * breathe * 3.2 * (0.4 + aRandom.z);

          vec3 cSwarm = palette(aId + uTime*0.04, vec3(0.55,0.5,0.6), vec3(0.45,0.45,0.5), vec3(1.0,0.9,0.85), vec3(0.0,0.33,0.67));
          vec3 cImg = texture2D(uTex, uvFlip).rgb;
          cImg = mix(vec3(0.55,0.5,0.55), cImg, uHasImage);
          vColor = mix(cSwarm, cImg, m);

          float twinkle = 0.4 + 0.6*sin(uTime*4.0 + aId*PI*30.0);
          vAlpha = mix(twinkle, 1.0, m);

          vec4 mv = modelViewMatrix * vec4(pos, 1.0);
          gl_Position = projectionMatrix * mv;

          float cellWorld = (uPlane.x*2.0)/uGrid;
          float sizeWorld = mix(0.16 + aRandom.x*0.24, cellWorld*1.55, m);
          gl_PointSize = clamp(sizeWorld * uSizeScale / (-mv.z), 1.0, 64.0);
        }
      `,
      fragmentShader: /* glsl */ `
        varying vec3 vColor;
        varying float vAlpha;
        void main(){
          vec2 uv = gl_PointCoord - 0.5;
          float d = length(uv);
          if (d > 0.5) discard;
          float a = smoothstep(0.5, 0.16, d);
          gl_FragColor = vec4(vColor, a * vAlpha);
        }
      `,
    });

    const points = new THREE.Points(geo, material);
    points.frustumCulled = false;
    scene.add(points);

    const resize = () => {
      const w = mount.clientWidth || window.innerWidth;
      const h = mount.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      const dbh = h * Math.min(window.devicePixelRatio, 2);
      uniforms.uSizeScale.value = dbh / (2 * Math.tan(fovRad / 2));
    };
    resize();
    window.addEventListener("resize", resize);

    let raf = 0;
    const clock = new THREE.Clock();
    const loop = () => {
      uniforms.uTime.value = clock.getElapsedTime();
      renderer.render(scene, camera);
      raf = requestAnimationFrame(loop);
    };
    loop();

    let morphTween: gsap.core.Tween | null = null;
    apiRef.current = {
      morph: (url: string) => {
        const fit = (aspect: number) => { uniforms.uPlane.value.set((PLANE_H * aspect) / 2, PLANE_H / 2); };
        const run = () => {
          if (reduced) {
            uniforms.uMorph.value = 1;
            gsap.to(overlayRef.current, { opacity: 0, duration: 0.4, onComplete: () => doneRef.current() });
            return;
          }
          morphTween = gsap.to(uniforms.uMorph, {
            value: 1,
            duration: 2.4,
            ease: "power3.inOut",
            onComplete: () => {
              gsap.to(overlayRef.current, { opacity: 0, duration: 0.7, delay: 0.45, ease: "power2.inOut", onComplete: () => doneRef.current() });
            },
          });
        };
        new THREE.TextureLoader().load(
          url,
          (tex) => {
            tex.colorSpace = THREE.SRGBColorSpace;
            tex.minFilter = THREE.LinearFilter;
            uniforms.uTex.value = tex;
            uniforms.uHasImage.value = 1;
            fit((tex.image?.width || 1) / (tex.image?.height || 1));
            run();
          },
          undefined,
          () => run(), // image failed — still resolve the storm
        );
      },
    };

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      morphTween?.kill();
      gsap.killTweensOf(uniforms.uMorph);
      geo.dispose();
      material.dispose();
      blank.dispose();
      (uniforms.uTex.value as THREE.Texture)?.dispose?.();
      renderer.dispose();
      if (renderer.domElement.parentElement === mount) mount.removeChild(renderer.domElement);
      apiRef.current = null;
    };
  }, [active]);

  // ── trigger the morph when the image arrives ──
  useEffect(() => {
    if (active && imageUrl) apiRef.current?.morph(imageUrl);
  }, [active, imageUrl]);

  if (!active) return null;

  return (
    <div ref={overlayRef} className="spr-overlay">
      <div ref={mountRef} className="spr-canvas" />
      <div className="spr-pill"><span className="spr-dot" />{label}</div>
      <style>{`
        .spr-overlay { position: fixed; inset: 0; z-index: 60; background:
          radial-gradient(60% 50% at 50% 42%, #16131a 0%, #0b090c 60%, #070608 100%); }
        .spr-canvas { position: absolute; inset: 0; }
        .spr-pill {
          position: absolute; left: 50%; bottom: 46px; transform: translateX(-50%);
          display: inline-flex; align-items: center; gap: 10px;
          padding: 12px 30px; border-radius: 50px; color: rgba(255,255,255,0.9);
          text-transform: uppercase; letter-spacing: 4px; font-size: 11px; font-weight: 600;
          font-family: ui-sans-serif, system-ui, sans-serif;
          background: linear-gradient(135deg, rgba(255,255,255,0.06), rgba(255,255,255,0.015));
          -webkit-backdrop-filter: blur(12px) saturate(150%); backdrop-filter: blur(12px) saturate(150%);
          border: 1px solid rgba(255,255,255,0.1); border-top-color: rgba(255,255,255,0.22);
          box-shadow: 0 8px 32px rgba(0,0,0,0.45), inset 0 0 12px rgba(255,255,255,0.05);
        }
        .spr-dot { width: 7px; height: 7px; border-radius: 50%; background: #ee2532; box-shadow: 0 0 10px #ee2532; animation: sprPulse 1.1s ease-in-out infinite; }
        @keyframes sprPulse { 0%,100% { opacity: 1; } 50% { opacity: 0.3; } }
      `}</style>
    </div>
  );
}
