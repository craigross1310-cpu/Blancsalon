import { randomUUID } from "node:crypto";

/**
 * Stores a treatment image. If Supabase Storage is configured the file goes to
 * the public "treatment-images" bucket; otherwise (demo) a small, already
 * client-resized data URL is stored directly.
 */
export async function storeImage(dataUrl: string): Promise<string> {
  const m = /^data:(image\/(jpeg|png|webp));base64,(.+)$/.exec(dataUrl);
  if (!m) throw new Error("Unsupported image format");
  const bytes = Buffer.from(m[3], "base64");
  if (bytes.length > 1_500_000) throw new Error("Image is too large (max 1.5MB after resizing)");
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return dataUrl;
  const bucket = process.env.SUPABASE_IMAGE_BUCKET || "treatment-images";
  const path = `${randomUUID()}.${m[2] === "jpeg" ? "jpg" : m[2]}`;
  const res = await fetch(`${url}/storage/v1/object/${bucket}/${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": m[1], "x-upsert": "false" },
    body: bytes,
  });
  if (!res.ok) throw new Error(`Image upload failed (${res.status})`);
  return `${url}/storage/v1/object/public/${bucket}/${path}`;
}
