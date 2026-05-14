export interface VimeoVideo {
  uri: string;
  name: string;
  duration: number;
  link: string;
  pictures: {
    sizes: { width: number; height: number; link: string }[];
  };
  embed: {
    html: string;
  };
}

export interface VimeoListResponse {
  total: number;
  data: VimeoVideo[];
}

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function getThumbnail(video: VimeoVideo, width = 640): string {
  const sorted = [...video.pictures.sizes].sort(
    (a, b) => Math.abs(a.width - width) - Math.abs(b.width - width)
  );
  return sorted[0]?.link || "";
}

export function getVideoId(video: VimeoVideo): string {
  return video.uri.replace("/videos/", "");
}
