"use client";

import {
  Heart,
  MessageCircle,
  Send,
  Bookmark,
  ThumbsUp,
  Share2,
  Globe,
  MoreHorizontal,
} from "lucide-react";

type Platform = "facebook" | "instagram" | "both";

interface PostPreviewProps {
  platform: Platform;
  mediaUrl: string;
  mediaType: "image" | "video";
  caption: string;
  accountName: string;
  avatarInitials: string;
  uploadingMedia: boolean;
  onPickFile: (file: File | undefined) => void;
  onRemove: () => void;
  mediaError?: string | null;
}

function handleFrom(name: string): string {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "");
  return `@${slug || "yourbrand"}`;
}

function Avatar({ initials }: { initials: string }) {
  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#ee2532] to-[#c81e2a] text-[11px] font-bold text-white">
      {initials}
    </span>
  );
}

function MediaArea({
  mediaUrl,
  mediaType,
  uploadingMedia,
  onPickFile,
  onRemove,
  sizeClass,
}: {
  mediaUrl: string;
  mediaType: "image" | "video";
  uploadingMedia: boolean;
  onPickFile: (file: File | undefined) => void;
  onRemove: () => void;
  sizeClass: string;
}) {
  if (!mediaUrl) {
    return (
      <label
        className={`flex ${sizeClass} w-full cursor-pointer flex-col items-center justify-center gap-2 bg-black/[0.03] text-center transition-colors hover:bg-black/[0.05] ${
          uploadingMedia ? "pointer-events-none" : ""
        }`}
      >
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#ee2532]/10 text-xl font-light leading-none text-[#ee2532]">
          +
        </span>
        <span className="text-xs font-medium text-black/55">Add a photo or video</span>
        <input
          type="file"
          accept="image/*,video/*"
          className="sr-only"
          onChange={(e) => onPickFile(e.target.files?.[0])}
          disabled={uploadingMedia}
        />
      </label>
    );
  }

  return (
    <div className="relative w-full bg-black/[0.04]">
      {mediaType === "video" ? (
        <video src={mediaUrl} className="block w-full max-h-[400px] object-contain" muted />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={mediaUrl} alt="" className="block w-full max-h-[400px] object-contain" />
      )}
      {uploadingMedia && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/55 backdrop-blur-md">
          <span className="h-6 w-6 rounded-full border-2 border-[#323232]/25 border-t-[#323232] animate-spin" aria-hidden />
        </div>
      )}
      {!uploadingMedia && (
        <div className="absolute right-2 top-2 flex gap-1.5">
          <label className="cursor-pointer rounded-lg bg-black/55 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur transition-colors hover:bg-black/70">
            Change
            <input
              type="file"
              accept="image/*,video/*"
              className="sr-only"
              onChange={(e) => onPickFile(e.target.files?.[0])}
            />
          </label>
          <button
            type="button"
            onClick={onRemove}
            className="rounded-lg bg-black/55 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur transition-colors hover:bg-black/70"
          >
            Remove
          </button>
        </div>
      )}
    </div>
  );
}

function InstagramCard(props: Omit<PostPreviewProps, "platform">) {
  const { caption, accountName, avatarInitials } = props;
  const handle = handleFrom(accountName);
  return (
    <div className="mx-auto w-full max-w-[288px] overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm">
      <div className="flex items-center gap-2.5 px-3 py-2.5">
        <Avatar initials={avatarInitials} />
        <p className="min-w-0 flex-1 truncate text-[13px] font-semibold text-black">{handle}</p>
        <MoreHorizontal size={16} className="text-black/40" aria-hidden />
      </div>
      <MediaArea {...props} sizeClass="h-[210px]" />
      <div className="flex items-center gap-4 px-3 pt-2.5 text-black">
        <Heart size={20} aria-hidden />
        <MessageCircle size={20} aria-hidden />
        <Send size={20} aria-hidden />
        <Bookmark size={20} className="ml-auto" aria-hidden />
      </div>
      <div className="px-3 pb-3 pt-2">
        <p className="line-clamp-2 text-[13px] leading-snug text-black">
          <span className="font-semibold">{handle.replace("@", "")}</span>{" "}
          {caption.trim() || <span className="text-black/40">Your caption will appear here.</span>}
        </p>
        <p className="mt-1 text-[10px] uppercase tracking-wide text-black/40">Just now</p>
      </div>
    </div>
  );
}

function FacebookCard(props: Omit<PostPreviewProps, "platform">) {
  const { caption, accountName, avatarInitials } = props;
  return (
    <div className="mx-auto w-full max-w-[300px] overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm">
      <div className="flex items-center gap-2.5 px-3 py-2.5">
        <Avatar initials={avatarInitials} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-semibold text-black">{accountName}</p>
          <p className="flex items-center gap-1 text-[11px] text-black/45">
            Just now <span aria-hidden>·</span> <Globe size={10} aria-hidden />
          </p>
        </div>
        <MoreHorizontal size={16} className="text-black/40" aria-hidden />
      </div>
      {caption.trim() ? (
        <p className="px-3 pb-2 text-[13px] leading-snug text-black">{caption}</p>
      ) : (
        <p className="px-3 pb-2 text-[13px] leading-snug text-black/40">Your caption will appear here.</p>
      )}
      <MediaArea {...props} sizeClass="h-[168px]" />
      <div className="flex items-center justify-around border-t border-black/[0.06] px-3 py-1.5 text-[12px] font-medium text-black/55">
        <span className="flex items-center gap-1.5">
          <ThumbsUp size={15} aria-hidden /> Like
        </span>
        <span className="flex items-center gap-1.5">
          <MessageCircle size={15} aria-hidden /> Comment
        </span>
        <span className="flex items-center gap-1.5">
          <Share2 size={15} aria-hidden /> Share
        </span>
      </div>
    </div>
  );
}

/** Live, platform-accurate mock of the post being composed (Instagram / Facebook chrome).
 * Renders the Facebook card only when Facebook is the sole channel; otherwise the
 * Instagram card (the channel toggles in the composer select what actually posts). */
export default function PostPreview({ platform, ...rest }: PostPreviewProps) {
  const active: "instagram" | "facebook" = platform === "facebook" ? "facebook" : "instagram";
  return (
    <div className="mb-3">
      {active === "instagram" ? <InstagramCard {...rest} /> : <FacebookCard {...rest} />}
      {rest.mediaError && (
        <p className="mt-2 text-center text-[11px] text-[#ee2532]">{rest.mediaError}</p>
      )}
    </div>
  );
}
