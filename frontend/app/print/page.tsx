"use client";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import PaperPreview, { type DuplexFlip } from "@/components/PaperPreview";
import { api, type Part } from "@/lib/api";

function PrintContent() {
  const searchParams = useSearchParams();
  const ids = (searchParams.get("ids") ?? "").split(",").map(Number).filter(Boolean);

  const [parts, setParts] = useState<Part[]>([]);
  const [colors, setColors] = useState<Record<number, string | null>>({});
  const [loading, setLoading] = useState(true);

  const [labelW, setLabelW] = useState(40);
  const [labelH, setLabelH] = useState(20);
  const [paperW, setPaperW] = useState(210);
  const [paperH, setPaperH] = useState(297);
  const [marginMm, setMarginMm] = useState(5);
  const [gapMm, setGapMm] = useState(2);
  const [duplexFlip, setDuplexFlip] = useState<DuplexFlip>("long");

  useEffect(() => {
    if (!ids.length) { setLoading(false); return; }
    Promise.all(ids.map((id) => api.parts.get(id)))
      .then(async (fetched) => {
        setParts(fetched);
        const colorMap: Record<number, string | null> = {};
        await Promise.all(
          fetched.map(async (p) => {
            const res = await api.color(p.title);
            colorMap[p.id] = res.color;
          })
        );
        setColors(colorMap);
      })
      .finally(() => setLoading(false));
  }, [ids.join(",")]);

  if (loading) return <p className="text-gray-500">Loading…</p>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-4 items-end print:hidden">
        <label className="text-sm">
          Label W (mm)
          <input type="number" className="block border rounded px-2 py-1 w-20"
            value={labelW} onChange={(e) => setLabelW(Number(e.target.value))} />
        </label>
        <label className="text-sm">
          Label H (mm)
          <input type="number" className="block border rounded px-2 py-1 w-20"
            value={labelH} onChange={(e) => setLabelH(Number(e.target.value))} />
        </label>
        <label className="text-sm">
          Paper W (mm)
          <input type="number" className="block border rounded px-2 py-1 w-20"
            value={paperW} onChange={(e) => setPaperW(Number(e.target.value))} />
        </label>
        <label className="text-sm">
          Paper H (mm)
          <input type="number" className="block border rounded px-2 py-1 w-20"
            value={paperH} onChange={(e) => setPaperH(Number(e.target.value))} />
        </label>
        <label className="text-sm">
          Margin (mm)
          <input type="number" className="block border rounded px-2 py-1 w-20"
            value={marginMm} onChange={(e) => setMarginMm(Number(e.target.value))} />
        </label>
        <label className="text-sm">
          Gap (mm)
          <input type="number" className="block border rounded px-2 py-1 w-20"
            value={gapMm} onChange={(e) => setGapMm(Number(e.target.value))} />
        </label>
        <label className="text-sm">
          Duplex flip
          <select className="block border rounded px-2 py-1"
            value={duplexFlip}
            onChange={(e) => setDuplexFlip(e.target.value as DuplexFlip)}>
            <option value="long">Long edge (book)</option>
            <option value="short">Short edge (tablet)</option>
          </select>
        </label>
        <button
          onClick={() => window.print()}
          className="bg-[var(--color-accent)] text-white px-5 py-2 rounded hover:opacity-90"
        >
          Print
        </button>
      </div>

      {parts.length === 0 ? (
        <p className="text-gray-500">No parts selected. <a href="/" className="text-[var(--color-primary)] hover:underline">Go back</a>.</p>
      ) : (
        <PaperPreview
          parts={parts}
          colors={colors}
          labelW={labelW}
          labelH={labelH}
          paperW={paperW}
          paperH={paperH}
          marginMm={marginMm}
          gapMm={gapMm}
          duplexFlip={duplexFlip}
        />
      )}
    </div>
  );
}

export default function PrintPage() {
  return (
    <Suspense>
      <PrintContent />
    </Suspense>
  );
}
