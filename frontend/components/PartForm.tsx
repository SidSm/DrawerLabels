"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import TypeCombobox from "./TypeCombobox";
import { api, type Part } from "@/lib/api";

interface Props {
  initial?: Part;
}

export default function PartForm({ initial }: Props) {
  const router = useRouter();
  const [title, setTitle] = useState(initial?.title ?? "");
  const [desc, setDesc] = useState(initial?.short_description ?? "");
  const [type, setType] = useState(initial?.type ?? "bolt-socket");
  const [customImagePath, setCustomImagePath] = useState(initial?.custom_image_path ?? "");
  const [urls, setUrls] = useState<string[]>(initial?.urls.map((u) => u.url) ?? [""]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const updateUrl = (i: number, v: string) =>
    setUrls((prev) => prev.map((u, idx) => (idx === i ? v : u)));
  const addUrl = () => setUrls((prev) => [...prev, ""]);
  const removeUrl = (i: number) => setUrls((prev) => prev.filter((_, idx) => idx !== i));

  const handleImageUpload = async (file: File) => {
    setUploading(true);
    try {
      const path = await api.uploadImage(file);
      setCustomImagePath(path);
    } catch (e) {
      setError(String(e));
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const cleanUrls = urls.filter((u) => u.trim());
      if (initial) {
        await api.parts.update(initial.id, {
          title, short_description: desc, type,
          custom_image_path: customImagePath || null,
          urls: cleanUrls,
        });
      } else {
        await api.parts.create({
          title, short_description: desc, type,
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
        <label className="block text-sm font-medium mb-1">Short description</label>
        <input required className="border rounded px-2 py-1 w-full"
          value={desc} onChange={(e) => setDesc(e.target.value)} />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Type</label>
        <TypeCombobox value={type} onChange={setType} />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Custom image</label>
        <input type="file" accept="image/*"
          onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0])} />
        {uploading && <p className="text-sm text-gray-500">Uploading…</p>}
        {customImagePath && (
          <p className="text-xs text-gray-500 mt-1">Current: {customImagePath}</p>
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
        <button type="submit" disabled={saving}
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
