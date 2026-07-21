import React from "react";
import { AbsoluteFill } from "remotion";
import { PB } from "../theme";

type Props = {
  children: React.ReactNode;
  pad?: number;
};

/** Consistent bright stage + product window chrome. */
export const ProductFrame: React.FC<Props> = ({ children, pad = 56 }) => {
  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(120% 90% at 70% 20%, #fff 0%, ${PB.paper} 48%, #efece6 100%)`,
        fontFamily: PB.sans,
      }}
    >
      <AbsoluteFill
        style={{
          padding: pad,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            width: "100%",
            height: "100%",
            borderRadius: 22,
            overflow: "hidden",
            background: PB.white,
            boxShadow: PB.frameShadow,
            border: "1px solid rgba(20,20,24,0.06)",
            position: "relative",
          }}
        >
          {/* Minimal window chrome */}
          <div
            style={{
              height: 36,
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "0 16px",
              background: "rgba(247,244,238,0.96)",
              borderBottom: "1px solid rgba(20,20,24,0.06)",
            }}
          >
            <span style={{ width: 10, height: 10, borderRadius: 99, background: "#e8e4dc" }} />
            <span style={{ width: 10, height: 10, borderRadius: 99, background: "#e8e4dc" }} />
            <span style={{ width: 10, height: 10, borderRadius: 99, background: "#e8e4dc" }} />
            <span
              style={{
                marginLeft: 12,
                fontSize: 12,
                fontWeight: 600,
                letterSpacing: "0.04em",
                color: "rgba(20,20,24,0.4)",
                textTransform: "uppercase",
              }}
            >
              posterboy
            </span>
          </div>
          <div style={{ position: "absolute", inset: "36px 0 0 0" }}>{children}</div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
