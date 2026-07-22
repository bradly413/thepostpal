import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const alt =
  "Posterboy — your business needs social media. you do not.";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

const BLACK = "#0a0a0a";
const WHITE = "#f5f5f5";
const MUTED = "#8a8a8a";
const RULE = "#3a3a3a";
const RED = "#c94a4a";

async function loadFont(filename: string) {
  return readFile(join(process.cwd(), "src/app/fonts/og", filename));
}

export default async function OpenGraphImage() {
  const [serifRegular, serifItalic, sansMedium] = await Promise.all([
    loadFont("InstrumentSerif-Regular.ttf"),
    loadFont("InstrumentSerif-Italic.ttf"),
    loadFont("Inter-Medium.ttf"),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "56px 72px",
          background: BLACK,
          color: WHITE,
          fontFamily: "Inter",
        }}
      >
        {/* Top meta row */}
        <div
          style={{
            display: "flex",
            width: "100%",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 24,
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: 18,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: WHITE,
              flexShrink: 0,
            }}
          >
            ISSUE NO. 01
          </div>
          <div
            style={{
              display: "flex",
              flex: 1,
              alignItems: "center",
              gap: 20,
              minWidth: 0,
            }}
          >
            <div
              style={{
                display: "flex",
                flex: 1,
                height: 1,
                background: RULE,
              }}
            />
            <div
              style={{
                display: "flex",
                fontFamily: "Instrument Serif",
                fontStyle: "italic",
                fontSize: 22,
                color: WHITE,
                flexShrink: 0,
              }}
            >
              a manifesto
            </div>
            <div
              style={{
                display: "flex",
                flex: 1,
                height: 1,
                background: RULE,
              }}
            />
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 18,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: WHITE,
              flexShrink: 0,
            }}
          >
            NO. 001
          </div>
        </div>

        {/* Center brand + manifesto */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            flex: 1,
            paddingTop: 24,
            paddingBottom: 24,
          }}
        >
          <div
            style={{
              display: "flex",
              fontFamily: "Instrument Serif",
              fontSize: 36,
              letterSpacing: "-0.02em",
              marginBottom: 36,
              color: WHITE,
            }}
          >
            <span style={{ fontStyle: "normal" }}>poster</span>
            <span style={{ fontStyle: "italic" }}>boy</span>
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              textAlign: "center",
            }}
          >
            <div
              style={{
                display: "flex",
                fontFamily: "Instrument Serif",
                fontSize: 58,
                letterSpacing: "-0.02em",
                lineHeight: 1.15,
                color: WHITE,
              }}
            >
              your business needs social media.
            </div>
            <div
              style={{
                display: "flex",
                fontFamily: "Instrument Serif",
                fontStyle: "italic",
                fontSize: 58,
                letterSpacing: "-0.02em",
                lineHeight: 1.15,
                color: RED,
                marginTop: 4,
              }}
            >
              you do not.
            </div>
          </div>
        </div>

        {/* Bottom meta row */}
        <div
          style={{
            display: "flex",
            width: "100%",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: 16,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: MUTED,
            }}
          >
            SOCIAL FOR ANTI-SOCIAL
          </div>
          <div
            style={{
              display: "flex",
              fontFamily: "Instrument Serif",
              fontStyle: "italic",
              fontSize: 20,
              color: WHITE,
            }}
          >
            join free beta →
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 16,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: MUTED,
            }}
          >
            NOW IN BETA
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        {
          name: "Instrument Serif",
          data: serifRegular,
          style: "normal",
          weight: 400,
        },
        {
          name: "Instrument Serif",
          data: serifItalic,
          style: "italic",
          weight: 400,
        },
        {
          name: "Inter",
          data: sansMedium,
          style: "normal",
          weight: 500,
        },
      ],
    },
  );
}
