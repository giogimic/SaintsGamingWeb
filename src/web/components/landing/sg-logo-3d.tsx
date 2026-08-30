import { SVGProps, useId } from "react";

const WHITE_BLOCKS = [
  { x: 132, y: 25, w: 12, h: 12 },
  { x: 116, y: 37, w: 16, h: 12 },
  { x: 100, y: 49, w: 16, h: 12 },
  { x: 84, y: 61, w: 16, h: 12 },
  { x: 68, y: 73, w: 16, h: 12 },
  { x: 56, y: 85, w: 12, h: 90 },
  { x: 68, y: 175, w: 16, h: 12 },
  { x: 84, y: 187, w: 16, h: 12 },
  { x: 100, y: 199, w: 16, h: 12 },
  { x: 116, y: 211, w: 16, h: 12 },
  { x: 132, y: 223, w: 12, h: 12 },
];

const PINK_BLOCKS = [
  { x: 156, y: 25, w: 12, h: 12 },
  { x: 168, y: 37, w: 16, h: 12 },
  { x: 184, y: 49, w: 16, h: 12 },
  { x: 200, y: 61, w: 16, h: 12 },
  { x: 216, y: 73, w: 16, h: 12 },
  { x: 232, y: 85, w: 12, h: 90 },
  { x: 216, y: 175, w: 16, h: 12 },
  { x: 200, y: 187, w: 16, h: 12 },
  { x: 184, y: 199, w: 16, h: 12 },
  { x: 168, y: 211, w: 16, h: 12 },
  { x: 156, y: 223, w: 12, h: 12 },
];

const BLACK_DIVIDER_BLOCKS = [
  { x: 144, y: 25, w: 12, h: 12 },
  { x: 144, y: 223, w: 12, h: 12 },
];

const BRAND_PINK = "#E6007E";
const BRAND_WHITE = "#FFFFFF";
const BRAND_BLACK = "#000000";

export function SGLogo3D({ className, size = 200, ...props }: SVGProps<SVGSVGElement> & { size?: number }) {
  const filterId = useId().replace(/:/g, "_") + "_sg_3d_shadow";
  const S_PATH = "M 86 100 H 134 V 114 H 102 V 124 H 134 V 162 H 86 V 148 H 118 V 138 H 86 Z";
  const G_PATH = "M 166 100 H 214 V 114 H 182 V 148 H 200 V 141 H 189 V 127 H 214 V 162 H 166 Z";

  return (
    <svg
      width={size}
      height={size ? Math.round(size * (260 / 300)) : undefined}
      viewBox="0 0 300 260"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Saints Gaming Logo"
      className={className}
      {...props}
    >
      <defs>
        <filter id={filterId} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="4" stdDeviation="3.5" floodColor="#000000" floodOpacity="0.65" />
        </filter>
      </defs>

      {/* Frame */}
      <g fill={BRAND_WHITE} stroke={BRAND_BLACK} strokeWidth="2.5" strokeLinejoin="miter">
        {WHITE_BLOCKS.map((b, i) => (
          <rect key={`w-${i}`} x={b.x} y={b.y} width={b.w} height={b.h} />
        ))}
      </g>

      <g fill={BRAND_PINK} stroke={BRAND_BLACK} strokeWidth="2.5" strokeLinejoin="miter">
        {PINK_BLOCKS.map((b, i) => (
          <rect key={`p-${i}`} x={b.x} y={b.y} width={b.w} height={b.h} />
        ))}
      </g>

      <g fill={BRAND_BLACK} stroke={BRAND_BLACK} strokeWidth="2.5" strokeLinejoin="miter">
        {BLACK_DIVIDER_BLOCKS.map((b, i) => (
          <rect key={`b-${i}`} x={b.x} y={b.y} width={b.w} height={b.h} />
        ))}
      </g>

      {/* Letters */}
      <g filter={`url(#${filterId})`}>
        <path
          d={S_PATH}
          fill={BRAND_PINK}
          stroke={BRAND_BLACK}
          strokeWidth="3.5"
          strokeLinejoin="miter"
          strokeLinecap="square"
        />

        <path
          d={G_PATH}
          fill={BRAND_WHITE}
          stroke={BRAND_BLACK}
          strokeWidth="3.5"
          strokeLinejoin="miter"
          strokeLinecap="square"
        />
      </g>
    </svg>
  );
}
