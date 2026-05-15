"use client";

import { useState } from "react";

export type Platform = "instagram" | "facebook" | "linkedin" | "twitter";
export type PostFormat = "square" | "portrait" | "landscape" | "story" | "carousel";

interface SocialMockupProps {
  platform: Platform;
  format?: PostFormat;
  imageUrl?: string;
  caption?: string;
  username?: string;
  avatarUrl?: string;
  hashtags?: string;
  likes?: string;
  comments?: string;
  shares?: string;
  timestamp?: string;
}

const PLATFORM_CONFIG = {
  instagram: {
    name: "Instagram",
    color: "#E1306C",
    gradient: "from-[#833AB4] via-[#E1306C] to-[#F77737]",
    formats: ["story", "portrait", "carousel", "square", "landscape"] as PostFormat[],
  },
  facebook: {
    name: "Facebook",
    color: "#1877F2",
    gradient: "from-[#1877F2] to-[#0C63D4]",
    formats: ["story", "portrait", "carousel", "square", "landscape"] as PostFormat[],
  },
  linkedin: {
    name: "LinkedIn",
    color: "#0A66C2",
    gradient: "from-[#0A66C2] to-[#004182]",
    formats: ["portrait", "carousel", "square", "landscape"] as PostFormat[],
  },
  twitter: {
    name: "X (Twitter)",
    color: "#1DA1F2",
    gradient: "from-[#1DA1F2] to-[#0C85D0]",
    formats: ["square", "landscape"] as PostFormat[],
  },
};

const FORMAT_RATIOS: Record<PostFormat, { w: number; h: number }> = {
  square: { w: 1, h: 1 },
  portrait: { w: 4, h: 5 },
  landscape: { w: 16, h: 9 },
  story: { w: 9, h: 16 },
  carousel: { w: 1, h: 1 },
};

function DefaultAvatar({ color }: { color: string }) {
  return (
    <div className="w-full h-full rounded-full flex items-center justify-center" style={{ background: `${color}22` }}>
      <svg width="55%" height="55%" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0" />
      </svg>
    </div>
  );
}

function ImagePlaceholder({ format }: { format: PostFormat }) {
  const ratio = FORMAT_RATIOS[format];
  return (
    <div
      className="w-full relative bg-gradient-to-br from-white/[0.04] to-white/[0.02] flex items-center justify-center"
      style={{ aspectRatio: `${ratio.w}/${ratio.h}` }}
    >
      <div className="text-center opacity-30">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1} className="mx-auto mb-1.5 text-white/40">
          <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z" />
        </svg>
        <span className="text-[10px] text-white/30">Your image here</span>
      </div>
    </div>
  );
}

