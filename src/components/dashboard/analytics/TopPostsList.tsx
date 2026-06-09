"use client";

import type { MetaTopPost } from "@/lib/meta-insights-types";

export default function TopPostsList({ posts }: { posts: MetaTopPost[] }) {
  if (posts.length === 0) {
    return (
      <div className="pb-panel">
        <h3 className="pb-panel-h">Top posts</h3>
        <p className="text-sm opacity-50 mt-2">Publish a few posts to see what resonates.</p>
      </div>
    );
  }

  return (
    <div className="pb-panel">
      <h3 className="pb-panel-h">Top posts</h3>
      <div className="space-y-3 mt-3">
        {posts.map((post, i) => (
          <article key={post.id} className="pb-row flex gap-3 items-start">
            <span className="text-xs font-bold opacity-40 w-5 shrink-0 pt-0.5">{i + 1}</span>
            {post.imageUrl ? (
              <img
                src={post.imageUrl}
                alt=""
                className="w-12 h-12 rounded-lg object-cover shrink-0 border border-black/10"
              />
            ) : (
              <div className="w-12 h-12 rounded-lg bg-black/5 shrink-0" />
            )}
            <div className="min-w-0 flex-1">
              <p className="text-xs uppercase tracking-wide opacity-45 mb-0.5">{post.platform}</p>
              <p className="text-sm line-clamp-2">{post.message}</p>
              <p className="text-xs opacity-50 mt-1">
                {post.engagement.toLocaleString()} engagements
                {post.likes > 0 ? ` · ${post.likes} likes` : ""}
                {post.comments > 0 ? ` · ${post.comments} comments` : ""}
              </p>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
