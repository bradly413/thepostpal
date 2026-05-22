type Props = {
  /** Full desktop layout for Remotion; portrait UI-only for scattered focal card */
  variant?: "full" | "reel";
};

/**
 * Static light-dashboard mock for marketing embeds.
 * `reel` = 9:16-friendly, no listing hero photo (reads as product UI).
 */
export default function DashboardPreviewMock({ variant = "full" }: Props) {
  if (variant === "reel") {
    return <DashboardReelPreview />;
  }
  return <DashboardFullPreview />;
}

function DashboardReelPreview() {
  return (
    <div className="pb-dash-reel-mock">
      <header className="pb-dash-reel-mock__top">
        <span className="pb-dash-reel-mock__logo">
          POSTER<span>BOY</span>
        </span>
        <span className="pb-dash-reel-mock__avatar" />
      </header>

      <section className="pb-dash-reel-mock__hero">
        <span className="pb-dash-reel-mock__pill">
          <span className="pb-dash-reel-mock__dot" />
          Live
        </span>
        <span className="pb-dash-reel-mock__tag">Featured post</span>
        <h2 className="pb-dash-reel-mock__headline">
          What should
          <br />
          we post next?
        </h2>
        <p className="pb-dash-reel-mock__sub">
          Pick up where you left off and keep your brand showing up consistently.
        </p>
        <div className="pb-dash-reel-mock__actions">
          <span className="pb-dash-reel-mock__btn pb-dash-reel-mock__btn--primary">
            Create new post
          </span>
          <span className="pb-dash-reel-mock__btn">Open Studio</span>
        </div>
      </section>

      <div className="pb-dash-reel-mock__cards">
        <div className="pb-dash-reel-mock__card">
          <span className="pb-dash-reel-mock__card-label">Recently posted</span>
          <span className="pb-dash-reel-mock__card-line" />
          <span className="pb-dash-reel-mock__card-line pb-dash-reel-mock__card-line--short" />
        </div>
        <div className="pb-dash-reel-mock__card">
          <span className="pb-dash-reel-mock__card-label">Brand voice</span>
          <p className="pb-dash-reel-mock__quote">
            Confident. Local.
            <br />
            Human.
          </p>
        </div>
        <div className="pb-dash-reel-mock__card pb-dash-reel-mock__card--studio">
          <span className="pb-dash-reel-mock__card-label">Studio</span>
          <span className="pb-dash-reel-mock__spark" />
        </div>
      </div>

      <aside className="pb-dash-reel-mock__rail">
        <div className="pb-dash-reel-mock__rail-card">Next up</div>
        <div className="pb-dash-reel-mock__rail-card">This week</div>
      </aside>
    </div>
  );
}

function DashboardFullPreview() {
  const heroImage =
    "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=900&q=80";

  return (
    <div
      style={{
        width: 1280,
        height: 720,
        display: "grid",
        gridTemplateColumns: "200px 1fr 260px",
        gap: 12,
        padding: 12,
        background: "#f1f1f3",
        fontFamily: "var(--font-inter, system-ui, sans-serif)",
        color: "#0d0d10",
        boxSizing: "border-box",
      }}
    >
      <aside
        style={{
          background: "#fff",
          borderRadius: 16,
          padding: "18px 14px",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 1px 2px rgba(15,15,20,.04)",
        }}
      >
        <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 20 }}>
          POSTER<span style={{ color: "#ee2532" }}>BOY</span>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 14 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              background: "linear-gradient(135deg, #e8dfd0, #c4b8a8)",
            }}
          />
          <div>
            <div style={{ fontSize: 12, fontWeight: 600 }}>Riverside Bakery</div>
            <div style={{ fontSize: 11, color: "#6b6b73" }}>Bakery</div>
          </div>
        </div>
        <div
          style={{
            background: "#ee2532",
            color: "#fff",
            textAlign: "center",
            padding: "10px 0",
            borderRadius: 8,
            fontSize: 12,
            fontWeight: 600,
            marginBottom: 12,
          }}
        >
          + Create
        </div>
        {["Schedule", "Library", "Brand", "Settings"].map((item) => (
          <div key={item} style={{ fontSize: 12, padding: "8px 10px", color: "#2a2a2e" }}>
            {item}
          </div>
        ))}
      </aside>

      <main style={{ display: "flex", flexDirection: "column", gap: 12, minWidth: 0 }}>
        <section
          style={{
            position: "relative",
            background: "#fff",
            borderRadius: 16,
            minHeight: 280,
            overflow: "hidden",
            boxShadow: "0 1px 2px rgba(15,15,20,.04)",
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: `linear-gradient(90deg,#fff 0%,#fff 38%,rgba(255,255,255,.15) 58%,transparent 72%), url('${heroImage}') right/cover`,
            }}
          />
          <div style={{ position: "relative", zIndex: 1, padding: "22px 24px", maxWidth: "52%" }}>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                fontSize: 11,
                padding: "4px 10px",
                border: "1px solid #e3e3e7",
                borderRadius: 999,
                background: "#fff",
                marginBottom: 10,
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: "#ee2532",
                  display: "inline-block",
                }}
              />
              Live
            </div>
            <div style={{ fontSize: 11, color: "#6b6b73", marginTop: 8 }}>Featured post</div>
            <h1
              style={{
                fontFamily: "var(--font-instrument-serif, Georgia, serif)",
                fontSize: 34,
                fontWeight: 500,
                lineHeight: 1.05,
                margin: "8px 0 0",
                letterSpacing: "-0.02em",
              }}
            >
              What should
              <br />
              we post next?
            </h1>
            <p style={{ fontSize: 12, color: "#6b6b73", margin: "10px 0 14px", lineHeight: 1.45 }}>
              Pick up where you left off and keep your brand showing up consistently.
            </p>
            <div style={{ display: "flex", gap: 8 }}>
              <span
                style={{
                  background: "#ee2532",
                  color: "#fff",
                  fontSize: 11,
                  fontWeight: 600,
                  padding: "8px 14px",
                  borderRadius: 8,
                }}
              >
                Create new post
              </span>
              <span
                style={{
                  background: "#fff",
                  border: "1px solid #e3e3e7",
                  fontSize: 11,
                  fontWeight: 600,
                  padding: "8px 14px",
                  borderRadius: 8,
                }}
              >
                Open Studio
              </span>
            </div>
          </div>
        </section>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
          {["Recently posted", "Brand voice", "Studio"].map((label) => (
            <div
              key={label}
              style={{
                background: "#fff",
                borderRadius: 14,
                padding: 14,
                minHeight: 88,
                boxShadow: "0 1px 2px rgba(15,15,20,.04)",
                fontSize: 11,
                fontWeight: 600,
              }}
            >
              {label}
            </div>
          ))}
        </div>
      </main>

      <aside style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {["Next up", "This week", "Weekly overview"].map((label) => (
          <div
            key={label}
            style={{
              background: "#fff",
              borderRadius: 14,
              padding: 14,
              flex: 1,
              boxShadow: "0 1px 2px rgba(15,15,20,.04)",
              fontSize: 11,
              fontWeight: 600,
            }}
          >
            {label}
          </div>
        ))}
      </aside>
    </div>
  );
}
