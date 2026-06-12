/** Shared dashboard home shell styles (portal + /dashboard). */
export function DashboardShellStyles() {
  return (
    <style>{`
.pb-dash {
  --card:#fff; --ink:#0d0d10; --ink-2:#2a2a2e; --muted:#6b6b73; --muted-2:#9a9aa3;
  --line:#ececef; --line-2:#e3e3e7; --red:#ee2532; --red-soft:#fff1f2; --green:#1aa260;
  --shadow-sm:0 1px 2px rgba(15,15,20,.04),0 1px 1px rgba(15,15,20,.02);
  --radius:20px; --gap:16px;
  --serif:var(--font-instrument-serif),"Fraunces","Times New Roman",serif; --sans:var(--font-inter),-apple-system,system-ui,sans-serif;
  background:#f1f1f3; color:var(--ink); font-family:var(--sans); font-size:var(--text-body); line-height:1.4;
  -webkit-font-smoothing:antialiased;
}
.pb-dash * { box-sizing:border-box; margin:0; padding:0; }
.pb-dash button { font-family:inherit; cursor:pointer; border:none; background:none; color:inherit; text-align:left; }
.pb-dash a.create-btn,.pb-dash a.btn-primary,.pb-dash a.btn-secondary,.pb-dash .nav a,.pb-dash .upgrade a,.pb-dash .view-all,.pb-dash .voice-edit,.pb-dash .view-schedule,.pb-dash .view-analytics,.pb-dash .studio-card { text-decoration:none; color:inherit; }

.pb-dash .app { display:grid; grid-template-columns:260px minmax(0,1fr) 320px; grid-template-areas:"sidebar main rail"; gap:var(--gap); padding:var(--gap); max-width:1600px; margin:0 auto; min-height:100%; height:auto; align-items:start; }
.pb-dash .sidebar { grid-area:sidebar; min-width:0; }
.pb-dash .main { grid-area:main; min-width:0; }
.pb-dash .right { grid-area:rail; min-width:0; }

.pb-dash .sidebar { background:var(--card); border-radius:var(--radius); padding:24px 20px; display:flex; flex-direction:column; box-shadow:var(--shadow-sm); }
.pb-dash .logo { font-weight:800; font-size:20px; letter-spacing:-.02em; margin-bottom:32px; text-decoration:none; color:var(--ink); display:inline-block; width:fit-content; cursor:pointer; transition:var(--transition-opacity); }
.pb-dash .logo:hover { opacity:.7; }
.pb-dash .logo .red { color:var(--red); }
.pb-dash .profile { display:flex; align-items:center; gap:12px; padding:8px 4px; margin-bottom:20px; border-radius:10px; width:100%; }
.pb-dash .profile .avatar { width:40px; height:40px; border-radius:50%; flex-shrink:0; background:center/cover; }
.pb-dash .profile .meta { flex:1; min-width:0; display:flex; flex-direction:column; }
.pb-dash .profile .name { font-weight:600; font-size:var(--text-body); }
.pb-dash .profile .role { color:var(--muted); font-size:var(--text-body-sm); margin-top:1px; }
.pb-dash .profile .chev { color:var(--muted-2); flex-shrink:0; }
.pb-dash .create-btn { width:100%; background:var(--red); color:#fff; padding:13px 16px; border-radius:10px; font-weight:600; font-size:var(--text-body); display:flex; align-items:center; justify-content:center; gap:8px; margin-bottom:16px; transition:var(--transition-color); white-space:nowrap; }
.pb-dash .create-btn:hover { background:#d61f2c; }
.pb-dash .nav { display:flex; flex-direction:column; gap:2px; }
.pb-dash .nav a { display:flex; align-items:center; gap:12px; padding:11px 12px; border-radius:10px; color:var(--ink-2); font-size:var(--text-body); font-weight:500; transition:var(--transition-color); white-space:nowrap; }
.pb-dash .nav a:hover { background:#f6f6f8; }
.pb-dash .nav a svg { color:var(--ink-2); flex-shrink:0; }
.pb-dash .upgrade { margin-top:auto; background:#fafafb; border:1px solid var(--line); border-radius:14px; padding:16px; margin-bottom:14px; }
.pb-dash .upgrade .spark { color:var(--red); margin-bottom:8px; }
.pb-dash .upgrade .label { font-size:var(--text-body-sm); color:var(--muted); }
.pb-dash .upgrade .pro { font-weight:700; color:var(--red); font-size:var(--text-ui); margin:2px 0 6px; }
.pb-dash .upgrade .copy { font-size:var(--text-caption); color:var(--muted); line-height:var(--leading-body); margin-bottom:12px; }
.pb-dash .upgrade a { width:100%; background:#fff; border:1px solid var(--line-2); border-radius:8px; padding:9px; font-size:var(--text-body-sm); font-weight:500; text-align:center; display:block; }
.pb-dash .upgrade a:hover { background:#f6f6f8; }
.pb-dash .sidebar-foot { display:flex; align-items:center; gap:10px; padding:6px 4px; width:100%; }
.pb-dash .sidebar-foot .mini-avatar { width:30px; height:30px; border-radius:50%; background:#e8e8ec; color:var(--ink-2); font-size:var(--text-label); font-weight:600; display:grid; place-items:center; flex-shrink:0; }
.pb-dash .sidebar-foot .name { font-size:var(--text-body-sm); font-weight:500; flex:1; }
.pb-dash .sidebar-foot .chev { color:var(--muted-2); }

.pb-dash .main { display:flex; flex-direction:column; gap:var(--gap); min-height:0; overflow:auto; }
.pb-dash .hero { position:relative; background:var(--card); border-radius:var(--radius); overflow:hidden; min-height:480px; display:flex; box-shadow:var(--shadow-sm); flex-shrink:0; }
.pb-dash .hero-content { padding:32px 36px 28px; width:50%; min-width:0; display:flex; flex-direction:column; position:relative; z-index:2; }
.pb-dash .hero-image { position:absolute; inset:0; z-index:1; background:center right/cover; }
.pb-dash .hero-image::before { content:''; position:absolute; inset:0; background:linear-gradient(90deg,#fff 0%,#fff 30%,rgba(255,255,255,.92) 38%,rgba(255,255,255,0) 55%); }
.pb-dash .pill { display:inline-flex; align-items:center; gap:6px; background:#fff; border:1px solid var(--line-2); border-radius:999px; padding:5px 12px; font-size:var(--text-caption); font-weight:500; width:fit-content; }
.pb-dash .pill .live-dot { width:7px; height:7px; background:var(--red); border-radius:50%; animation:pbpulse 1.8s infinite; }
@keyframes pbpulse { 0%{box-shadow:0 0 0 0 rgba(238,37,50,.6);} 70%{box-shadow:0 0 0 8px rgba(238,37,50,0);} 100%{box-shadow:0 0 0 0 rgba(238,37,50,0);} }
.pb-dash .tag { display:inline-flex; align-items:center; background:#fff; border:1px solid var(--line-2); border-radius:8px; padding:6px 12px; font-size:var(--text-label); font-weight:600; letter-spacing:.08em; text-transform:uppercase; color:var(--ink-2); margin-top:14px; width:fit-content; }
.pb-dash .hero h1 { font-family:var(--serif); font-weight:500; font-size:clamp(38px,4.2vw,56px); line-height:var(--leading-tight); letter-spacing:-.02em; margin-top:20px; }
.pb-dash .hero p.sub { color:var(--muted); margin-top:14px; font-size:var(--text-body); line-height:var(--leading-body); max-width:360px; }
.pb-dash .hero-actions { display:flex; gap:10px; margin-top:28px; flex-wrap:wrap; }
.pb-dash .btn-primary { background:var(--red); color:#fff; padding:13px 22px; border-radius:10px; font-weight:600; font-size:var(--text-body); display:inline-flex; align-items:center; gap:8px; transition:var(--transition-color); white-space:nowrap; }
.pb-dash .btn-primary:hover { background:#d61f2c; }
.pb-dash .btn-secondary { background:#fff; border:1px solid var(--line-2); color:var(--ink); padding:13px 22px; border-radius:10px; font-weight:500; font-size:var(--text-body); display:inline-flex; align-items:center; gap:8px; white-space:nowrap; }
.pb-dash .btn-secondary:hover { background:#fafafa; }
.pb-dash .pop-out { position:absolute; top:22px; right:22px; width:36px; height:36px; background:#fff; border-radius:8px; display:grid; place-items:center; z-index:3; box-shadow:0 2px 8px rgba(0,0,0,.08); }
.pb-dash .feature-week { position:absolute; bottom:96px; right:28px; background:#fff; padding:14px 16px; border-radius:12px; box-shadow:0 8px 24px rgba(15,15,20,.12); width:280px; max-width:42%; z-index:3; border:none; text-align:left; }
.pb-dash .feature-week .ftag { color:var(--red); font-size:var(--text-eyebrow); font-weight:700; letter-spacing:var(--tracking-label); text-transform:uppercase; margin-bottom:8px; }
.pb-dash .feature-week .ftitle { font-family:var(--serif); font-size:var(--text-title); font-weight:500; line-height:var(--leading-snug); }
.pb-dash .feature-week .fsub { font-size:var(--text-caption); color:var(--muted); margin-top:8px; }
.pb-dash .feature-week .farrow { position:absolute; bottom:14px; right:14px; }
.pb-dash .dots { position:absolute; bottom:28px; left:50%; transform:translateX(-50%); display:flex; gap:6px; z-index:3; }
.pb-dash .dot { width:7px; height:7px; border-radius:50%; background:#d4d4d8; }
.pb-dash .dot.active { background:var(--red); }

.pb-dash .row3 { display:grid; grid-template-columns:repeat(auto-fit,minmax(230px,1fr)); gap:var(--gap); align-items:stretch; }
.pb-dash .card { background:var(--card); border-radius:var(--radius); padding:22px; box-shadow:var(--shadow-sm); display:flex; flex-direction:column; height:100%; min-width:0; }
.pb-dash .card-head { display:flex; align-items:center; gap:10px; margin-bottom:18px; }
.pb-dash .card-head .icon-badge { width:28px; height:28px; background:var(--red-soft); border-radius:7px; display:grid; place-items:center; color:var(--red); flex-shrink:0; }
.pb-dash .card-head .label { font-weight:600; font-size:var(--text-body); }
.pb-dash .posts { display:flex; flex-direction:column; gap:14px; flex:1; }
.pb-dash .post { display:flex; align-items:center; gap:12px; }
.pb-dash .post .thumb { width:48px; height:48px; border-radius:8px; background-size:cover; background-position:center; flex-shrink:0; }
.pb-dash .post .info { flex:1; min-width:0; display:flex; flex-direction:column; }
.pb-dash .post .title { font-size:var(--text-body); font-weight:500; margin-bottom:3px; }
.pb-dash .post .date { font-size:var(--text-caption); color:var(--muted); }
.pb-dash .post .live-tag { display:flex; align-items:center; gap:5px; font-size:var(--text-caption); color:var(--muted); flex-shrink:0; }
.pb-dash .post .live-tag .d { width:6px; height:6px; background:var(--green); border-radius:50%; }
.pb-dash .view-all, .pb-dash .voice-edit { margin-top:16px; padding-top:16px; border-top:1px solid var(--line); display:flex; align-items:center; justify-content:space-between; font-size:var(--text-body-sm); font-weight:500; width:100%; }
.pb-dash .view-all svg, .pb-dash .voice-edit svg { color:var(--muted); }
.pb-dash .voice-quote { font-family:var(--serif); font-weight:500; font-size:var(--text-stat); line-height:var(--leading-tight); letter-spacing:var(--tracking-tight); margin-bottom:18px; }
.pb-dash .voice-sub { font-size:var(--text-body); color:var(--muted); line-height:var(--leading-body); flex:1; }
.pb-dash .studio-head { display:flex; align-items:center; gap:10px; margin-bottom:18px; }
.pb-dash .studio-head .p-badge { width:30px; height:30px; background:var(--red); color:#fff; border-radius:8px; display:grid; place-items:center; font-weight:700; font-family:var(--serif); font-size:var(--text-title); flex-shrink:0; }
.pb-dash .studio-head .ai-tag { background:var(--red-soft); color:var(--red); font-size:var(--text-label); font-weight:600; letter-spacing:.06em; padding:4px 10px; border-radius:999px; text-transform:uppercase; }
.pb-dash .studio-title { font-family:var(--serif); font-weight:500; font-size:var(--text-stat); line-height:var(--leading-tight); letter-spacing:var(--tracking-tight); margin-bottom:12px; }
.pb-dash .studio-sub { font-size:var(--text-body); color:var(--muted); line-height:var(--leading-body); margin-bottom:16px; }
.pb-dash .studio-image { flex:1; min-height:130px; border-radius:12px; background:url('https://images.unsplash.com/photo-1593062096033-9a26b09da705?w=800&q=80&auto=format&fit=crop') center/cover; margin-top:auto; }
.pb-dash .studio-card:hover { box-shadow:0 4px 16px rgba(15,15,20,.08); }

.pb-dash .right { display:flex; flex-direction:column; gap:var(--gap); min-height:0; overflow:auto; }
.pb-dash .right .card { padding:20px; height:auto; }
.pb-dash .nextup .card-head { margin-bottom:14px; }
.pb-dash .nextup .img-wrap { position:relative; border-radius:12px; overflow:hidden; aspect-ratio:16/10; margin-bottom:14px; }
.pb-dash .nextup .img-wrap .img { width:100%; height:100%; background:center/cover; }
.pb-dash .nextup .date-badge { position:absolute; bottom:12px; left:12px; width:44px; background:#fff; border-radius:6px; overflow:hidden; text-align:center; box-shadow:0 2px 6px rgba(0,0,0,.15); }
.pb-dash .nextup .date-badge .m { background:var(--red); color:#fff; font-size:var(--text-eyebrow); font-weight:700; letter-spacing:var(--tracking-label); padding:2px 0; }
.pb-dash .nextup .date-badge .d { font-size:var(--text-title); font-weight:700; padding:3px 0 4px; }
.pb-dash .nextup h3 { font-size:var(--text-ui); font-weight:600; margin-bottom:4px; }
.pb-dash .nextup .sched { font-size:var(--text-caption); color:var(--muted); margin-bottom:14px; }
.pb-dash .nextup .view-schedule { width:100%; background:#fff; border:1px solid var(--line-2); border-radius:10px; padding:11px; font-size:var(--text-body); font-weight:500; text-align:center; display:block; }
.pb-dash .nextup .view-schedule:hover { background:#fafafa; }
.pb-dash .week-saved { position:relative; padding:22px 20px; overflow:hidden; }
.pb-dash .week-saved .label { font-size:var(--text-body-sm); color:var(--muted); margin-bottom:6px; }
.pb-dash .week-saved .big { font-family:var(--serif); font-size:44px; font-weight:500; letter-spacing:-.02em; line-height:1; }
.pb-dash .week-saved .big .h { color:var(--red); }
.pb-dash .week-saved .subtitle { font-size:var(--text-caption); color:var(--muted); margin-top:8px; }
.pb-dash .week-saved .squiggle { position:absolute; right:18px; top:40%; width:130px; height:50px; max-width:45%; }
.pb-dash .week-saved .squiggle path { stroke:var(--red); fill:none; stroke-width:2.5; stroke-linecap:round; }
.pb-dash .week-saved .squiggle .dot-end { fill:var(--red); }
.pb-dash .overview h4 { font-size:var(--text-ui); font-weight:600; margin-bottom:2px; }
.pb-dash .overview .range { font-size:var(--text-caption); color:var(--muted); margin-bottom:18px; }
.pb-dash .chart { display:grid; grid-template-columns:repeat(7,1fr); gap:8px; height:100px; align-items:end; margin-bottom:8px; }
.pb-dash .bar-col { display:flex; flex-direction:column; align-items:center; height:100%; justify-content:flex-end; }
.pb-dash .bar { width:100%; max-width:14px; background:#e7e7eb; border-radius:4px; transition:opacity var(--duration-standard) var(--ease-standard); }
.pb-dash .bar.active { background:var(--red); }
.pb-dash .chart-labels { display:grid; grid-template-columns:repeat(7,1fr); gap:8px; font-size:var(--text-label); color:var(--muted); text-align:center; margin-bottom:18px; }
.pb-dash .stats { display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:16px; }
.pb-dash .stat .skey { font-size:var(--text-caption); color:var(--muted); margin-bottom:4px; }
.pb-dash .stat .sval { font-size:22px; font-weight:600; font-family:var(--serif); letter-spacing:-.01em; }
.pb-dash .stat .sval.green { color:var(--green); }
.pb-dash .view-analytics { width:100%; background:#fff; border:1px solid var(--line-2); border-radius:10px; padding:11px; font-size:var(--text-body); font-weight:500; display:flex; align-items:center; justify-content:space-between; }
.pb-dash .view-analytics:hover { background:#fafafa; }
.pb-dash .view-analytics svg { color:var(--muted); }

@media (max-width:1379px){
  .pb-dash .app { grid-template-columns:232px minmax(0,1fr); grid-template-areas:"sidebar main" "sidebar rail"; }
  .pb-dash .hero-content { width:60%; }
  .pb-dash .feature-week { bottom:110px; }
  .pb-dash .right { display:grid; grid-template-columns:repeat(auto-fit,minmax(240px,1fr)); align-items:start; }
}
@media (max-width:860px){
  .pb-dash .app { grid-template-columns:minmax(0,1fr); grid-template-areas:"sidebar" "main" "rail"; }
  .pb-dash .sidebar { flex-direction:row; flex-wrap:wrap; align-items:center; gap:12px 14px; padding:16px 18px; }
  .pb-dash .logo { margin-bottom:0; margin-right:auto; }
  .pb-dash .profile { margin-bottom:0; order:1; padding:4px; width:auto; }
  .pb-dash .profile .meta, .pb-dash .profile .chev { display:none; }
  .pb-dash .create-btn { width:auto; margin-bottom:0; order:2; padding:11px 18px; }
  .pb-dash .nav { flex-direction:row; flex-wrap:wrap; width:100%; order:3; gap:4px; }
  .pb-dash .nav a { padding:9px 14px; background:#f6f6f8; }
  .pb-dash .upgrade, .pb-dash .sidebar-foot { display:none; }
  .pb-dash .hero-content { width:56%; }
  .pb-dash .right { grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); }
  .pb-dash .row3 { grid-template-columns:repeat(2,minmax(0,1fr)); }
}
@media (max-width:600px){
  .pb-dash .app { padding:10px; gap:12px; }
  .pb-dash .hero { flex-direction:column; min-height:auto; }
  .pb-dash .hero-image { position:relative; height:200px; order:-1; }
  .pb-dash .hero-image::before { background:linear-gradient(0deg,#fff 0%,rgba(255,255,255,.4) 45%,rgba(255,255,255,0) 80%); }
  .pb-dash .hero-content { width:100%; padding:4px 24px 28px; }
  .pb-dash .hero h1 { margin-top:16px; }
  .pb-dash .pop-out { top:14px; right:14px; }
  .pb-dash .feature-week { display:none; }
  .pb-dash .dots { position:static; transform:none; margin:18px auto 4px; }
  .pb-dash .row3 { grid-template-columns:minmax(0,1fr); }
  .pb-dash .right { grid-template-columns:minmax(0,1fr); display:grid; }
  .pb-dash .voice-quote { font-size:var(--text-stat); }
}
@media (max-width:380px){
  .pb-dash .hero-content { padding:4px 18px 22px; }
  .pb-dash .card { padding:18px; }
}
`}</style>
  );
}
