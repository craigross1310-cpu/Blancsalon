"use client";
import { useState } from "react";

/** Resizes the chosen photo in the browser (max 1200px JPEG) before upload. */
export function ImageInput({ current }: { current: string | null }) {
  const [preview, setPreview] = useState<string | null>(current);
  const [data, setData] = useState("");
  const [remove, setRemove] = useState(false);
  async function onFile(file: File) {
    const img = new Image();
    img.src = URL.createObjectURL(file);
    await img.decode();
    const scale = Math.min(1, 1200 / Math.max(img.width, img.height));
    const c = document.createElement("canvas");
    c.width = Math.round(img.width * scale);
    c.height = Math.round(img.height * scale);
    c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
    const url = c.toDataURL("image/jpeg", 0.82);
    setData(url);
    setPreview(url);
    setRemove(false);
  }
  return (
    <div className="space-y-3">
      {preview && !remove ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={preview} alt="Treatment" className="aspect-square w-40 rounded object-cover" />
      ) : (
        <div className="flex aspect-square w-40 items-center justify-center rounded bg-cream text-xs text-taupe">No image</div>
      )}
      <input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} className="block text-xs" />
      <input type="hidden" name="imageData" value={data} />
      {preview && (
        <label className="flex items-center gap-2 text-xs">
          <input type="checkbox" name="removeImage" checked={remove} onChange={(e) => setRemove(e.target.checked)} /> Remove image
        </label>
      )}
    </div>
  );
}
