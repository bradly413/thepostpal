"use client";

import type { CSSProperties } from "react";
import {
  Heart,
  MessageCircle,
  Send,
  Bookmark,
  MoreHorizontal,
  Globe,
  Repeat2,
  ThumbsUp,
  MessageSquare,
  Share2,
  Music2,
  Play,
  Plus,
  Forward,
} from "lucide-react";

export type PlatformId = "instagram" | "facebook" | "x" | "linkedin" | "tiktok";

interface Props {
  platform: PlatformId;
  /** background-image + transform/filter for the generated image */
  mediaStyle: CSSProperties;
  /** "1200 / 630" etc — the platform image aspect ratio */
  aspect: string;
  caption: string;
  tags?: string;
  captionLoading?: boolean;
  imageLabel?: string;
  onClose: () => void;
}

const AUTHOR = "Posterboy";

// ── small brand marks (lucide dropped brand glyphs) ──────────────
const FbMark = () => (
  <svg viewBox="0 0 24 24" width="34" height="34"><circle cx="12" cy="12" r="12" fill="#1877f2" /><path fill="#fff" d="M15.5 8.5h-1.7c-.3 0-.6.3-.6.7V11h2.3l-.4 2.3h-1.9V19h-2.4v-5.7H9V11h1.4V9.3c0-1.6 1-2.8 2.6-2.8h2.5z" /></svg>
);
const XMark = ({ size = 34 }: { size?: number }) => (
  <svg viewBox="0 0 24 24" width={size} height={size}><circle cx="12" cy="12" r="12" fill="#000" /><path fill="#fff" d="M13.3 11.1 17 6.8h-1.3l-2.9 3.4-2.4-3.4H7l3.9 5.5L7 17.2h1.3l3-3.6 2.6 3.6H17zm-1.1 1.3-.4-.5-2.9-4h1.4l2.2 3.1.4.5 3 4.2H14z" /></svg>
);
const InMark = () => (
  <svg viewBox="0 0 24 24" width="22" height="22"><rect width="24" height="24" rx="5" fill="#0a66c2" /><path fill="#fff" d="M7.1 9.3H4.7V18h2.4zM5.9 8.1a1.4 1.4 0 100-2.8 1.4 1.4 0 000 2.8zM18.8 18h-2.4v-4.2c0-1-.4-1.7-1.3-1.7-.7 0-1.1.5-1.3 1-.1.2-.1.4-.1.7V18H11s.1-7.6 0-8.7h2.4v1.2c.3-.5.9-1.2 2.1-1.2 1.5 0 2.7 1 2.7 3.2z" /></svg>
);
const Verified = ({ color = "#1d9bf0" }: { color?: string }) => (
  <svg viewBox="0 0 22 22" width="15" height="15" aria-hidden><path fill={color} d="M11 1.5l2 1.7 2.6-.3 1.1 2.4 2.4 1.1-.3 2.6 1.7 2-1.7 2 .3 2.6-2.4 1.1-1.1 2.4-2.6-.3-2 1.7-2-1.7-2.6.3-1.1-2.4-2.4-1.1.3-2.6-1.7-2 1.7-2-.3-2.6 2.4-1.1 1.1-2.4 2.6.3z" /><path fill="#fff" d="M9.7 13.6l-2-2 .9-.9 1.1 1.1 3-3 .9.9z" /></svg>
);

// FB / LinkedIn overlapping reaction badges
const ReactionCluster = ({ kinds }: { kinds: ("like" | "love" | "wow" | "clap")[] }) => (
  <span className="pc-reacts">
    {kinds.map((k, i) => (
      <span key={k} className={`pc-react pc-react-${k}`} style={{ zIndex: kinds.length - i }} />
    ))}
  </span>
);

