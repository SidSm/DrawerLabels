"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, type Part } from "@/lib/api";

interface Props {
  parts: Part[];
  selected: Set<number>;
  onToggle: (id: number) => void;
  onToggleAll: (ids: number[]) => void;
}

export default function PartsTable({ parts, selected, onToggle, onToggleAll }: Props) {
  const router = useRouter();
  const [deleting, setDeleting] = useState<number | null>(null);

  const allSelected = parts.length > 0 && parts.every((p) => selected.has(p.id));

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this part?")) return;
    setDeleting(id);
    try {
      await api.parts.delete(id);
      router.refresh();
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-[var(--color-primary)] text-white">
            <th className="p-2 w-8">
              <input type="checkbox" checked={allSelected}
                onChange={() => onToggleAll(parts.map((p) => p.id))} />
            </th>
            <th className="p-2 text-left">Title</th>
            <th className="p-2 text-left">Description</th>
            <th className="p-2 text-left">Type</th>
            <th className="p-2 text-center">URLs</th>
            <th className="p-2 text-center">Actions</th>
          </tr>
        </thead>
        <tbody>
          {parts.map((p) => (
            <tr key={p.id} className="border-b hover:bg-gray-50">
              <td className="p-2 text-center">
                <input type="checkbox" checked={selected.has(p.id)}
                  onChange={() => onToggle(p.id)} />
              </td>
              <td className="p-2 font-medium">{p.title}</td>
              <td className="p-2 text-gray-600">{p.short_description}</td>
              <td className="p-2">
                <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">{p.type}</span>
              </td>
              <td className="p-2 text-center text-gray-500">{p.urls.length}</td>
              <td className="p-2 text-center flex gap-2 justify-center">
                <a href={`/parts/${p.id}/edit`}
                  className="text-[var(--color-primary)] hover:underline">Edit</a>
                <button onClick={() => handleDelete(p.id)} disabled={deleting === p.id}
                  className="text-red-500 hover:underline disabled:opacity-50">
                  {deleting === p.id ? "…" : "Delete"}
                </button>
              </td>
            </tr>
          ))}
          {parts.length === 0 && (
            <tr>
              <td colSpan={6} className="p-6 text-center text-gray-400">
                No parts yet. <a href="/parts/new" className="text-[var(--color-primary)] hover:underline">Create one</a>.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
