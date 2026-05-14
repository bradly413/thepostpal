import { NextResponse } from "next/server";

export async function GET() {
  const token = process.env.VIMEO_ACCESS_TOKEN;
  if (!token) {
    return NextResponse.json({ error: "Vimeo not configured" }, { status: 400 });
  }

  try {
    const res = await fetch(
      "https://api.vimeo.com/me/videos?per_page=12&sort=date&direction=desc&fields=uri,name,duration,link,pictures.sizes,embed.html",
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.vimeo.*+json;version=3.4",
        },
        next: { revalidate: 300 },
      }
    );

    if (!res.ok) {
      return NextResponse.json({ error: "Failed to fetch videos" }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Vimeo fetch failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
