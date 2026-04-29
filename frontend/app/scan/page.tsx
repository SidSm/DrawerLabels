"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import QrScanner from "@/components/QrScanner";
import { api, type ShoppingItem } from "@/lib/api";

interface PendingItem {
  id: number;
  title: string;
  short_description: string | null;
  type: string;
  urls: string[];
}

type Mode = "idle" | "scanning" | "confirming" | "reviewing";

const LEGACY_KEY = "scan-session";
const POLL_MS = 2000;

export default function ScanPage() {
  const [mode, setMode] = useState<Mode>("idle");
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [pending, setPending] = useState<PendingItem | null>(null);
  const [error, setError] = useState<string | null>(null);
  const busyRef = useRef(false);

  const refresh = useCallback(async () => {
    try {
      setItems(await api.shopping.list());
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  // One-time migration of any pre-server localStorage list, then initial fetch.
  useEffect(() => {
    (async () => {
      const raw = localStorage.getItem(LEGACY_KEY);
      if (raw) {
        try {
          const legacy = JSON.parse(raw) as { id: number; qty?: number }[];
          for (const l of legacy) {
            const qty = Math.max(1, l.qty ?? 1);
            await api.shopping.add(l.id, qty);
          }
        } catch {
          // ignore corrupt
        }
        localStorage.removeItem(LEGACY_KEY);
      }
      await refresh();
    })();
  }, [refresh]);

  // Poll while page is open. Pauses while confirming a scan to avoid race with optimistic state.
  useEffect(() => {
    if (mode === "confirming") return;
    const t = setInterval(refresh, POLL_MS);
    return () => clearInterval(t);
  }, [mode, refresh]);

  const handleDecode = useCallback(async (text: string) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setError(null);
    try {
      const resolved = await api.scan.resolve(text);
      setPending(resolved);
      setMode("confirming");
    } catch (e) {
      setError((e as Error).message);
      busyRef.current = false;
    }
  }, []);

  const commitPending = async () => {
    if (!pending) return;
    try {
      await api.shopping.add(pending.id, 1);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const onContinue = async () => {
    await commitPending();
    setPending(null);
    busyRef.current = false;
    setMode("scanning");
    refresh();
  };

  const onFinish = async () => {
    await commitPending();
    setPending(null);
    busyRef.current = false;
    setMode("reviewing");
    refresh();
  };

  const onSkip = () => {
    setPending(null);
    busyRef.current = false;
    setMode("scanning");
  };

  const removeItem = async (itemId: number) => {
    await api.shopping.remove(itemId);
    refresh();
  };

  const setQty = async (itemId: number, qty: number) => {
    if (qty <= 0) {
      await api.shopping.remove(itemId);
    } else {
      await api.shopping.setQty(itemId, qty);
    }
    refresh();
  };

  const clearAll = async () => {
    await api.shopping.clear();
    refresh();
    setMode("idle");
  };

  const exportCsv = () => {
    window.location.href = api.shopping.exportUrl;
  };

  const totalQty = items.reduce((n, i) => n + i.qty, 0);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Scan shopping list</h1>

      {mode === "idle" && (
        <div className="space-y-3">
          <p className="text-gray-600">
            Scan QR codes on drawer labels. List is shared across devices — scan on phone, view on PC.
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => setMode("scanning")}
              className="bg-[var(--color-accent)] text-white px-5 py-2 rounded hover:opacity-90"
            >
              Start scanning
            </button>
            <button
              onClick={() => setMode("reviewing")}
              className="border px-5 py-2 rounded hover:bg-gray-100"
            >
              Review list ({totalQty})
            </button>
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
              Stop ({totalQty} in list)
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
                  <th className="p-2 w-24">Qty</th>
                  <th className="p-2">Title</th>
                  <th className="p-2">Description</th>
                  <th className="p-2">URLs</th>
                  <th className="p-2"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((i) => (
                  <tr key={i.id} className="border-t">
                    <td className="p-2">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setQty(i.id, i.qty - 1)}
                          className="border px-2 rounded hover:bg-gray-100"
                          aria-label="decrease"
                        >−</button>
                        <span className="w-6 text-center">{i.qty}</span>
                        <button
                          onClick={() => setQty(i.id, i.qty + 1)}
                          className="border px-2 rounded hover:bg-gray-100"
                          aria-label="increase"
                        >+</button>
                      </div>
                    </td>
                    <td className="p-2 font-medium">{i.part?.title ?? <span className="text-gray-400">(deleted)</span>}</td>
                    <td className="p-2 text-gray-700">{i.part?.short_description}</td>
                    <td className="p-2">
                      {i.part?.urls.map((u, idx) => (
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
