"use client";

export interface LabelProps {
  title: string;
  shortDescription: string;
  type: string;
  customImagePath: string | null;
  color: string | null;
  partId: number;
  widthMm?: number;
  heightMm?: number;
  side?: "front" | "back";
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
  heightMm = 20,
  side = "front",
}: LabelProps) {
  if (side === "back") {
    const qrTarget = `${partId}\n${title}\n${shortDescription}`;
    const qrSrc = `/api/qr?data=${encodeURIComponent(qrTarget)}`;
    const qrSize = Math.min(widthMm, heightMm) - 2 * PAD;
    const qrX = (widthMm - qrSize) / 2;
    const qrY = (heightMm - qrSize) / 2;
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width={`${widthMm}mm`}
        height={`${heightMm}mm`}
        viewBox={`0 0 ${widthMm} ${heightMm}`}
        style={{ border: "0.2px solid #ccc", display: "block" }}
      >
        <rect width={widthMm} height={heightMm} fill="white" />
        <image href={qrSrc} x={qrX} y={qrY} width={qrSize} height={qrSize} />
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
  const textY = (textAreaTop + textAreaBottom) / 2;
  const textMaxH = textAreaBottom - textAreaTop;

  const charsPerLine = Math.max(1, Math.floor(textMaxW / (DESC_FONT * 0.55)));

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
        fontSize={DESC_FONT}
        fontFamily="sans-serif"
        fill="#333"
        dominantBaseline="middle"
        textAnchor="start"
      >
        {wrapText(shortDescription, charsPerLine, textMaxH).map((line, i) => (
          <tspan key={i} x={textX} dy={i === 0 ? 0 : DESC_LINE_H}>
            {line}
          </tspan>
        ))}
      </text>
    </svg>
  );
}

function wrapText(text: string, charsPerLine: number, maxHeightMm: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  const maxLines = Math.max(1, Math.floor(maxHeightMm / DESC_LINE_H));

  for (const word of words) {
    if (lines.length >= maxLines) break;
    if ((current + " " + word).trim().length <= charsPerLine) {
      current = (current + " " + word).trim();
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current && lines.length < maxLines) lines.push(current);
  return lines;
}