/* ─── Instagram ─── */
function InstagramMockup({ format = "square", imageUrl, caption, username, avatarUrl, hashtags, likes, comments, timestamp }: Omit<SocialMockupProps, "platform">) {
  const displayName = username || "yourbrand";
  const displayLikes = likes || "128";
  const displayComments = comments || "24";
  const displayCaption = caption || "Your caption will appear here...";
  const displayTime = timestamp || "2 hours ago";

  if (format === "story") {
    return (
      <div className="rounded-xl overflow-hidden bg-black" style={{ aspectRatio: "9/16", maxHeight: 480 }}>
        <div className="relative w-full h-full">
          {imageUrl ? (
            <img src={imageUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-[#833AB4]/20 via-[#E1306C]/10 to-[#F77737]/20 flex items-center justify-center">
              <span className="text-white/20 text-xs">Story Preview</span>
            </div>
          )}
          <div className="absolute top-0 inset-x-0 p-3">
            <div className="h-0.5 bg-white/30 rounded-full mb-3">
              <div className="h-full w-1/3 bg-white rounded-full" />
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full ring-2 ring-white/30 overflow-hidden">
                {avatarUrl ? <img src={avatarUrl} alt="" className="w-full h-full object-cover" /> : <DefaultAvatar color="#E1306C" />}
              </div>
              <span className="text-white text-xs font-medium drop-shadow-lg">{displayName}</span>
              <span className="text-white/50 text-[10px]">2h</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl overflow-hidden bg-[#0a0a0a] border border-white/[0.08]">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full overflow-hidden ring-[1.5px] ring-white/10">
            {avatarUrl ? <img src={avatarUrl} alt="" className="w-full h-full object-cover" /> : <DefaultAvatar color="#E1306C" />}
          </div>
          <div>
            <span className="text-white text-xs font-semibold">{displayName}</span>
          </div>
        </div>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="white" className="opacity-50">
          <circle cx="12" cy="5" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="12" cy="19" r="1.5" />
        </svg>
      </div>

      {/* Image */}
      {imageUrl ? (
        <img src={imageUrl} alt="" className="w-full" style={{ aspectRatio: `${FORMAT_RATIOS[format].w}/${FORMAT_RATIOS[format].h}` }} />
      ) : (
        <ImagePlaceholder format={format} />
      )}

      {/* Actions */}
      <div className="px-3 pt-2.5">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-4">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={1.5} className="opacity-80">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
            </svg>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={1.5} className="opacity-80">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 01-.923 1.785A5.969 5.969 0 006 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337z" />
            </svg>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={1.5} className="opacity-80">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
            </svg>
          </div>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={1.5} className="opacity-80">
            <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
          </svg>
        </div>

        <p className="text-white text-xs font-semibold mb-1">{displayLikes} likes</p>
        <p className="text-white/80 text-xs leading-relaxed">
          <span className="font-semibold text-white">{displayName}</span>{" "}
          {displayCaption}
        </p>
        {hashtags && <p className="text-[#1DA1F2] text-xs mt-0.5">{hashtags}</p>}
        <p className="text-white/30 text-[10px] mt-1">View all {displayComments} comments</p>
        <p className="text-white/20 text-[10px] mt-1 mb-2.5 uppercase tracking-wide">{displayTime}</p>
      </div>
    </div>
  );
}

/* ─── Facebook ─── */
function FacebookMockup({ format = "square", imageUrl, caption, username, avatarUrl, likes, comments, shares, timestamp }: Omit<SocialMockupProps, "platform">) {
  const displayName = username || "Your Brand Page";
  const displayLikes = likes || "42";
  const displayComments = comments || "8";
  const displayShares = shares || "3";
  const displayCaption = caption || "Your caption will appear here...";
  const displayTime = timestamp || "2h";

  if (format === "story") {
    return (
      <div className="rounded-xl overflow-hidden bg-[#242526]" style={{ aspectRatio: "9/16", maxHeight: 480 }}>
        <div className="relative w-full h-full">
          {imageUrl ? (
            <img src={imageUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-[#1877F2]/20 to-[#0C63D4]/10 flex items-center justify-center">
              <span className="text-white/20 text-xs">Story Preview</span>
            </div>
          )}
          <div className="absolute top-0 inset-x-0 p-3">
            <div className="h-0.5 bg-white/20 rounded-full mb-3" />
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-full overflow-hidden border-2 border-[#1877F2]">
                {avatarUrl ? <img src={avatarUrl} alt="" className="w-full h-full object-cover" /> : <DefaultAvatar color="#1877F2" />}
              </div>
              <div>
                <span className="text-white text-xs font-semibold drop-shadow-lg">{displayName}</span>
                <span className="text-white/50 text-[10px] block">{displayTime}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl overflow-hidden bg-[#242526] border border-white/[0.06]">
      {/* Header */}
      <div className="px-3 pt-3 pb-2">
        <div className="flex items-center gap-2.5 mb-2">
          <div className="w-9 h-9 rounded-full overflow-hidden">
            {avatarUrl ? <img src={avatarUrl} alt="" className="w-full h-full object-cover" /> : <DefaultAvatar color="#1877F2" />}
          </div>
          <div className="flex-1">
            <span className="text-white text-xs font-semibold block">{displayName}</span>
            <div className="flex items-center gap-1 text-white/40 text-[10px]">
              <span>{displayTime}</span>
              <span>·</span>
              <svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor"><path d="M8 0a8 8 0 100 16A8 8 0 008 0zm3.5 9H9a1 1 0 01-1-1V3.5a.5.5 0 011 0V8h2.5a.5.5 0 010 1z" opacity={0.5} /></svg>
            </div>
          </div>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="white" className="opacity-30">
            <circle cx="5" cy="12" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="19" cy="12" r="1.5" />
          </svg>
        </div>
        {displayCaption && <p className="text-white/80 text-xs leading-relaxed mb-2">{displayCaption}</p>}
      </div>

      {/* Image */}
      {imageUrl ? (
        <img src={imageUrl} alt="" className="w-full" style={{ aspectRatio: `${FORMAT_RATIOS[format].w}/${FORMAT_RATIOS[format].h}` }} />
      ) : (
        <ImagePlaceholder format={format} />
      )}

      {/* Reactions bar */}
      <div className="px-3 pt-2.5">
        <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
          <div className="flex items-center gap-1">
            <div className="flex -space-x-0.5">
              <span className="text-[11px]">👍</span>
              <span className="text-[11px]">❤️</span>
            </div>
            <span className="text-white/40 text-[11px]">{displayLikes}</span>
          </div>
          <div className="flex gap-3 text-white/30 text-[11px]">
            <span>{displayComments} comments</span>
            <span>{displayShares} shares</span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center justify-around py-1.5">
          {[
            { icon: "👍", label: "Like" },
            { icon: "💬", label: "Comment" },
            { icon: "↗️", label: "Share" },
          ].map((a) => (
            <button key={a.label} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-white/40 hover:bg-white/[0.04] transition-colors">
              <span className="text-xs">{a.icon}</span>
              <span className="text-[11px] font-medium">{a.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── LinkedIn ─── */
function LinkedInMockup({ format = "square", imageUrl, caption, username, avatarUrl, likes, comments, timestamp }: Omit<SocialMockupProps, "platform">) {
  const displayName = username || "Your Name";
  const displayLikes = likes || "87";
  const displayComments = comments || "12";
  const displayCaption = caption || "Your post content will appear here...";
  const displayTime = timestamp || "2h";

  return (
    <div className="rounded-xl overflow-hidden bg-[#1B1F23] border border-white/[0.06]">
      {/* Header */}
      <div className="px-3 pt-3 pb-2">
        <div className="flex items-center gap-2.5 mb-2">
          <div className="w-10 h-10 rounded-full overflow-hidden">
            {avatarUrl ? <img src={avatarUrl} alt="" className="w-full h-full object-cover" /> : <DefaultAvatar color="#0A66C2" />}
          </div>
          <div className="flex-1">
            <span className="text-white text-xs font-semibold block">{displayName}</span>
            <span className="text-white/30 text-[10px] block">Real Estate Professional</span>
            <div className="flex items-center gap-1 text-white/25 text-[10px]">
              <span>{displayTime}</span>
              <span>·</span>
              <svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor"><path d="M8 0a8 8 0 100 16A8 8 0 008 0zM3.5 8a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0z" opacity={0.4} /></svg>
            </div>
          </div>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="white" className="opacity-20">
            <circle cx="5" cy="12" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="19" cy="12" r="1.5" />
          </svg>
        </div>
        <p className="text-white/70 text-xs leading-relaxed mb-2">{displayCaption}</p>
      </div>

      {/* Image */}
      {imageUrl ? (
        <img src={imageUrl} alt="" className="w-full" style={{ aspectRatio: `${FORMAT_RATIOS[format].w}/${FORMAT_RATIOS[format].h}` }} />
      ) : (
        <ImagePlaceholder format={format} />
      )}

      {/* Reactions */}
      <div className="px-3 pt-2.5 pb-1">
        <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
          <div className="flex items-center gap-1">
            <div className="flex -space-x-0.5">
              <span className="text-[10px]">👍</span>
              <span className="text-[10px]">💡</span>
              <span className="text-[10px]">❤️</span>
            </div>
            <span className="text-white/30 text-[10px]">{displayLikes}</span>
          </div>
          <span className="text-white/25 text-[10px]">{displayComments} comments</span>
        </div>

        <div className="flex items-center justify-around py-1">
          {["Like", "Comment", "Repost", "Send"].map((label) => (
            <button key={label} className="flex items-center gap-1 px-2 py-1.5 rounded text-white/30 text-[11px] font-medium hover:bg-white/[0.04] transition-colors">
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Twitter / X ─── */
function TwitterMockup({ format = "square", imageUrl, caption, username, avatarUrl, likes, comments, shares, timestamp }: Omit<SocialMockupProps, "platform">) {
  const displayName = username || "Your Brand";
  const handle = `@${(username || "yourbrand").toLowerCase().replace(/\s/g, "")}`;
  const displayLikes = likes || "56";
  const displayComments = comments || "4";
  const displayShares = shares || "12";
  const displayCaption = caption || "Your tweet will appear here...";
  const displayTime = timestamp || "2h";

  return (
    <div className="rounded-xl overflow-hidden bg-black border border-white/[0.08]">
      <div className="px-3 pt-3">
        <div className="flex gap-2.5">
          <div className="w-9 h-9 rounded-full overflow-hidden shrink-0">
            {avatarUrl ? <img src={avatarUrl} alt="" className="w-full h-full object-cover" /> : <DefaultAvatar color="#1DA1F2" />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="text-white text-xs font-bold truncate">{displayName}</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="#1DA1F2"><path d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.998-3.818-3.998-.47 0-.92.084-1.336.25C14.818 2.415 13.51 1.5 12 1.5s-2.816.917-3.437 2.25c-.415-.165-.866-.25-1.336-.25-2.11 0-3.818 1.79-3.818 4 0 .494.083.964.237 1.4-1.272.65-2.147 2.018-2.147 3.6 0 1.495.782 2.798 1.942 3.486-.02.17-.032.34-.032.514 0 2.21 1.708 4 3.818 4 .47 0 .92-.086 1.335-.25.62 1.334 1.926 2.25 3.437 2.25 1.512 0 2.818-.916 3.437-2.25.415.163.865.248 1.336.248 2.11 0 3.818-1.79 3.818-4 0-.174-.012-.344-.033-.513 1.158-.687 1.943-1.99 1.943-3.484zm-6.616-3.334l-4.334 6.5c-.145.217-.382.334-.625.334-.143 0-.288-.04-.416-.126l-.115-.094-2.415-2.415c-.293-.293-.293-.768 0-1.06s.768-.294 1.06 0l1.77 1.767 3.825-5.74c.23-.345.696-.436 1.04-.207.346.23.44.696.21 1.04z" /></svg>
            </div>
            <div className="flex items-center gap-1 text-white/30 text-[10px] mb-2">
              <span>{handle}</span>
              <span>·</span>
              <span>{displayTime}</span>
            </div>
            <p className="text-white/80 text-xs leading-relaxed mb-2.5">{displayCaption}</p>

            {/* Image */}
            <div className="rounded-xl overflow-hidden mb-2.5">
              {imageUrl ? (
                <img src={imageUrl} alt="" className="w-full" style={{ aspectRatio: `${FORMAT_RATIOS[format].w}/${FORMAT_RATIOS[format].h}` }} />
              ) : (
                <ImagePlaceholder format={format} />
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pb-2.5 text-white/30">
              <div className="flex items-center gap-1">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 01-.923 1.785A5.969 5.969 0 006 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337z" /></svg>
                <span className="text-[10px]">{displayComments}</span>
              </div>
              <div className="flex items-center gap-1">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12c0-1.232-.046-2.453-.138-3.662a4.006 4.006 0 00-3.7-3.7 48.678 48.678 0 00-7.324 0 4.006 4.006 0 00-3.7 3.7c-.017.22-.032.441-.046.662M19.5 12l3-3m-3 3l-3-3m-12 3c0 1.232.046 2.453.138 3.662a4.006 4.006 0 003.7 3.7 48.656 48.656 0 007.324 0 4.006 4.006 0 003.7-3.7c.017-.22.032-.441.046-.662M4.5 12l3 3m-3-3l-3 3" /></svg>
                <span className="text-[10px]">{displayShares}</span>
              </div>
              <div className="flex items-center gap-1">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" /></svg>
                <span className="text-[10px]">{displayLikes}</span>
              </div>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" /></svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Main Component ─── */
export default function SocialMockup(props: SocialMockupProps) {
  const { platform, format: initialFormat } = props;
  const config = PLATFORM_CONFIG[platform];
  const [activeFormat, setActiveFormat] = useState<PostFormat>(initialFormat || "square");

  const mockupProps = { ...props, format: activeFormat };

  return (
    <div className="mt-3">
      {/* Platform label + format selector */}
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2">
          <div className={`w-1.5 h-1.5 rounded-full bg-gradient-to-r ${config.gradient}`} />
          <span className="text-[11px] font-medium text-white/50">{config.name} Preview</span>
        </div>
        <div className="flex gap-1">
          {config.formats.map((f) => (
            <button
              key={f}
              onClick={() => setActiveFormat(f)}
              className={`px-2 py-0.5 rounded text-[10px] transition-all ${
                activeFormat === f
                  ? "bg-white/[0.08] text-white/70"
                  : "text-white/20 hover:text-white/40"
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Mockup */}
      <div className="max-w-[320px]">
        {platform === "instagram" && <InstagramMockup {...mockupProps} />}
        {platform === "facebook" && <FacebookMockup {...mockupProps} />}
        {platform === "linkedin" && <LinkedInMockup {...mockupProps} />}
        {platform === "twitter" && <TwitterMockup {...mockupProps} />}
      </div>
    </div>
  );
}

export { PLATFORM_CONFIG, FORMAT_RATIOS };
