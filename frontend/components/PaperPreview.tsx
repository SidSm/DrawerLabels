"use client";
import { useMemo } from "react";
import Label from "./Label";
import type { Part } from "@/lib/api";

interface Props {
  parts: Part[];
  colors: Record<number, string | null>;
  labelW: number;
  labelH: number;
  paperW: number;
  paperH: number;
  marginMm: number;
  gapMm: number;
}

export default function PaperPreview({
  parts, colors,
  labelW, labelH,
  paperW, paperH,
  marginMm, gapMm,
}: Props) {
  const { cols, rows, pages } = useMemo(() => {
    const usableW = paperW - marginMm * 2;
    const usableH = paperH - marginMm * 2;
    const cols = Math.max(1, Math.floor((usableW + gapMm) / (labelW + gapMm)));
    const rows = Math.max(1, Math.floor((usableH + gapMm) / (labelH + gapMm)));
    const perPage = cols * rows;
    const pages = Math.max(1, Math.ceil(parts.length / perPage));
    return { cols, rows, perPage, pages };
  }, [parts.length, paperW, paperH, marginMm, gapMm, labelW, labelH]);

  const perPage = cols * rows;

  return (
    <div id="print-area">
      {Array.from({ length: pages }).map((_, pageIdx) => {
        const pageParts = parts.slice(pageIdx * perPage, (pageIdx + 1) * perPage);
        return (
          <div
            key={pageIdx}
            style={{
              width: `${paperW}mm`,
              height: `${paperH}mm`,
              position: "relative",
              background: "white",
              boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
              marginBottom: "8mm",
              pageBreakAfter: pageIdx < pages - 1 ? "always" : "auto",
            }}
          >
            {pageParts.map((part, i) => {
              const row = Math.floor(i / cols);
              const col = i % cols;
              const x = marginMm + col * (labelW + gapMm);
              const y = marginMm + row * (labelH + gapMm);
              return (
                <div
                  key={part.id}
                  style={{
                    position: "absolute",
                    left: `${x}mm`,
                    top: `${y}mm`,
                    width: `${labelW}mm`,
                    height: `${labelH}mm`,
                  }}
                >
                  <Label
                    title={part.title}
                    shortDescription={part.short_description}
                    type={part.type}
                    customImagePath={part.custom_image_path}
                    color={colors[part.id] ?? null}
                    widthMm={labelW}
                    heightMm={labelH}
                  />
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
