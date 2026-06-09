import { ImageResponse } from "next/og";

export const alt = "Posterboy — Post less. Sell more.";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

// Brand tokens
const COOL_GRAY = "#1c1c1e";
const PAPER = "#f7f4ee";
const BRAND_RED = "#ee2532";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "flex-start",
          padding: "96px",
          background: COOL_GRAY,
          backgroundImage:
            "radial-gradient(circle at 78% 18%, rgba(238,37,50,0.20), transparent 55%)",
          color: PAPER,
        }}
      >
        <div
          style={{
            width: 96,
            height: 8,
            background: BRAND_RED,
            borderRadius: 4,
            marginBottom: 40,
          }}
        />
        <div
          style={{
            display: "flex",
            fontSize: 132,
            fontWeight: 400,
            letterSpacing: "-0.03em",
            lineHeight: 1,
          }}
        >
          <span>poster</span>
          <span style={{ color: BRAND_RED, fontStyle: "italic" }}>boy</span>
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 56,
            marginTop: 36,
            color: PAPER,
            opacity: 0.92,
          }}
        >
          Post less. Sell more.
        </div>
      </div>
    ),
    {
      ...size,
    },
  );
}
