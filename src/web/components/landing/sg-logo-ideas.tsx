import React from 'react';

// Variation 1: The Nesting G
// Directly based on the feedback: The G sits perfectly inside the bottom curve of the S. 
// Its crossbar shoots out and "deletes" the left side of the S curve where it intercepts it.
export function SGLogoIdea1({ size = 200 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Sweeping S Curve */}
      <path 
        d="M 80 20 C 40 10, 10 30, 40 50 C 70 70, 80 90, 40 90 C 20 90, 10 75, 10 60" 
        stroke="#f20089" strokeWidth="12" strokeLinecap="round"
      />
      
      {/* G Outline to delete the S where it intersects */}
      <path 
        d="M 70 55 C 50 50, 40 60, 40 70 C 40 80, 50 85, 60 85 C 70 85, 75 80, 75 70 L 75 65 L 10 65" 
        stroke="#09090b" strokeWidth="20" strokeLinecap="round" strokeLinejoin="round"
      />
      
      {/* G Shape (Cyan) - Nestled in the bowl, crossbar slices left! */}
      <path 
        d="M 70 55 C 50 50, 40 60, 40 70 C 40 80, 50 85, 60 85 C 70 85, 75 80, 75 70 L 75 65 L 10 65" 
        stroke="#00f5d4" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round"
      />
    </svg>
  );
}

// Variation 2: The S Breakout
// The opposite nesting: The G is a massive circular border. The S sits inside it, 
// but is too tall and violently breaks through the top and bottom of the G, deleting those sections.
export function SGLogoIdea2({ size = 200 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Massive G */}
      <path 
        d="M 80 25 A 35 35 0 1 0 80 75 L 80 50 L 45 50" 
        stroke="#00f5d4" strokeWidth="14" strokeLinecap="round" strokeLinejoin="round"
      />
      
      {/* S Outline Cutout (Deletes G at top and bottom) */}
      <path 
        d="M 80 0 C 40 0, 30 30, 50 50 C 70 70, 60 100, 20 100" 
        stroke="#09090b" strokeWidth="24" strokeLinecap="round"
      />
      
      {/* S Shape (Pink) */}
      <path 
        d="M 80 0 C 40 0, 30 30, 50 50 C 70 70, 60 100, 20 100" 
        stroke="#f20089" strokeWidth="12" strokeLinecap="round"
      />
    </svg>
  );
}

// Variation 3: The Chimera Splice
// Pure character manipulation. A thick block S and G are mashed together, 
// and a sharp diagonal negative space slice divides them, creating a mutant SG letter.
export function SGLogoIdea3({ size = 200 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <clipPath id="splitTop">
          <polygon points="0,0 100,0 100,100" />
        </clipPath>
        <clipPath id="splitBottom">
          <polygon points="0,0 100,100 0,100" />
        </clipPath>
      </defs>
      
      {/* Blocky S (Pink) clipped to Top-Right triangle */}
      <path 
        d="M 80 20 L 20 20 L 20 50 L 80 50 L 80 90 L 20 90" 
        stroke="#f20089" strokeWidth="16" strokeLinecap="square" strokeLinejoin="miter"
        clipPath="url(#splitTop)"
      />
      
      {/* Blocky G (Cyan) clipped to Bottom-Left triangle */}
      <path 
        d="M 80 20 L 80 10 L 10 10 L 10 90 L 80 90 L 80 50 L 40 50" 
        stroke="#00f5d4" strokeWidth="16" strokeLinecap="square" strokeLinejoin="miter"
        clipPath="url(#splitBottom)"
      />
      
      {/* Negative Space Slash to cleanly separate the two halves */}
      <line x1="0" y1="0" x2="100" y2="100" stroke="#09090b" strokeWidth="10" />
    </svg>
  );
}

// Variation 4: The 3D Chain Link
// A perfect typographic optical illusion. The top half of the S cuts over the G, 
// but the bottom half of the G cuts over the S, weaving them together like a chain.
export function SGLogoIdea4({ size = 200 }: { size?: number }) {
  const sPath = "M 80 20 C 60 0, 20 0, 20 30 C 20 60, 80 40, 80 70 C 80 100, 40 100, 20 80";
  const gPath = "M 80 30 A 35 35 0 1 0 80 85 L 80 55 L 45 55";
  
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <clipPath id="bottomHalf">
          <rect x="0" y="50" width="100" height="50" />
        </clipPath>
      </defs>
      
      {/* 1. Full G as base */}
      <path d={gPath} stroke="#00f5d4" strokeWidth="12" strokeLinecap="round" />
      
      {/* 2. Full S drawn OVER the G with a thick cutout */}
      <path d={sPath} stroke="#09090b" strokeWidth="22" strokeLinecap="round" />
      <path d={sPath} stroke="#f20089" strokeWidth="12" strokeLinecap="round" />
      
      {/* 3. The magic: Bottom half of the G is re-drawn OVER the S */}
      <g clipPath="url(#bottomHalf)">
        <path d={gPath} stroke="#09090b" strokeWidth="22" strokeLinecap="round" />
        <path d={gPath} stroke="#00f5d4" strokeWidth="12" strokeLinecap="round" />
      </g>
    </svg>
  );
}
