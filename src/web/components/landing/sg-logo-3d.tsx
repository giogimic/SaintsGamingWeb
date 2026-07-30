import { SVGProps } from "react";

export function SGLogo3D({ className, size = 200, ...props }: SVGProps<SVGSVGElement> & { size?: number }) {
  // S — 12-point filled polygon with complete closed border
  // Shape: top bar → left connector → mid bar → right connector → bottom bar
  const sPoints = [
    "100,95",  "185,95",   // top bar top edge
    "185,125", "128,125",  // top bar bottom → step to left connector
    "128,185", "185,185",  // left connector bottom → mid bar top
    "185,305", "100,305",  // right side all the way down → bottom-left
    "100,275", "157,275",  // bottom bar top → step to right connector
    "157,215", "100,215"   // right connector top → mid bar bottom-left
  ].join(" ");

  // G — 14-point filled polygon with complete closed border
  // Shape: top bar → hook → inner → left side → bottom → right connector → tongue → outer right → bottom
  const gPoints = [
    "215,95",  "300,95",   // top bar
    "300,165", "272,165",  // right hook down → step inward
    "272,125", "243,125",  // inner hook up → inner top bar
    "243,275", "272,275",  // inner left all the way down → inner bottom
    "272,215", "252,215",  // up to tongue → tongue bottom-left
    "252,185", "300,185",  // tongue top-left → outer right edge
    "300,305", "215,305"   // right side down → bottom-left
  ].join(" ");

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 400 400"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <defs>
        <filter id="synth-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
        <linearGradient id="sGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#00f5d4" />
          <stop offset="100%" stopColor="#023e8a" />
        </linearGradient>
        <linearGradient id="gGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ff006e" />
          <stop offset="100%" stopColor="#c9184a" />
        </linearGradient>
      </defs>

      {/* Outer Hexagon Borders */}
      <polygon
        points="200,10 40,100 40,300 200,390 200,350 80,282 80,118 200,50"
        fill="#f20089"
        filter="url(#synth-glow)"
      />
      <polygon
        points="200,10 360,100 360,300 200,390 200,350 320,282 320,118 200,50"
        fill="#00f5d4"
        filter="url(#synth-glow)"
      />
      <line x1="200" y1="10" x2="200" y2="50" stroke="#0d0221" strokeWidth="8" />
      <line x1="200" y1="350" x2="200" y2="390" stroke="#0d0221" strokeWidth="8" />

      {/* SG Letters — scaled 76.5% (0.90 × 0.85) around center */}
      <g transform="translate(200,200) scale(0.90) translate(-200,-200)">
        {/* S — Gradient filled, dark border */}
        <polygon
          points={sPoints}
          fill="url(#sGrad)"
          stroke="#0d0221"
          strokeWidth="8"
          strokeLinejoin="miter"
          filter="url(#synth-glow)"
        />

        {/* G — Gradient filled, dark border */}
        <polygon
          points={gPoints}
          fill="url(#gGrad)"
          stroke="#0d0221"
          strokeWidth="8"
          strokeLinejoin="miter"
          filter="url(#synth-glow)"
        />
      </g>
    </svg>
  );
}