export default function StudioPostChrome({
  platform,
  mediaStyle,
  aspect,
  caption,
  tags,
  captionLoading,
  imageLabel = "Generated post image",
}: Props) {
  const skeleton = (
    <span className="pc-skel"><span /><span /></span>
  );
  const captionNode = captionLoading ? skeleton : (
    <>
      {caption}
      {tags ? <span className="pc-tags"> {tags}</span> : null}
    </>
  );

  const media = (
    <div
      className="pc-media pc-reveal"
      style={{ ...mediaStyle, aspectRatio: aspect }}
      role="img"
      aria-label={imageLabel}
    />
  );

  let body: React.ReactNode;

  if (platform === "facebook") {
    body = (
      <div className="pc pc-fb">
        <div className="pc-head pc-reveal">
          <FbMark />
          <div className="pc-id">
            <div className="pc-name">{AUTHOR} <Verified /></div>
            <div className="pc-sub">June 5 at 2:30 PM · <Globe size={12} /></div>
          </div>
          <MoreHorizontal className="pc-more" size={22} />
        </div>
        <div className="pc-text pc-reveal">{captionNode}</div>
        {media}
        <div className="pc-foot pc-reveal">
          <div className="pc-stats">
            <ReactionCluster kinds={["like", "love", "wow"]} />
            <span className="pc-count">2.4K</span>
            <span className="pc-meta">126 Comments · 89 Shares</span>
          </div>
          <div className="pc-divider" />
          <div className="pc-actions-row">
            <span><ThumbsUp size={18} /> Like</span>
            <span><MessageSquare size={18} /> Comment</span>
            <span><Share2 size={18} /> Share</span>
          </div>
        </div>
      </div>
    );
  } else if (platform === "x") {
    body = (
      <div className="pc pc-x">
        <div className="pc-head pc-reveal">
          <span className="pc-avatar pc-avatar-x"><XMark size={44} /></span>
          <div className="pc-id">
            <div className="pc-name">{AUTHOR} <Verified /></div>
            <div className="pc-sub">@posterboy</div>
          </div>
          <span className="pc-x-logo"><XMark size={22} /></span>
        </div>
        <div className="pc-text pc-reveal">{captionNode}</div>
        <div className="pc-media-rounded pc-reveal">{media}</div>
        <div className="pc-x-time pc-reveal">7:45 PM · May 26, 2025 · Austin, TX</div>
        <div className="pc-foot pc-reveal">
          <div className="pc-x-actions">
            <span><MessageCircle size={17} /> 78</span>
            <span><Repeat2 size={18} /> 156</span>
            <span><Heart size={17} /> 1.2K</span>
            <span><Bookmark size={17} /> 342</span>
            <span><Forward size={17} /></span>
          </div>
        </div>
      </div>
    );
  } else if (platform === "linkedin") {
    body = (
      <div className="pc pc-li">
        <div className="pc-head pc-reveal">
          <span className="pc-avatar pc-avatar-li">P</span>
          <div className="pc-id">
            <div className="pc-name">{AUTHOR}</div>
            <div className="pc-sub">Social Media Management Platform</div>
            <div className="pc-sub2">2h · <Globe size={11} /></div>
          </div>
          <span className="pc-li-logo"><InMark /></span>
          <MoreHorizontal className="pc-more" size={20} />
        </div>
        <div className="pc-text pc-reveal">{captionNode}</div>
        {media}
        <div className="pc-foot pc-reveal">
          <div className="pc-stats">
            <ReactionCluster kinds={["like", "love", "clap"]} />
            <span className="pc-count">120</span>
            <span className="pc-meta">8 comments</span>
          </div>
          <div className="pc-divider" />
          <div className="pc-actions-row">
            <span><ThumbsUp size={18} /> Like</span>
            <span><MessageSquare size={18} /> Comment</span>
            <span><Share2 size={18} /> Share</span>
          </div>
        </div>
      </div>
    );
  } else if (platform === "tiktok") {
    body = (
      <div className="pc pc-tt">
        <div
          className="pc-tt-media pc-reveal"
          style={{ ...mediaStyle, aspectRatio: aspect }}
          role="img"
          aria-label={imageLabel}
        />
        <div className="pc-tt-top pc-reveal">
          <span className="pc-avatar pc-avatar-tt">ρ</span>
          <span className="pc-tt-name">posterboy <Verified /></span>
          <span className="pc-tt-sub">@posterboy · 2h</span>
          <Music2 className="pc-tt-note" size={18} />
        </div>
        <div className="pc-tt-rail pc-reveal">
          <span className="pc-tt-follow"><span className="pc-avatar pc-avatar-tt sm">ρ</span><i><Plus size={12} /></i></span>
          <span className="pc-tt-stat"><Heart size={26} fill="currentColor" /><b>128.7K</b></span>
          <span className="pc-tt-stat"><MessageCircle size={26} fill="currentColor" /><b>2,345</b></span>
          <span className="pc-tt-stat"><Bookmark size={26} fill="currentColor" /><b>8,912</b></span>
          <span className="pc-tt-stat"><Forward size={26} /><b>4,321</b></span>
          <span className="pc-tt-disc"><Music2 size={16} /></span>
        </div>
        <div className="pc-tt-cap pc-reveal">
          <div className="pc-tt-handle">@posterboy</div>
          <div className="pc-tt-text">{captionNode}</div>
          <div className="pc-tt-sound"><Music2 size={12} /> Original sound - posterboy</div>
        </div>
      </div>
    );
  } else {
    // instagram
    body = (
      <div className="pc pc-ig">
        <div className="pc-head pc-reveal">
          <span className="pc-avatar pc-avatar-ig" />
          <div className="pc-id"><div className="pc-name">posterboy</div></div>
          <MoreHorizontal className="pc-more" size={20} />
        </div>
        {media}
        <div className="pc-foot pc-reveal">
          <div className="pc-ig-actions">
            <span className="pc-ig-left">
              <Heart size={22} fill="#ed4956" stroke="#ed4956" />
              <MessageCircle size={22} />
              <Send size={22} />
            </span>
            <Bookmark size={22} className="pc-ig-bm" />
          </div>
          <div className="pc-ig-likes">9,311 likes</div>
          <div className="pc-text"><b>posterboy</b> {captionNode}</div>
          <div className="pc-ig-comments">View all 987 comments</div>
          <div className="pc-ig-time">5 days ago</div>
        </div>
      </div>
    );
  }

  return (
    <>
      {body}
      <StudioPostChromeStyles />
    </>
  );
}

