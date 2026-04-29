"use client";
import { useState, useRef, useEffect } from "react";
import { api } from "@/lib/api";

interface Props {
  value: string;
  onChange: (v: string) => void;
}

function iconUrl(type: string): string {
  return `/pics/${type}.png`;
}

export default function TypeCombobox({ value, onChange }: Props) {
  const [types, setTypes] = useState<string[]>([]);
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const [dirty, setDirty] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => { setQuery(value); setDirty(false); }, [value]);

  useEffect(() => {
    api.types().then(setTypes).catch(() => setTypes([]));
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = dirty
    ? types.filter((t) => t.toLowerCase().includes(query.toLowerCase()))
    : types;

  const showPreview = value && value !== "custom" && types.includes(value);

  return (
    <div ref={ref} className="relative">
      <div className="flex items-center gap-3">
        {showPreview ? (
          <img
            src={iconUrl(value)}
            alt={value}
            className="w-12 h-12 object-contain border rounded bg-white shrink-0"
          />
        ) : (
          <div className="w-12 h-12 border border-dashed rounded flex items-center justify-center text-[10px] text-gray-400 shrink-0">
            {value === "custom" ? "custom" : "no icon"}
          </div>
        )}
        <input
          className="border rounded px-2 py-1 flex-1"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setDirty(true); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder="Type to filter…"
        />
      </div>
      {open && filtered.length > 0 && (
        <ul className="absolute z-50 bg-white border rounded shadow mt-1 max-h-72 overflow-y-auto w-full">
          {filtered.map((t) => (
            <li
              key={t}
              className={`flex items-center gap-2 px-3 py-1 hover:bg-blue-50 cursor-pointer text-sm ${t === value ? "font-semibold text-[var(--color-primary)]" : ""}`}
              onMouseDown={() => { onChange(t); setQuery(t); setDirty(false); setOpen(false); }}
            >
              {t === "custom" ? (
                <div className="w-7 h-7 border border-dashed rounded flex items-center justify-center text-[9px] text-gray-400 shrink-0">
                  custom
                </div>
              ) : (
                <img
                  src={iconUrl(t)}
                  alt=""
                  className="w-7 h-7 object-contain shrink-0"
                />
              )}
              <span>{t}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
