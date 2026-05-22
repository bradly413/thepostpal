"use client";

import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { DRAFT_SNIPPETS } from "@/lib/experience/chapters";

const CARD_COUNT = 18;

function Cards({ progress }: { progress: number }) {
  const group = useRef<THREE.Group>(null);
  const innerR = 1.2;
  const outerR = 3.8;
  const radius = innerR + (outerR - innerR) * Math.min(1, progress * 2.5);

  const cards = useMemo(() => {
    return Array.from({ length: CARD_COUNT }, (_, i) => ({
      angle: (i / CARD_COUNT) * Math.PI * 2,
      label: DRAFT_SNIPPETS[i % DRAFT_SNIPPETS.length],
    }));
  }, []);

  useFrame((state) => {
    if (!group.current) return;
    group.current.rotation.y = state.clock.elapsedTime * 0.08 + progress * Math.PI * 0.5;
    group.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.15) * 0.08;
  });

  return (
    <group ref={group}>
      {cards.map((card, i) => {
        const x = Math.cos(card.angle) * radius;
        const z = Math.sin(card.angle) * radius;
        return (
          <mesh key={i} position={[x, 0, z]} rotation={[0, -card.angle + Math.PI / 2, 0]}>
            <planeGeometry args={[0.9, 1.2]} />
            <meshStandardMaterial
              color={i % 3 === 0 ? "#F4EFE5" : "#FAF7F1"}
              roughness={0.6}
              metalness={0.05}
              side={THREE.DoubleSide}
            />
          </mesh>
        );
      })}
    </group>
  );
}

interface DraftRingCanvasProps {
  progress: number;
  visible: boolean;
}

export default function DraftRingCanvas({ progress, visible }: DraftRingCanvasProps) {
  if (!visible) return null;

  return (
    <div className="pb-xp-canvas-wrap">
      <Canvas
        className="pb-xp-canvas"
        camera={{ position: [0, 0.5, 6], fov: 45 }}
        dpr={[1, 2]}
        gl={{ alpha: true, antialias: true }}
      >
        <ambientLight intensity={0.9} />
        <directionalLight position={[4, 6, 4]} intensity={0.8} />
        <Cards progress={progress} />
      </Canvas>
    </div>
  );
}
