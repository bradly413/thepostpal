import { DashboardShellStyles } from "@/components/dashboard/home/dashboard-shell-styles";
import { HERO_IMAGES } from "@/lib/dashboard-home-data";

const BAR_HEIGHTS = [42, 58, 38, 72, 55, 48, 65];
const RECENT = [
  { title: "Spring market update for buyers", date: "May 18 at 9:00 AM", img: HERO_IMAGES[0] },
  { title: "Weekend open house — Wildwood", date: "May 15 at 2:30 PM", img: HERO_IMAGES[1] },
  { title: "Neighborhood spotlight: Chesterfield", date: "May 12 at 11:00 AM", img: HERO_IMAGES[2] },
];

/**
 * Full /dashboard home layout for marketing (16:9). Matches the signed-in portal.
 */
export default function DashboardPortalPreview() {
  return (
    <div className="pb-dash pb-dash-portal-preview">
      <DashboardShellStyles />
      <div className="app">
        <aside className="sidebar">
          <div className="logo">
            POSTER<span className="red">BOY</span>
          </div>

          <div className="profile">
            <span
              className="avatar"
              style={{
                backgroundImage:
                  "url('https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&q=80&auto=format&fit=crop&crop=faces')",
              }}
            />
            <span className="meta">
              <span className="name">Angie Nichols</span>
              <span className="role">Realtor · West County</span>
            </span>
          </div>

          <span className="create-btn">+ Create</span>

          <nav className="nav">
            {["Schedule", "Library", "Brand", "Settings"].map((item) => (
              <span key={item} className="nav-item">
                {item}
              </span>
            ))}
          </nav>

          <div className="sidebar-foot">
            <span className="mini-avatar">AN</span>
            <span className="name">Angie Nichols</span>
          </div>
        </aside>

        <main className="main">
          <section className="hero">
            <div
              className="hero-image"
              style={{ backgroundImage: `url('${HERO_IMAGES[0]}')` }}
            />
            <div className="hero-content">
              <span className="pill">
                <span className="live-dot" />
                Live
              </span>
              <span className="tag">Featured post</span>
              <h1>
                What should
                <br />
                we post next?
              </h1>
              <p className="sub">
                Pick up where you left off and keep your brand showing up consistently.
              </p>
              <div className="hero-actions">
                <span className="btn-primary">Create new post</span>
                <span className="btn-secondary">Open Studio</span>
              </div>
            </div>
            <div className="dots">
              <span className="dot active" />
              <span className="dot" />
              <span className="dot" />
            </div>
          </section>

          <div className="row3">
            <div className="card">
              <div className="card-head">
                <span className="icon-badge" />
                <span className="label">Recently posted</span>
              </div>
              <div className="posts">
                {RECENT.map((post) => (
                  <div className="post" key={post.title}>
                    <span className="thumb" style={{ backgroundImage: `url('${post.img}')` }} />
                    <span className="info">
                      <span className="title">{post.title}</span>
                      <span className="date">{post.date}</span>
                    </span>
                    <span className="live-tag">
                      <span className="d" />
                      Live
                    </span>
                  </div>
                ))}
              </div>
              <span className="view-all">View all posts</span>
            </div>

            <div className="card">
              <div className="card-head">
                <span className="icon-badge" />
                <span className="label">Brand voice</span>
              </div>
              <div className="voice-quote">
                Confident. Local.
                <br />
                Human.
              </div>
              <div className="voice-sub">
                Professional warmth with neighborhood expertise — built for West County.
              </div>
              <span className="voice-edit">Edit brand voice</span>
            </div>

            <div className="card studio-card">
              <div className="studio-head">
                <span className="p-badge">P</span>
                <span className="ai-tag">AI · Studio</span>
              </div>
              <div className="studio-title">
                Create with
                <br />
                Posterboy Studio
              </div>
              <div className="studio-sub">
                Image, video, copy —
                <br />
                one canvas, your voice.
              </div>
              <div className="studio-image" />
            </div>
          </div>
        </main>

        <aside className="right">
          <div className="card nextup">
            <div className="card-head">
              <span className="icon-badge" />
              <span className="label">Next up</span>
            </div>
            <div className="img-wrap">
              <div
                className="img"
                style={{ backgroundImage: `url('${HERO_IMAGES[1]}')` }}
              />
              <div className="date-badge">
                <div className="m">MAY</div>
                <div className="d">24</div>
              </div>
            </div>
            <h3>Market update: Spring trends</h3>
            <div className="sched">Scheduled · May 24 at 10:00 AM</div>
            <span className="view-schedule">View schedule</span>
          </div>

          <div className="card week-saved">
            <div className="label">This week</div>
            <div className="big">
              4<span className="h">h</span>
            </div>
            <div className="subtitle">saved with Posterboy</div>
            <svg className="squiggle" viewBox="0 0 130 50" xmlns="http://www.w3.org/2000/svg" aria-hidden>
              <path d="M 4 36 Q 18 18, 30 30 T 56 28 Q 70 14, 84 26 T 116 22" />
              <circle className="dot-end" cx="120" cy="22" r="4" />
            </svg>
          </div>

          <div className="card overview">
            <h4>Weekly overview</h4>
            <div className="range">Mon – Sun</div>
            <div className="chart">
              {BAR_HEIGHTS.map((h, i) => (
                <div className="bar-col" key={i}>
                  <div className={`bar${i === 3 ? " active" : ""}`} style={{ height: `${h}%` }} />
                </div>
              ))}
            </div>
            <div className="chart-labels">
              {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
                <span key={i}>{d}</span>
              ))}
            </div>
            <div className="stats">
              <div className="stat">
                <div className="skey">Posts</div>
                <div className="sval">6</div>
              </div>
              <div className="stat">
                <div className="skey">Engagement</div>
                <div className="sval green">+18%</div>
              </div>
            </div>
            <span className="view-analytics">View analytics</span>
          </div>
        </aside>
      </div>
    </div>
  );
}
