#!/usr/bin/env node
/**
 * Image-engine bake-off: run a fixed Studio prompt suite through Gemini
 * (Nano Banana) and GPT Image side by side, write a contact-sheet HTML.
 *
 *   node scripts/image-bakeoff.mjs             # both engines (needs both keys)
 *   node scripts/image-bakeoff.mjs gemini      # Gemini standard vs pro
 *
 * Reads GEMINI_API_KEY / OPENAI_API_KEY from .env.local. Output goes to
 * bakeoff-output/ (gitignored) — open index.html and eyeball.
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const OUT = join(root, "bakeoff-output");

function env(name) {
  if (process.env[name]) return process.env[name];
  try {
    const line = readFileSync(join(root, ".env.local"), "utf8")
      .split("\n")
      .find((l) => l.startsWith(`${name}=`));
    return line ? line.slice(name.length + 1).replace(/^"|"$/g, "").trim() : null;
  } catch {
    return null;
  }
}

const GEMINI_KEY = env("GEMINI_API_KEY");
const OPENAI_KEY = env("OPENAI_API_KEY");

// The categories the Studio actually serves.
const SUITE = [
  { id: "product-hero", aspect: "1:1", prompt: "A tall strawberry smoothie in a clear glass, hero of the frame on a solid red seamless backdrop, condensation beading, 85mm f/2.8, one large softbox from camera left, bright high-key commercial grade, vivid saturated color." },
  { id: "food-hero", aspect: "4:5", prompt: "A basket of crispy buffalo wings with visible glossy sauce texture, celery sticks and ranch beside, on kraft paper, warm appetizing light, 50mm f/4, bright clean commercial food photography." },
  { id: "beauty-portrait", aspect: "4:5", prompt: "A radiant client portrait with glowing skin on a soft ivory seamless background, natural makeup, confident warm expression, 85mm f/2, beauty-dish lighting, bright high-key med-spa aesthetic." },
  { id: "scenic", aspect: "16:9", prompt: "Wide scenic establishing shot of a Midwestern lake at golden hour, calm water, natural proportions, level horizon, professional travel photography, vivid but believable color." },
  { id: "promo-flyer", aspect: "4:5", prompt: 'A promotional social graphic for a coffee shop: photographic espresso drink with designed typography reading "FRIDAY: $5 OFF" large and correctly spelled, clean layout, brand-red accent color, nothing else written.' },
  { id: "ad-layout", aspect: "4:5", prompt: 'A polished product advertisement layout for an eyelash serum: silver tube product shot, elegant serif headline "ADVANCED LASH SERUM", three short benefit lines with small icons, dark navy editorial background, premium beauty-brand typography, correctly spelled.' },
];

async function gemini(prompt, aspect, quality) {
  const model = quality === "pro" ? "gemini-3-pro-image" : "gemini-3.1-flash-image";
  const res = await fetch("https://generativelanguage.googleapis.com/v1beta/interactions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": GEMINI_KEY },
    body: JSON.stringify({
      model,
      input: [{ type: "text", text: prompt }],
      response_format: { type: "image", mime_type: "image/jpeg", aspect_ratio: aspect },
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || `gemini ${res.status}`);
  let b64 = data.output_image?.data || null;
  if (!b64) {
    for (const step of data.steps ?? []) {
      for (const block of step.content ?? step.summary ?? []) {
        if (block.type === "image" && block.data) b64 = block.data;
      }
    }
  }
  if (!b64) throw new Error("gemini: no image");
  return b64;
}

async function gpt(prompt, aspect, quality) {
  const size = aspect === "16:9" ? "1536x1024" : aspect === "1:1" ? "1024x1024" : "1024x1536";
  const res = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${OPENAI_KEY}` },
    body: JSON.stringify({
      model: "gpt-image-2",
      prompt,
      n: 1,
      size,
      quality: quality === "pro" ? "high" : "medium",
      output_format: "jpeg",
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || `gpt ${res.status}`);
  const b64 = data.data?.[0]?.b64_json;
  if (!b64) throw new Error("gpt: no image");
  return b64;
}

const mode = process.argv[2] || "both";
const columns =
  mode === "gemini"
    ? [
        { label: "Gemini standard", run: (p, a) => gemini(p, a, "standard") },
        { label: "Gemini pro", run: (p, a) => gemini(p, a, "pro") },
      ]
    : [
        { label: "Gemini pro", run: (p, a) => gemini(p, a, "pro") },
        { label: "GPT Image 2", run: (p, a) => gpt(p, a, "pro") },
      ];

if (!GEMINI_KEY) { console.error("GEMINI_API_KEY missing"); process.exit(1); }
if (mode !== "gemini" && !OPENAI_KEY) { console.error("OPENAI_API_KEY missing — run with `gemini` arg for a Gemini-only sheet"); process.exit(1); }

mkdirSync(OUT, { recursive: true });
const rows = [];
for (const test of SUITE) {
  const cells = [];
  for (const col of columns) {
    const t0 = Date.now();
    try {
      const b64 = await col.run(test.prompt, test.aspect);
      const file = `${test.id}--${col.label.replace(/\W+/g, "-")}.jpg`;
      writeFileSync(join(OUT, file), Buffer.from(b64, "base64"));
      const secs = ((Date.now() - t0) / 1000).toFixed(1);
      cells.push(`<td><img src="${file}"><div class="m">${col.label} · ${secs}s</div></td>`);
      console.log(`ok   ${test.id} / ${col.label} (${secs}s)`);
    } catch (err) {
      cells.push(`<td><div class="err">${col.label}: ${String(err.message).slice(0, 160)}</div></td>`);
      console.log(`FAIL ${test.id} / ${col.label}: ${err.message}`);
    }
  }
  rows.push(`<tr><th>${test.id}<div class="p">${test.prompt.slice(0, 160)}…</div></th>${cells.join("")}</tr>`);
}

writeFileSync(
  join(OUT, "index.html"),
  `<!doctype html><meta charset="utf-8"><title>Posterboy image bake-off</title>
<style>body{font-family:system-ui;margin:24px;background:#f7f4ee}table{border-collapse:collapse}
td,th{padding:10px;vertical-align:top;text-align:left;border-bottom:1px solid #ddd}
img{width:340px;border-radius:10px;display:block}th{max-width:230px;font-size:13px}
.p{font-weight:400;color:#666;font-size:11px;margin-top:6px}.m{font-size:12px;color:#444;margin-top:4px}
.err{width:340px;color:#c00;font-size:12px}</style>
<h1>Image engine bake-off</h1><table>${rows.join("")}</table>`,
);
console.log(`\nContact sheet: ${join(OUT, "index.html")}`);
