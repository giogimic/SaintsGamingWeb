import React from 'react';

// Highly detailed SVG paths for sharp, jagged, realistic palm silhouettes
const sharpFrondPath = "M 0 0 C 100 -50 250 -100 400 -120 L 380 -110 L 410 -100 L 370 -90 L 400 -80 L 350 -70 L 390 -60 L 330 -50 L 370 -40 L 300 -30 L 350 -20 L 270 -10 L 320 0 L 230 10 L 280 20 L 180 30 L 230 40 L 120 40 L 160 50 L 50 45 L 80 55 Z";
const droopFrondPath = "M 0 0 C 80 40 180 120 250 250 L 230 230 L 260 220 L 220 200 L 255 180 L 210 170 L 250 140 L 200 130 L 240 100 L 180 95 L 220 70 L 160 65 L 190 45 L 130 40 L 160 25 L 90 25 L 110 15 Z";

export function MiamiPalmTreesV5() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 45 }}>
      {/* Heavy Cinematic Vignette - Darkens edges heavily for high contrast */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_40%,_rgba(2,0,5,0.95)_120%)]" />
      
      {/* Left Frame Silhouette - Sharp, complex fronds hanging over the lens */}
      <svg className="absolute top-0 left-0 w-[40vw] h-[100vh] min-w-[300px] opacity-100 drop-shadow-[0_0_20px_rgba(0,0,0,1)]" viewBox="0 0 500 1000" preserveAspectRatio="xMinYMin slice">
        <g transform="translate(-50, -50)">
           <path d={sharpFrondPath} fill="#020008" transform="scale(1.5) rotate(15)" />
           <path d={droopFrondPath} fill="#010005" transform="translate(50, 100) scale(1.8) rotate(-10)" />
           <path d={sharpFrondPath} fill="#020008" transform="translate(-20, 250) scale(1.6) rotate(35)" />
           <path d={droopFrondPath} fill="#010005" transform="translate(20, 450) scale(1.7) rotate(10)" />
           <path d={sharpFrondPath} fill="#000000" transform="translate(-10, 650) scale(1.5) rotate(45)" />
           <path d={droopFrondPath} fill="#020008" transform="translate(30, 850) scale(1.6) rotate(-5)" />
        </g>
      </svg>
      
      {/* Right Frame Silhouette (Flipped) */}
      <svg className="absolute top-0 right-0 w-[40vw] h-[100vh] min-w-[300px] opacity-100 drop-shadow-[0_0_20px_rgba(0,0,0,1)]" viewBox="0 0 500 1000" preserveAspectRatio="xMaxYMin slice">
        <g transform="translate(550, -50) scale(-1, 1)">
           <path d={sharpFrondPath} fill="#020008" transform="scale(1.5) rotate(15)" />
           <path d={droopFrondPath} fill="#010005" transform="translate(50, 100) scale(1.8) rotate(-10)" />
           <path d={sharpFrondPath} fill="#020008" transform="translate(-20, 250) scale(1.6) rotate(35)" />
           <path d={droopFrondPath} fill="#010005" transform="translate(20, 450) scale(1.7) rotate(10)" />
           <path d={sharpFrondPath} fill="#000000" transform="translate(-10, 650) scale(1.5) rotate(45)" />
           <path d={droopFrondPath} fill="#020008" transform="translate(30, 850) scale(1.6) rotate(-5)" />
        </g>
      </svg>
      
      {/* Top Canopy Silhouette */}
      <svg className="absolute top-0 left-0 w-full h-[30vh] opacity-100 drop-shadow-[0_0_30px_rgba(0,0,0,1)]" viewBox="0 0 1920 300" preserveAspectRatio="xMidYMin slice">
        <g transform="translate(300, -100)">
          <path d={droopFrondPath} fill="#010005" transform="scale(1.5) rotate(60)" />
        </g>
        <g transform="translate(800, -150)">
          <path d={sharpFrondPath} fill="#020008" transform="scale(1.8) rotate(80)" />
        </g>
        <g transform="translate(1400, -100)">
          <path d={droopFrondPath} fill="#000000" transform="scale(1.5) rotate(110)" />
        </g>
        <g transform="translate(1800, -50)">
          <path d={sharpFrondPath} fill="#010005" transform="scale(1.4) rotate(140)" />
        </g>
      </svg>
    </div>
  )
}
