"use client";

import type { CSSProperties, ReactNode } from "react";
import {
  Globe,
  MessageSquare,
  MoreHorizontal,
  Share2,
  ThumbsUp,
} from "lucide-react";

interface Props {
  pageName?: string;
  caption: string;
  tags?: string;
  mediaStyle: CSSProperties;
  aspectRatio: string;
  captionLoading?: boolean;
}

function FbAvatar() {
  return (
    <svg viewBox="0 0 24 24" width="40" height="40" aria-hidden>
      <circle cx="12" cy="12" r="12" fill="#1877f2" />
      <path
        fill="#fff"
        d="M15.5 8.5h-1.7c-.3 0-.6.3-.6.7V11h2.3l-.4 2.3h-1.9V19h-2.4v-5.7H9V11h1.4V9.3c0-1.6 1-2.8 2.6-2.8h2.5z"
      />
    </svg>
  );
}

export default function FacebookPreview({
  pageName = "Your Page",
  caption,
  tags,
  mediaStyle,
  aspectRatio,
  captionLoading,
}: Props) {
  const captionNode: ReactNode = captionLoading ? (
    <span className="fbpv-skel">
      <span />
      <span />
    </span>
  ) : (
    <>
      {caption}
      {tags ? <span className="fbpv-tags"> {tags}</span> : null}
    </>
  );

  return (
    <div className="fbpv">
      <header className="fbpv-head">
        <FbAvatar />
        <div className="fbpv-id">
          <div className="fbpv-name">{pageName}</div>
          <div className="fbpv-sub">
            Just now · <Globe size={12} />
          </div>
        </div>
        <MoreHorizontal className="fbpv-more" size={22} aria-hidden />
      </header>
      <p className="fbpv-text">{captionNode}</p>
      <div className="fbpv-media" style={{ ...mediaStyle, aspectRatio }} />
      <footer className="fbpv-foot">
        <div className="fbpv-stats">
          <span className="fbpv-reacts" aria-hidden />
          <span>24 reactions</span>
          <span className="fbpv-stats-meta">8 comments · 3 shares</span>
        </div>
        <div className="fbpv-divider" />
        <div className="fbpv-actions">
          <span>
            <ThumbsUp size={18} /> Like
          </span>
          <span>
            <MessageSquare size={18} /> Comment
          </span>
          <span>
            <Share2 size={18} /> Share
          </span>
        </div>
      </footer>
      <style>{`
        .fbpv {
          display: flex; flex-direction: column; width: 100%;
          background: #fff; color: #050505; border-radius: inherit;
        }
        .fbpv-head {
          display: flex; align-items: center; gap: 10px; padding: 12px 12px 8px;
        }
        .fbpv-id { min-width: 0; line-height: 1.25; flex: 1; }
        .fbpv-name { font-weight: 700; font-size: 14px; }
        .fbpv-sub {
          font-size: 11.5px; color: rgba(5,5,5,0.55);
          display: inline-flex; align-items: center; gap: 4px;
        }
        .fbpv-more { color: rgba(5,5,5,0.55); flex: none; }
        .fbpv-text {
          padding: 0 12px 10px; font-size: 14px; line-height: 1.45; margin: 0;
          overflow: hidden; overflow-wrap: anywhere; word-break: break-word;
          display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 4;
        }
        .fbpv-tags { color: #1877f2; }
        .fbpv-media { width: 100%; background-size: cover; background-position: center; }
        .fbpv-foot { padding-bottom: 6px; }
        .fbpv-stats {
          display: flex; align-items: center; gap: 8px; padding: 8px 12px 4px;
          font-size: 12.5px; color: rgba(5,5,5,0.55);
        }
        .fbpv-reacts {
          width: 18px; height: 18px; border-radius: 50%; background: #1877f2;
          box-shadow: 12px 0 0 -2px #f33e58, 24px 0 0 -2px #f7b125;
          /* the 2nd/3rd dots are box-shadows painted OUTSIDE the 18px layout
             box — reserve their width so they don't cover the count text */
          margin-right: 22px;
          flex: none;
        }
        .fbpv-stats-meta { margin-left: auto; }
        .fbpv-divider { height: 1px; background: rgba(0,0,0,0.08); margin: 0 12px; }
        .fbpv-actions { display: flex; padding: 2px 6px 6px; }
        .fbpv-actions span {
          flex: 1; display: inline-flex; align-items: center; justify-content: center;
          gap: 7px; padding: 8px; font-size: 13px; font-weight: 600;
          color: rgba(5,5,5,0.6); border-radius: 8px;
        }
        .fbpv-skel { display: inline-block; width: 100%; }
        .fbpv-skel span {
          display: block; height: 9px; border-radius: 4px; margin-bottom: 6px;
          background: linear-gradient(90deg, rgba(0,0,0,0.05), rgba(0,0,0,0.12), rgba(0,0,0,0.05));
          background-size: 200% 100%; animation: fbpvSkel 1.3s ease-in-out infinite;
        }
        .fbpv-skel span:nth-child(2) { width: 70%; }
        @keyframes fbpvSkel {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
}
