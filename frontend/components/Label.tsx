"use client";

export interface LabelProps {
  title: string;
  shortDescription: string;
  type: string;
  customImagePath: string | null;
  color: string | null;
  widthMm?: number;
  heightMm?: number;
}

const PAD = 1;
const CORNER = 3;
const QR_SIZE = 10;
const IMG_SIZE = 12;
const TITLE_Y = 4.5;

export default function Label({
  title,
  shortDescription,
  type,
  customImagePath,
  color,
  widthMm = 40,
  heightMm = 20,
}: LabelProps) {
  const qrTarget = `${title}\n${shortDescription}`;
  const qrSrc = `/api/qr?data=${encodeURIComponent(qrTarget)}`;

  const imageSrc = customImagePath
    ? `/${customImagePath}`
    : type !== "custom"
    ? `/api/type-image/${type}`
    : null;

  // Layout calculations (all in mm)
  const imgX = PAD;
  const imgY = TITLE_Y + 1;
  const imgRight = imgX + IMG_SIZE;

  const qrX = widthMm - QR_SIZE - PAD;
  const qrY = heightMm - QR_SIZE - PAD;

  const textX = imgRight + 1;
  const textMaxW = qrX - textX - 1;
  const textAreaTop = TITLE_Y + 2;
  const textAreaBottom = heightMm - PAD;
  const textY = (textAreaTop + textAreaBottom) / 2;
  const textMaxH = textAreaBottom - textAreaTop;

  // Estimate chars that fit — rough, SVG will clip naturally
  const charsPerLine = Math.max(1, Math.floor(textMaxW / 2.5));

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={`${widthMm}mm`}
      height={`${heightMm}mm`}
      viewBox={`0 0 ${widthMm} ${heightMm}`}
      style={{ border: "0.2px solid #ccc", display: "block" }}
    >
      {/* Background */}
      <rect width={widthMm} height={heightMm} fill="white" />

      {/* Color corners (top-left + top-right) */}
      {color && (
        <>
          <rect x={0} y={0} width={CORNER} height={CORNER} fill={color} />
          <rect x={widthMm - CORNER} y={0} width={CORNER} height={CORNER} fill={color} />
        </>
      )}

      {/* Title */}
      <text
        x={widthMm / 2}
        y={TITLE_Y}
        textAnchor="middle"
        fontSize="3.5"
        fontWeight="bold"
        fontFamily="sans-serif"
        fill="#111"
      >
        {title}
      </text>

      {/* Type image */}
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

      {/* Description — simple word-wrap via tspan lines */}
      <text
        x={textX}
        y={textY}
        fontSize="2.5"
        fontFamily="sans-serif"
        fill="#333"
        dominantBaseline="middle"
        textAnchor="start"
      >
        {wrapText(shortDescription, charsPerLine, textMaxH).map((line, i) => (
          <tspan key={i} x={textX} dy={i === 0 ? 0 : 3}>
            {line}
          </tspan>
        ))}
      </text>

      {/* QR code */}
      <image
        href={qrSrc}
        x={qrX}
        y={qrY}
        width={QR_SIZE}
        height={QR_SIZE}
      />
    </svg>
  );
}

function wrapText(text: string, charsPerLine: number, maxHeightMm: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  const lineHeightMm = 3;
  const maxLines = Math.max(1, Math.floor(maxHeightMm / lineHeightMm));

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
