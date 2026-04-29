"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import PartsTable from "@/components/PartsTable";
import { api, type Part } from "@/lib/api";

export default function HomePage() {
  const router = useRouter();
  const [parts, setParts] = useState<Part[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return parts;
    return parts.filter((p) =>
      p.title.toLowerCase().includes(q) ||
      (p.short_description ?? "").toLowerCase().includes(q) ||
      p.type.toLowerCase().includes(q),
    );
  }, [parts, query]);

  useEffect(() => {
    api.parts.list()
      .then(setParts)
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, []);

  const toggle = (id: number) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const toggleAll = (ids: number[]) =>
    setSelected((prev) => {
      const allIn = ids.every((id) => prev.has(id));
      const next = new Set(prev);
      if (allIn) ids.forEach((id) => next.delete(id));
      else ids.forEach((id) => next.add(id));
      return next;
    });

  const handlePrint = () => {
    if (selected.size === 0) return;
    const ids = [...selected].join(",");
    router.push(`/print?ids=${ids}`);
  };

  const handleDelete = async () => {
    if (selected.size === 0) return;
    setDeleting(true);
    const ids = [...selected];
    const failed: number[] = [];
    await Promise.all(
      ids.map((id) =>
        api.parts.delete(id).catch(() => { failed.push(id); }),
      ),
    );
    setParts((prev) => prev.filter((p) => failed.includes(p.id) || !ids.includes(p.id)));
    setSelected(new Set(failed));
    setConfirmDelete(false);
    setDeleting(false);
    if (failed.length) setError(`Failed to delete ${failed.length} item(s).`);
  };

  if (loading) return <p className="text-gray-500">Loading…</p>;
  if (error) return <p className="text-red-600">{error}</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[var(--color-primary)]">Parts</h1>
        <div className="flex gap-3">
          <button
            onClick={handlePrint}
            disabled={selected.size === 0}
            className="bg-[var(--color-accent)] text-white px-4 py-2 rounded hover:opacity-90 disabled:opacity-40"
          >
            Print selected ({selected.size})
          </button>
          <button
            onClick={() => setConfirmDelete(true)}
            disabled={selected.size === 0}
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 disabled:opacity-40"
          >
            Delete selected ({selected.size})
          </button>
          <a
            href="/parts/new"
            className="bg-[var(--color-primary)] text-white px-4 py-2 rounded hover:opacity-90"
          >
            + New part
          </a>
        </div>
      </div>
      {confirmDelete && (
        <div className="flex items-center justify-between bg-red-50 border border-red-300 rounded px-4 py-3">
          <p className="text-red-800 text-sm">
            Delete {selected.size} part{selected.size === 1 ? "" : "s"}? This cannot be undone.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setConfirmDelete(false)}
              disabled={deleting}
              className="border px-3 py-1 rounded hover:bg-white text-sm"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 text-sm disabled:opacity-40"
            >
              {deleting ? "Deleting…" : "Delete"}
            </button>
          </div>
        </div>
      )}
      <input
        type="search"
        placeholder="Search by title, description, or type…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full border rounded px-3 py-2"
      />
      <PartsTable
        parts={filtered}
        selected={selected}
        onToggle={toggle}
        onToggleAll={toggleAll}
      />
    </div>
  );
}
