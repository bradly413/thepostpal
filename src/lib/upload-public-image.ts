/** Upload a data URL or remote URL; returns a public path on this origin when possible. */
export async function resolvePublicImageUrl(
  imageUrl: string,
): Promise<string> {
  if (!imageUrl.startsWith("data:")) {
    return imageUrl;
  }

  const res = await fetch(imageUrl);
  const blob = await res.blob();
  const ext = blob.type.includes("png") ? "png" : "jpg";
  const form = new FormData();
  form.append("file", blob, `publish.${ext}`);

  const upload = await fetch("/api/upload", { method: "POST", body: form });
  const data = await upload.json().catch(() => ({}));
  if (!upload.ok || !data.url) {
    throw new Error(data.error || "Could not upload image for publishing");
  }

  if (data.url.startsWith("http")) return data.url;
  return `${window.location.origin}${data.url}`;
}
