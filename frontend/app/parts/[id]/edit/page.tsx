"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import PartForm from "@/components/PartForm";
import { api, type Part } from "@/lib/api";

export default function EditPartPage() {
  const params = useParams();
  const id = Number(params.id);
  const [part, setPart] = useState<Part | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.parts.get(id)
      .then(setPart)
      .catch((e) => setError(String(e)));
  }, [id]);

  if (error) return <p className="text-red-600">{error}</p>;
  if (!part) return <p className="text-gray-500">Loading…</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-[var(--color-primary)] mb-6">
        Edit — {part.title}
      </h1>
      <PartForm initial={part} />
    </div>
  );
}
