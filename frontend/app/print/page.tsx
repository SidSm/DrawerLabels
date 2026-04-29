"use client";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import PaperPreview, { type DuplexFlip } from "@/components/PaperPreview";
import { api, type Part } from "@/lib/api";

type PrinterPreset = { qrYOffset: number; descYOffset: number };
const PRESETS_KEY = "drawerlabels.printerPresets";
const ACTIVE_KEY = "drawerlabels.activePrinter";
const BUILTIN_PRESETS: Record<string, PrinterPreset> = {
  "EPSON F4F": { qrYOffset: -0.5, descYOffset: -2.5 },
};

function PrintContent() {
  const searchParams = useSearchParams();
  const ids = (searchParams.get("ids") ?? "").split(",").map(Number).filter(Boolean);

  const [parts, setParts] = useState<Part[]>([]);
  const [colors, setColors] = useState<Record<number, string | null>>({});
  const [loading, setLoading] = useState(true);

  const [labelW, setLabelW] = useState(40);
  const [labelH, setLabelH] = useState(18);
  const [paperW, setPaperW] = useState(210);
  const [paperH, setPaperH] = useState(297);
  const [marginMm, setMarginMm] = useState(5);
  const [gapMm, setGapMm] = useState(2);
  const [duplexFlip, setDuplexFlip] = useState<DuplexFlip>("long");
  const [descYOffset, setDescYOffset] = useState(0);
  const [qrYOffset, setQrYOffset] = useState(0);

  const [presets, setPresets] = useState<Record<string, PrinterPreset>>({});
  const [activePrinter, setActivePrinter] = useState<string>("");
  const [printerName, setPrinterName] = useState<string>("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(PRESETS_KEY);
      const stored: Record<string, PrinterPreset> = raw ? JSON.parse(raw) : {};
      const merged = { ...BUILTIN_PRESETS, ...stored };
      const firstRun = !raw;
      if (firstRun) {
        localStorage.setItem(PRESETS_KEY, JSON.stringify(merged));
      }
      setPresets(merged);

      let active = localStorage.getItem(ACTIVE_KEY) ?? "";
      if (firstRun) {
        active = "EPSON F4F";
        localStorage.setItem(ACTIVE_KEY, active);
      }
      if (active && merged[active]) {
        setActivePrinter(active);
        setPrinterName(active);
        setQrYOffset(merged[active].qrYOffset);
        setDescYOffset(merged[active].descYOffset);
      }
    } catch {
      // ignore corrupt storage
    }
  }, []);

  const applyPreset = (name: string) => {
    setActivePrinter(name);
    setPrinterName(name);
    localStorage.setItem(ACTIVE_KEY, name);
    const p = presets[name];
    if (p) {
      setQrYOffset(p.qrYOffset);
      setDescYOffset(p.descYOffset);
    }
  };

  const savePreset = () => {
    const name = printerName.trim();
    if (!name) return;
    const next = { ...presets, [name]: { qrYOffset, descYOffset } };
    setPresets(next);
    setActivePrinter(name);
    localStorage.setItem(PRESETS_KEY, JSON.stringify(next));
    localStorage.setItem(ACTIVE_KEY, name);
  };

  const deletePreset = () => {
    if (!activePrinter || !presets[activePrinter]) return;
    const next = { ...presets };
    delete next[activePrinter];
    setPresets(next);
    setActivePrinter("");
    setPrinterName("");
    localStorage.setItem(PRESETS_KEY, JSON.stringify(next));
    localStorage.removeItem(ACTIVE_KEY);
  };

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
          Desc Y offset (mm)
          <input type="number" step="0.5" className="block border rounded px-2 py-1 w-20"
            value={descYOffset} onChange={(e) => setDescYOffset(Number(e.target.value))} />
        </label>
        <label className="text-sm">
          QR Y offset (mm)
          <input type="number" step="0.5" className="block border rounded px-2 py-1 w-20"
            value={qrYOffset} onChange={(e) => setQrYOffset(Number(e.target.value))} />
        </label>
        <label className="text-sm">
          Printer preset
          <select className="block border rounded px-2 py-1"
            value={activePrinter}
            onChange={(e) => applyPreset(e.target.value)}>
            <option value="">— none —</option>
            {Object.keys(presets).map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          Name
          <input type="text" className="block border rounded px-2 py-1 w-32"
            value={printerName} onChange={(e) => setPrinterName(e.target.value)} />
        </label>
        <button
          onClick={savePreset}
          disabled={!printerName.trim()}
          className="bg-gray-200 px-3 py-1 rounded hover:bg-gray-300 disabled:opacity-50"
        >
          Save
        </button>
        <button
          onClick={deletePreset}
          disabled={!activePrinter}
          className="bg-gray-200 px-3 py-1 rounded hover:bg-gray-300 disabled:opacity-50"
        >
          Delete
        </button>
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
          descYOffset={descYOffset}
          qrYOffset={qrYOffset}
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
