"use client";
import { QRCodeSVG } from "qrcode.react";

export interface LabelProps {
  title: string;
  shortDescription: string | null;
  type: string;
  customImagePath: string | null;
  color: string | null;
  partId: number;
  widthMm?: number;
  heightMm?: number;
  side?: "front" | "back";
  descYOffset?: number;
  qrYOffset?: number;
}

const PAD = 1;
const CORNER = 3;
const TITLE_FONT = 5;
const TITLE_Y = 5.5;
const IMG_SIZE = 12;
const DESC_FONT = 3.5;
const DESC_LINE_H = 4;

export default function Label({
  title,
  shortDescription,
  type,
  customImagePath,
  color,
  partId,
  widthMm = 40,
  heightMm = 18,
  side = "front",
  descYOffset = 0,
  qrYOffset = 0,
}: LabelProps) {
  if (side === "back") {
    const qrTarget = `${partId}\n${title}\n${shortDescription ?? ""}`;
    const qrSize = Math.min(widthMm, heightMm) - 2 * PAD;
    const qrX = (widthMm - qrSize) / 2;
    const qrY = (heightMm - qrSize) / 2 + qrYOffset;
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width={`${widthMm}mm`}
        height={`${heightMm}mm`}
        viewBox={`0 0 ${widthMm} ${heightMm}`}
        style={{ border: "0.2px solid #ccc", display: "block" }}
      >
        <rect width={widthMm} height={heightMm} fill="white" />
        <g transform={`translate(${qrX} ${qrY})`}>
          <QRCodeSVG value={qrTarget} size={qrSize} marginSize={0} level="M" />
          <rect
            x={0}
            y={0}
            width={qrSize}
            height={qrSize}
            fill="none"
            stroke="#ccc"
            strokeWidth={0.2}
          />
        </g>
      </svg>
    );
  }

  const imageSrc = customImagePath
    ? `/${customImagePath}`
    : type !== "custom"
    ? `/api/type-image/${type}`
    : null;

  const imgX = PAD;
  const imgY = TITLE_Y + 1;
  const imgRight = imgX + IMG_SIZE;

  const textX = imgRight + 1.5;
  const textMaxW = widthMm - textX - PAD;
  const textAreaTop = TITLE_Y + 2;
  const textAreaBottom = heightMm - PAD;
  const textY = (textAreaTop + textAreaBottom) / 2 + descYOffset;
  const textMaxH = textAreaBottom - textAreaTop;

  const lines = splitTwoLines(shortDescription ?? "");
  const longest = Math.max(1, ...lines.map((l: string) => l.length));
  const fitByWidth = textMaxW / (longest * DESC_FONT * 0.55);
  const fitByHeight = textMaxH / (2 * DESC_LINE_H);
  const fontScale = Math.min(1, fitByWidth, fitByHeight);
  const descFont = DESC_FONT * fontScale;
  const descLineH = DESC_LINE_H * fontScale;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={`${widthMm}mm`}
      height={`${heightMm}mm`}
      viewBox={`0 0 ${widthMm} ${heightMm}`}
      style={{ border: "0.2px solid #ccc", display: "block" }}
    >
      <rect width={widthMm} height={heightMm} fill="white" />

      {color && (
        <>
          <rect x={0} y={0} width={CORNER} height={CORNER} fill={color} />
          <rect x={widthMm - CORNER} y={0} width={CORNER} height={CORNER} fill={color} />
        </>
      )}

      <text
        x={widthMm / 2}
        y={TITLE_Y}
        textAnchor="middle"
        fontSize={TITLE_FONT}
        fontWeight="bold"
        fontFamily="sans-serif"
        fill="#111"
      >
        {title}
      </text>

      {imageSrc && (
        <image
          href={imageSrc}
          x={imgX}
          y={imgY}
          width={IMG_SIZE}
          height={IMG_SIZE}
          preserveAspectRatio="xMidYMid meet"
        />
      )}

      <text
        x={textX}
        y={textY}
        fontSize={descFont}
        fontFamily="sans-serif"
        fill="#333"
        dominantBaseline="middle"
        textAnchor="start"
      >
        {lines.map((line, i) => (
          <tspan key={i} x={textX} dy={i === 0 ? 0 : descLineH}>
            {line}
          </tspan>
        ))}
      </text>
    </svg>
  );
}

function splitTwoLines(text: string): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [""];
  if (words.length === 1) return [words[0]];
  let best: [string, string] = [words.slice(0, 1).join(" "), words.slice(1).join(" ")];
  let bestMax = Math.max(best[0].length, best[1].length);
  for (let i = 2; i < words.length; i++) {
    const l1 = words.slice(0, i).join(" ");
    const l2 = words.slice(i).join(" ");
    const m = Math.max(l1.length, l2.length);
    if (m < bestMax) {
      bestMax = m;
      best = [l1, l2];
    }
  }
  return best;
}