function StudioPostChromeStyles() {
  return (
    <style>{`
    .pc { display: flex; flex-direction: column; width: 100%; color: rgba(22,22,28,0.92); }
    .pc-reveal { will-change: transform, opacity; }
    .pc-head { display: flex; align-items: center; gap: 10px; padding: 11px 13px 9px; }
    .pc-head .pc-id { min-width: 0; line-height: 1.25; }
    .pc-name { font-weight: 700; font-size: 14px; display: inline-flex; align-items: center; gap: 4px; }
    .pc-sub { font-size: 11.5px; color: rgba(22,22,28,0.5); display: inline-flex; align-items: center; gap: 4px; }
    .pc-sub2 { font-size: 11.5px; color: rgba(22,22,28,0.5); display: inline-flex; align-items: center; gap: 4px; }
    .pc-more { margin-left: auto; color: rgba(22,22,28,0.55); flex: none; }
    .pc-text {
      padding: 2px 14px 10px; font-size: 13.5px; line-height: 1.45;
      /* Clamp long AI captions so they never spill past the frame (overflow:hidden). */
      overflow: hidden; overflow-wrap: anywhere; word-break: break-word;
      display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 3;
    }
    .pc-tags { color: #1d6fd6; }
    .pc-media { width: 100%; background-size: cover; background-position: center; }
    .pc-skel { display: inline-block; width: 100%; }
    .pc-skel span { display: block; height: 9px; border-radius: 4px; margin-bottom: 6px; background: linear-gradient(90deg, rgba(0,0,0,0.05), rgba(0,0,0,0.12), rgba(0,0,0,0.05)); background-size: 200% 100%; animation: pcSkel 1.3s ease-in-out infinite; }
    .pc-skel span:nth-child(2) { width: 70%; }
    @keyframes pcSkel { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
    .pc-close { position: absolute; top: 12px; right: 13px; z-index: 9; width: 28px; height: 28px; border-radius: 50%; display: grid; place-items: center; font-size: 20px; line-height: 1; color: rgba(22,22,28,0.65); background: rgba(255,255,255,0.6); border: 1px solid rgba(0,0,0,0.08); backdrop-filter: blur(8px); }
    .pc-close:hover { background: rgba(255,255,255,0.9); }
    .pc-avatar { width: 38px; height: 38px; border-radius: 50%; flex: none; display: grid; place-items: center; font-weight: 700; }
    .pc-avatar-ig { background: linear-gradient(135deg, #f9ce34 0%, #ee2a7b 50%, #6228d7 100%); border: 2px solid #fff; }
    .pc-avatar-li { background: #14141a; color: #fff; font-size: 16px; }
    .pc-avatar-x { background: transparent; }

    /* reaction badges */
    .pc-reacts { display: inline-flex; align-items: center; }
    .pc-react { width: 18px; height: 18px; border-radius: 50%; border: 2px solid #fff; margin-right: -5px; background-size: cover; }
    .pc-react-like { background: #1877f2; box-shadow: inset 0 0 0 6px #1877f2; }
    .pc-react-love { background: #f33e58; }
    .pc-react-wow { background: #f7b125; }
    .pc-react-clap { background: #00a400; }
    .pc-stats { display: flex; align-items: center; gap: 7px; padding: 9px 14px 6px; font-size: 12.5px; color: rgba(22,22,28,0.55); }
    .pc-count { margin-left: 4px; }
    .pc-meta { margin-left: auto; }
    .pc-divider { height: 1px; background: rgba(0,0,0,0.08); margin: 0 12px; }
    .pc-actions-row { display: flex; padding: 4px 6px 8px; }
    .pc-actions-row span { flex: 1; display: inline-flex; align-items: center; justify-content: center; gap: 7px; padding: 7px; font-size: 13px; font-weight: 600; color: rgba(22,22,28,0.6); border-radius: 8px; cursor: pointer; }
    .pc-actions-row span:hover { background: rgba(0,0,0,0.04); }

    /* X */
    .pc-x-logo { margin-left: auto; }
    .pc-x .pc-sub { color: rgba(22,22,28,0.45); }
    .pc-media-rounded { padding: 2px 14px 0; }
    .pc-media-rounded .pc-media { border-radius: 16px; border: 1px solid rgba(0,0,0,0.08); }
    .pc-x-time { padding: 10px 16px 6px; font-size: 12px; color: rgba(22,22,28,0.45); }
    .pc-x-actions { display: flex; align-items: center; justify-content: space-between; padding: 6px 18px 12px; color: rgba(22,22,28,0.5); }
    .pc-x-actions span { display: inline-flex; align-items: center; gap: 6px; font-size: 12.5px; }

    /* LinkedIn */
    .pc-li-logo { margin-left: auto; }
    .pc-li .pc-more { margin-left: 8px; }

    /* TikTok — full-bleed dark with overlays */
    .pc-tt { position: absolute; inset: 0; background: #000; overflow: hidden; border-radius: inherit; }
    .pc-tt-media { position: absolute; inset: 0; width: 100%; height: 100%; background-size: cover; background-position: center; }
    .pc-tt-top { position: absolute; top: 0; left: 0; right: 0; z-index: 5; display: flex; align-items: center; gap: 8px; padding: 12px 14px; color: #fff; background: linear-gradient(180deg, rgba(0,0,0,0.45), transparent); }
    .pc-avatar-tt { width: 34px; height: 34px; background: linear-gradient(135deg, #f9ce34, #ee2a7b, #6228d7); color: #fff; border: 2px solid #fff; font-family: Georgia, serif; }
    .pc-avatar-tt.sm { width: 30px; height: 30px; }
    .pc-tt-name { font-weight: 700; font-size: 13.5px; display: inline-flex; align-items: center; gap: 4px; }
    .pc-tt-sub { font-size: 12px; opacity: 0.85; }
    .pc-tt-note { margin-left: auto; }
    .pc-tt-rail { position: absolute; right: 10px; bottom: 96px; z-index: 5; display: flex; flex-direction: column; align-items: center; gap: 16px; color: #fff; }
    .pc-tt-stat { display: flex; flex-direction: column; align-items: center; gap: 3px; }
    .pc-tt-stat b { font-size: 11px; font-weight: 600; }
    .pc-tt-follow { position: relative; margin-bottom: 4px; }
    .pc-tt-follow i { position: absolute; bottom: -6px; left: 50%; transform: translateX(-50%); width: 18px; height: 18px; border-radius: 50%; background: #fe2c55; color: #fff; display: grid; place-items: center; }
    .pc-tt-disc { width: 38px; height: 38px; border-radius: 50%; background: linear-gradient(135deg, #333, #111); display: grid; place-items: center; color: #fff; margin-top: 4px; }
    .pc-tt-cap { position: absolute; left: 0; right: 56px; bottom: 14px; z-index: 5; padding: 0 14px; color: #fff; }
    .pc-tt-handle { font-weight: 700; font-size: 13.5px; }
    .pc-tt-text { font-size: 12.5px; line-height: 1.4; margin: 4px 0 6px; text-shadow: 0 1px 4px rgba(0,0,0,0.5); overflow: hidden; overflow-wrap: anywhere; word-break: break-word; display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 3; }
    .pc-tt-sound { font-size: 12px; display: inline-flex; align-items: center; gap: 6px; }

    /* Instagram */
    .pc-ig-actions { display: flex; align-items: center; padding: 11px 12px 4px; }
    .pc-ig-left { display: inline-flex; align-items: center; gap: 14px; }
    .pc-ig-bm { margin-left: auto; }
    .pc-ig-likes { font-weight: 600; font-size: 13.5px; padding: 2px 14px; }
    .pc-ig-comments { padding: 4px 14px 0; font-size: 13px; color: rgba(22,22,28,0.5); }
    .pc-ig-time { padding: 5px 14px 0; font-size: 10px; letter-spacing: 0.05em; text-transform: uppercase; color: rgba(22,22,28,0.42); }
    .pc-ig .pc-text { padding: 2px 14px 0; font-size: 13.5px; }
    `}</style>
  );
}
