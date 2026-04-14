"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import PartsTable from "@/components/PartsTable";
import { api, type Part } from "@/lib/api";

export default function HomePage() {
  const router = useRouter();
  const [parts, setParts] = useState<Part[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
          <a
            href="/parts/new"
            className="bg-[var(--color-primary)] text-white px-4 py-2 rounded hover:opacity-90"
          >
            + New part
          </a>
        </div>
      </div>
      <PartsTable
        parts={parts}
        selected={selected}
        onToggle={toggle}
        onToggleAll={toggleAll}
      />
    </div>
  );
}
