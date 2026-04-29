"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import QrScanner from "@/components/QrScanner";
import { api } from "@/lib/api";

interface ScannedItem {
  id: number;
  title: string;
  short_description: string | null;
  type: string;
  urls: string[];
  qty: number;
}

type Mode = "idle" | "scanning" | "confirming" | "reviewing";

const STORAGE_KEY = "scan-session";

export default function ScanPage() {
  const [mode, setMode] = useState<Mode>("idle");
  const [items, setItems] = useState<ScannedItem[]>([]);
  const [pending, setPending] = useState<ScannedItem | null>(null);
  const [error, setError] = useState<string | null>(null);
  const busyRef = useRef(false);

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try { setItems(JSON.parse(raw)); } catch { /* ignore */ }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const handleDecode = useCallback(async (text: string) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setError(null);
    try {
      const resolved = await api.scan.resolve(text);
      setPending({ ...resolved, qty: 1 });
      setMode("confirming");
    } catch (e) {
      setError((e as Error).message);
      busyRef.current = false;
    }
  }, []);

  const addPending = () => {
    if (!pending) return;
    setItems((prev) => {
      const existing = prev.find((i) => i.id === pending.id);
      if (existing) {
        return prev.map((i) => i.id === pending.id ? { ...i, qty: i.qty + 1 } : i);
      }
      return [...prev, pending];
    });
  };

  const onContinue = () => {
    addPending();
    setPending(null);
    busyRef.current = false;
    setMode("scanning");
  };

  const onFinish = () => {
    addPending();
    setPending(null);
    busyRef.current = false;
    setMode("reviewing");
  };

  const onSkip = () => {
    setPending(null);
    busyRef.current = false;
    setMode("scanning");
  };

  const removeItem = (id: number) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const clearAll = () => {
    setItems([]);
    localStorage.removeItem(STORAGE_KEY);
    setMode("idle");
  };

  const exportCsv = async () => {
    const res = await fetch(api.scan.exportUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: items.map((i) => i.id) }),
    });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "shopping-list.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Scan shopping list</h1>

      {mode === "idle" && (
        <div className="space-y-3">
          <p className="text-gray-600">
            Scan QR codes on drawer labels. Each scan adds the part to your list.
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => setMode("scanning")}
              className="bg-[var(--color-accent)] text-white px-5 py-2 rounded hover:opacity-90"
            >
              Start scanning
            </button>
            {items.length > 0 && (
              <button
                onClick={() => setMode("reviewing")}
                className="border px-5 py-2 rounded hover:bg-gray-100"
              >
                Review list ({items.length})
              </button>
            )}
          </div>
        </div>
      )}

      {mode === "scanning" && (
        <div className="space-y-3">
          <QrScanner onDecode={handleDecode} onError={(e) => setError(e.message)} />
          <div className="flex gap-3">
            <button
              onClick={() => setMode("reviewing")}
              className="border px-5 py-2 rounded hover:bg-gray-100"
            >
              Stop ({items.length} scanned)
            </button>
          </div>
          {error && <p className="text-red-600 text-sm">{error}</p>}
        </div>
      )}

      {mode === "confirming" && pending && (
        <div className="space-y-3 border rounded p-4 bg-white">
          <h2 className="text-lg font-semibold">{pending.title}</h2>
          <p className="text-gray-700 text-sm">{pending.short_description}</p>
          <p className="text-xs text-gray-500">{pending.urls.length} URL(s)</p>
          <div className="flex gap-3 flex-wrap">
            <button
              onClick={onContinue}
              className="bg-[var(--color-accent)] text-white px-5 py-2 rounded hover:opacity-90"
            >
              Add + scan next
            </button>
            <button
              onClick={onFinish}
              className="border px-5 py-2 rounded hover:bg-gray-100"
            >
              Add + finish
            </button>
            <button
              onClick={onSkip}
              className="text-gray-500 px-3 py-2 hover:underline"
            >
              Skip
            </button>
          </div>
        </div>
      )}

      {mode === "reviewing" && (
        <div className="space-y-3">
          {items.length === 0 ? (
            <p className="text-gray-500">No items scanned.</p>
          ) : (
            <table className="w-full text-sm border">
              <thead className="bg-gray-100 text-left">
                <tr>
                  <th className="p-2">Qty</th>
                  <th className="p-2">Title</th>
                  <th className="p-2">Description</th>
                  <th className="p-2">URLs</th>
                  <th className="p-2"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((i) => (
                  <tr key={i.id} className="border-t">
                    <td className="p-2">{i.qty}</td>
                    <td className="p-2 font-medium">{i.title}</td>
                    <td className="p-2 text-gray-700">{i.short_description}</td>
                    <td className="p-2">
                      {i.urls.map((u, idx) => (
                        <a
                          key={idx}
                          href={u}
                          target="_blank"
                          rel="noreferrer"
                          className="block text-[var(--color-primary)] hover:underline truncate max-w-xs"
                        >
                          {u}
                        </a>
                      ))}
                    </td>
                    <td className="p-2">
                      <button
                        onClick={() => removeItem(i.id)}
                        className="text-red-600 hover:underline"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <div className="flex gap-3 flex-wrap">
            <button
              onClick={() => setMode("scanning")}
              className="bg-[var(--color-accent)] text-white px-5 py-2 rounded hover:opacity-90"
            >
              Scan more
            </button>
            {items.length > 0 && (
              <>
                <button
                  onClick={exportCsv}
                  className="border px-5 py-2 rounded hover:bg-gray-100"
                >
                  Export CSV
                </button>
                <button
                  onClick={clearAll}
                  className="text-red-600 px-5 py-2 hover:underline"
                >
                  Clear all
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
