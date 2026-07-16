// components/landing/miami-palm-trees.tsx
import React from 'react';

// A highly stylized, retro 80s "Outrun" style solid palm frond
// Features a smooth arching top edge and a deeply jagged/sawtooth bottom edge
function RetroSolidFrond({ rotation, scale, color, delay }: { rotation: number; scale: number; color: string; delay: number }) {
  return (
    <g transform={`rotate(${rotation}) scale(${scale})`} className="animate-sway" style={{ animationDelay: `${delay}s`, transformOrigin: '0px 0px' }}>
      <path 
        d="M 0 0 
           Q 150 -80 350 40 
           L 280 60 L 290 30 
           L 200 70 L 210 35 
           L 120 60 L 130 25 
           L 50 40 Z" 
        fill={color} 
      />
    </g>
  );
}

// "The Miami Arch" Concept - Stylized Flat Vector Version
function PalmTree({ x, y, scale, color, flip }: { x: number; y: number; scale: number; color: string; flip?: boolean }) {
  // Fronds draping down and across the top canopy
  // 0 is right, 90 is down, 180 is left
  const fronds = [
    { rot: -30, scale: 0.9, delay: 0.0 },
    { rot: 10, scale: 1.1, delay: 0.2 },
    { rot: 45, scale: 1.2, delay: 0.5 },
    { rot: 80, scale: 1.1, delay: 0.8 },
    { rot: 115, scale: 1.0, delay: 0.3 },
    { rot: 155, scale: 1.1, delay: 0.6 },
    { rot: 190, scale: 0.9, delay: 0.1 },
    { rot: 225, scale: 0.8, delay: 0.4 },
  ];
  
  return (
    <g transform={`translate(${x}, ${y}) scale(${scale}) ${flip ? 'scale(-1, 1)' : ''}`}>
      
      {/* The Ascent: Solid thick trunk that bows deeply outward then inward */}
      <path 
        d="M -50 1000 
           C -450 500, -100 100, 0 0 
           C -50 100, -320 500, 50 1000 Z" 
        fill={color} 
      />
      
      {/* The Peak & Canopy: Fronds originating from top of trunk at 0, 0 */}
      <g transform="translate(0, 0)">
        {fronds.map((f, i) => (
           <RetroSolidFrond 
             key={i} 
             rotation={f.rot} 
             scale={f.scale} 
             delay={f.delay}
             color={color} 
           />
        ))}
      </g>
    </g>
  );
}

export function MiamiPalmTrees() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 45 }}>
      {/* Bottom Left Tree - Spans the entire left side, arching over the top */}
      <svg className="absolute bottom-0 left-[-2vw] w-[45vw] h-[100vh] min-w-[300px] opacity-95" viewBox="-500 0 1000 1000" preserveAspectRatio="xMinYMax slice">
         <PalmTree x={0} y={0} scale={1.0} color="#150433" />
      </svg>
      {/* Bottom Right Tree - Spans the entire right side, flipped */}
      <svg className="absolute bottom-0 right-[-2vw] w-[45vw] h-[100vh] min-w-[300px] opacity-95" viewBox="-500 0 1000 1000" preserveAspectRatio="xMinYMax slice">
         <PalmTree x={0} y={0} scale={1.0} color="#150433" flip={true} />
      </svg>
    </div>
  )
}
