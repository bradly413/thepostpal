"use client";

import type { CSSProperties, ReactNode } from "react";
import { Bookmark, Heart, MessageCircle, MoreHorizontal, Send } from "lucide-react";

interface Props {
  handle?: string;
  caption: string;
  tags?: string;
  mediaStyle: CSSProperties;
  aspectRatio: string;
  captionLoading?: boolean;
}

export default function InstagramPreview({
  handle = "yourbrand",
  caption,
  tags,
  mediaStyle,
  aspectRatio,
  captionLoading,
}: Props) {
  const captionNode: ReactNode = captionLoading ? (
    <span className="igpv-skel">
      <span />
      <span />
    </span>
  ) : (
    <>
      {caption}
      {tags ? <span className="igpv-tags"> {tags}</span> : null}
    </>
  );

  return (
    <div className="igpv">
      <header className="igpv-head">
        <span className="igpv-avatar" aria-hidden />
        <span className="igpv-handle">{handle}</span>
        <MoreHorizontal className="igpv-more" size={20} aria-hidden />
      </header>
      <div className="igpv-media" style={{ ...mediaStyle, aspectRatio }} />
      <footer className="igpv-foot">
        <div className="igpv-actions">
          <span className="igpv-actions-left">
            <Heart size={22} fill="#ed4956" stroke="#ed4956" />
            <MessageCircle size={22} />
            <Send size={22} />
          </span>
          <Bookmark size={22} />
        </div>
        <p className="igpv-likes">Liked by posterboy and others</p>
        <p className="igpv-caption">
          <strong>{handle}</strong> {captionNode}
        </p>
        <p className="igpv-meta">View all comments · 2 hours ago</p>
      </footer>
      <style>{`
        .igpv {
          display: flex; flex-direction: column; width: 100%;
          background: #fff; color: #262626; border-radius: inherit;
        }
        .igpv-head {
          display: flex; align-items: center; gap: 10px; padding: 11px 13px 9px;
        }
        .igpv-avatar {
          width: 32px; height: 32px; border-radius: 50%; flex: none;
          background: linear-gradient(135deg, #f9ce34 0%, #ee2a7b 50%, #6228d7 100%);
          border: 2px solid #fff; box-shadow: 0 0 0 1px rgba(0,0,0,0.06);
        }
        .igpv-handle { font-weight: 600; font-size: 13px; flex: 1; min-width: 0; }
        .igpv-more { color: rgba(38,38,38,0.7); flex: none; }
        .igpv-media { width: 100%; background-size: cover; background-position: center; }
        .igpv-foot { padding-bottom: 10px; }
        .igpv-actions {
          display: flex; align-items: center; padding: 10px 12px 4px;
        }
        .igpv-actions-left { display: inline-flex; align-items: center; gap: 14px; }
        .igpv-actions > svg:last-child { margin-left: auto; }
        .igpv-likes { font-weight: 600; font-size: 13px; padding: 2px 14px; margin: 0; }
        .igpv-caption {
          font-size: 13.5px; line-height: 1.45; padding: 2px 14px 0; margin: 0;
          overflow: hidden; overflow-wrap: anywhere; word-break: break-word;
          display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 4;
        }
        .igpv-tags { color: #00376b; }
        .igpv-meta {
          padding: 6px 14px 0; margin: 0; font-size: 10px; letter-spacing: 0.04em;
          text-transform: uppercase; color: rgba(38,38,38,0.45);
        }
        .igpv-skel { display: inline-block; width: 100%; }
        .igpv-skel span {
          display: block; height: 9px; border-radius: 4px; margin-bottom: 6px;
          background: linear-gradient(90deg, rgba(0,0,0,0.05), rgba(0,0,0,0.12), rgba(0,0,0,0.05));
          background-size: 200% 100%; animation: igpvSkel 1.3s ease-in-out infinite;
        }
        .igpv-skel span:nth-child(2) { width: 70%; }
        @keyframes igpvSkel {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
}
