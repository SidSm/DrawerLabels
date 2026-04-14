"use client";
import { useState, useRef, useEffect } from "react";

const TYPES = [
  "bolt-socket", "bolt-flat", "bolt-pan",
  "bolt-black-socket", "bolt-black-flat", "bolt-black-pan",
  "nut", "locknut", "inserts", "inserts-flanged",
  "spacer-in-in", "spacer-in-out", "pin", "screw", "washer", "custom",
];

interface Props {
  value: string;
  onChange: (v: string) => void;
}

export default function TypeCombobox({ value, onChange }: Props) {
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const [dirty, setDirty] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => { setQuery(value); setDirty(false); }, [value]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Show all types when not dirty (just focused), filter when user typed something
  const filtered = dirty
    ? TYPES.filter((t) => t.includes(query.toLowerCase()))
    : TYPES;

  return (
    <div ref={ref} className="relative">
      <input
        className="border rounded px-2 py-1 w-full"
        value={query}
        onChange={(e) => { setQuery(e.target.value); setDirty(true); setOpen(true); }}
        onFocus={() => setOpen(true)}
        placeholder="Type to filter…"
      />
      {open && filtered.length > 0 && (
        <ul className="absolute z-50 bg-white border rounded shadow mt-1 max-h-48 overflow-y-auto w-full">
          {filtered.map((t) => (
            <li
              key={t}
              className={`px-3 py-1 hover:bg-blue-50 cursor-pointer text-sm ${t === value ? "font-semibold text-[var(--color-primary)]" : ""}`}
              onMouseDown={() => { onChange(t); setQuery(t); setDirty(false); setOpen(false); }}
            >
              {t}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
