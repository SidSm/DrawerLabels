"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import TypeCombobox from "./TypeCombobox";
import { api, type Part } from "@/lib/api";

interface Props {
  initial?: Part;
}

const DESC_MAX_WORDS = 2;
const DESC_MAX_WORD_CHARS = 12;

function validateDesc(desc: string): string | null {
  const trimmed = desc.trim();
  if (!trimmed) return null;
  const words = trimmed.split(/\s+/);
  if (words.length > DESC_MAX_WORDS) {
    return `Max ${DESC_MAX_WORDS} words.`;
  }
  if (words.some((w) => w.length > DESC_MAX_WORD_CHARS)) {
    return `Each word max ${DESC_MAX_WORD_CHARS} chars.`;
  }
  return null;
}

export default function PartForm({ initial }: Props) {
  const router = useRouter();
  const [title, setTitle] = useState(initial?.title ?? "");
  const [desc, setDesc] = useState(initial?.short_description ?? "");
  const [type, setType] = useState(initial?.type ?? "bolt-socket");
  const [customImagePath, setCustomImagePath] = useState(initial?.custom_image_path ?? "");
  const [urls, setUrls] = useState<string[]>(initial?.urls.map((u) => u.url) ?? [""]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const descError = validateDesc(desc);

  const updateUrl = (i: number, v: string) =>
    setUrls((prev) => prev.map((u, idx) => (idx === i ? v : u)));
  const addUrl = () => setUrls((prev) => [...prev, ""]);
  const removeUrl = (i: number) => setUrls((prev) => prev.filter((_, idx) => idx !== i));

  const handleImageUpload = async (file: File) => {
    setUploading(true);
    setUploadError("");
    try {
      const path = await api.uploadImage(file);
      setCustomImagePath(path);
    } catch (e) {
      setUploadError(String(e));
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (descError) { setError(descError); return; }
    setSaving(true);
    setError("");
    try {
      const cleanUrls = urls.filter((u) => u.trim());
      if (initial) {
        await api.parts.update(initial.id, {
          title, short_description: desc.trim() || null, type,
          custom_image_path: customImagePath || null,
          urls: cleanUrls,
        });
      } else {
        await api.parts.create({
          title, short_description: desc.trim() || null, type,
          custom_image_path: customImagePath || null,
          urls: cleanUrls,
        });
      }
      router.push("/");
      router.refresh();
    } catch (e) {
      setError(String(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
      {error && <p className="text-red-600 text-sm">{error}</p>}

      <div>
        <label className="block text-sm font-medium mb-1">Title</label>
        <input required className="border rounded px-2 py-1 w-full"
          value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">
          Short description <span className="text-gray-400 font-normal">(max 2 words, 12 chars each)</span>
        </label>
        <input className="border rounded px-2 py-1 w-full"
          value={desc} onChange={(e) => setDesc(e.target.value)} />
        {descError && <p className="text-red-600 text-xs mt-1">{descError}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Type</label>
        <p className="text-xs text-gray-500 mb-2">
          Picks the icon shown on the printed label. Choose <code>custom</code> to upload your own image below.
        </p>
        <TypeCombobox value={type} onChange={setType} />
      </div>

      <div>
        <label htmlFor="custom-image" className="block text-sm font-medium mb-1">
          Custom image <span className="text-gray-400 font-normal">(only used when type is <code>custom</code>)</span>
        </label>
        <div className="flex items-center gap-3">
          <label
            htmlFor="custom-image"
            className="inline-block cursor-pointer bg-[var(--color-primary)] text-white px-4 py-2 rounded hover:opacity-90 text-sm"
          >
            {uploading ? "Uploading…" : customImagePath ? "Replace image" : "Choose image"}
          </label>
          {customImagePath && (
            <button
              type="button"
              onClick={() => setCustomImagePath("")}
              className="text-sm text-red-500 hover:underline"
            >
              Remove
            </button>
          )}
        </div>
        <input
          id="custom-image"
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleImageUpload(f);
            e.target.value = "";
          }}
        />
        {customImagePath && (
          <div className="mt-2 flex items-center gap-2">
            <img
              src={`/${customImagePath}`}
              alt="preview"
              className="w-16 h-16 object-contain border rounded bg-white"
            />
            <p className="text-xs text-gray-500 break-all">{customImagePath}</p>
          </div>
        )}
        {uploadError && (
          <p className="text-red-600 text-sm mt-1">Upload failed: {uploadError}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Sourcing URLs</label>
        <div className="space-y-2">
          {urls.map((url, i) => (
            <div key={i} className="flex gap-2">
              <input className="border rounded px-2 py-1 flex-1 text-sm"
                value={url} onChange={(e) => updateUrl(i, e.target.value)}
                placeholder="https://…" />
              <button type="button" onClick={() => removeUrl(i)}
                className="text-red-500 text-sm px-2">✕</button>
            </div>
          ))}
        </div>
        <button type="button" onClick={addUrl}
          className="mt-2 text-sm text-[var(--color-primary)] hover:underline">
          + Add URL
        </button>
      </div>

      <div className="flex gap-3 pt-2">
        <button type="submit" disabled={saving || !!descError}
          className="bg-[var(--color-primary)] text-white px-4 py-2 rounded hover:opacity-90 disabled:opacity-50">
          {saving ? "Saving…" : initial ? "Save changes" : "Create part"}
        </button>
        <button type="button" onClick={() => router.back()}
          className="px-4 py-2 rounded border hover:bg-gray-50">
          Cancel
        </button>
      </div>
    </form>
  );
}
