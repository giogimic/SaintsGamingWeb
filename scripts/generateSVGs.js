const fs = require('fs');
const path = require('path');

const elements = [
  { slug: 'fire', name: 'Fire', color: '#f59e0b', symbol: '<path d="M12 2c0 0-4.5 4-5 9.5C6.5 16 9.5 20 12 20s5.5-4 5.5-8.5C17.5 6 13 2 12 2z" />' },
  { slug: 'water', name: 'Water', color: '#3b82f6', symbol: '<path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />' },
  { slug: 'wind', name: 'Wind', color: '#10b981', symbol: '<path d="M9.59 4.59A2 2 0 1 1 11 8H2m10.59 11.41A2 2 0 1 0 14 16H2m15.73-8.27A2.5 2.5 0 1 1 19.5 12H2" />' },
  { slug: 'earth', name: 'Earth', color: '#d97706', symbol: '<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />' },
  { slug: 'ice', name: 'Ice', color: '#60a5fa', symbol: '<path d="M12 2v20m8.66-15-17.32 10m17.32 0L3.34 7" />' },
  { slug: 'lightning', name: 'Lightning', color: '#eab308', symbol: '<path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />' },
  { slug: 'nature', name: 'Nature', color: '#22c55e', symbol: '<path d="M12 22v-7l-2-2m2 2l2-2m-2-5c-2.5-2.5-4.5-4.5-5.5-6.5a2.5 2.5 0 1 1 5 0c1 2 3 4 5.5 6.5a2.5 2.5 0 1 1-5 0z" />' },
  { slug: 'metal', name: 'Metal', color: '#94a3b8', symbol: '<path d="M12 2v20m-5-3l10-14m-10 0l10 14" />' },
  { slug: 'crystal', name: 'Crystal', color: '#d946ef', symbol: '<path d="M12 2l4 8-4 12-4-12z" />' },
  { slug: 'poison', name: 'Poison', color: '#a855f7', symbol: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />' },
  { slug: 'sound', name: 'Sound', color: '#8b5cf6', symbol: '<path d="M11 5L6 9H2v6h4l5 4V5zm5.5 11c1.5-2 1.5-5 0-7M19 19c3-4 3-10 0-14" />' },
  { slug: 'arcane', name: 'Arcane', color: '#ec4899', symbol: '<path d="M12 2l3 7 7 3-7 3-3 7-3-7-7-3 7-3z" />' },
  { slug: 'spirit', name: 'Spirit', color: '#6366f1', symbol: '<path d="M12 2a4 4 0 0 1 4 4v2a2 2 0 1 0 4 0v-2c0-4.42-3.58-8-8-8s-8 3.58-8 8v2a2 2 0 1 0 4 0v-2a4 4 0 0 1 4-4z" />' },
  { slug: 'light', name: 'Light', color: '#fbbf24', symbol: '<circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />' },
  { slug: 'void', name: 'Void', color: '#1e293b', symbol: '<circle cx="12" cy="12" r="8" fill="#1e293b" /><circle cx="12" cy="12" r="3" fill="#ffffff" />' },
  { slug: 'gravity', name: 'Gravity', color: '#475569', symbol: '<path d="M12 2v20m-7-7h14m-14-6h14" />' },
];

const elementsDir = path.join(__dirname, '../public/assets/icons/elements');
const skillsDir = path.join(__dirname, '../public/assets/icons/skills');

fs.mkdirSync(elementsDir, { recursive: true });
fs.mkdirSync(skillsDir, { recursive: true });

// Base Book/Scroll SVG for Skill Core
const getSkillCoreBg = (color) => `
<svg width="64" height="64" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#334155" />
      <stop offset="100%" stop-color="#0f172a" />
    </linearGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="3" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>
  
  <rect x="8" y="4" width="48" height="56" rx="8" fill="url(#bgGrad)" stroke="${color}" stroke-width="2" />
  <rect x="14" y="10" width="36" height="44" rx="4" fill="#1e293b" />
  
  <circle cx="32" cy="32" r="16" fill="none" stroke="${color}" stroke-width="1.5" opacity="0.6" />
  <circle cx="32" cy="32" r="12" fill="${color}" opacity="0.2" filter="url(#glow)" />
`;

elements.forEach(el => {
  // 1. Generate Element SVG
  const elementSvg = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${el.color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg">
  ${el.symbol}
</svg>`;
  fs.writeFileSync(path.join(elementsDir, `${el.slug}.svg`), elementSvg);

  // 2. Generate Mono-Element Skill Book SVG
  const skillBookSvg = `${getSkillCoreBg(el.color)}
  <g transform="translate(20, 20) scale(1)">
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${el.color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      ${el.symbol}
    </svg>
  </g>
</svg>`;
  fs.writeFileSync(path.join(skillsDir, `${el.slug}-skill.svg`), skillBookSvg);
});

// 3. Generate Dual-Element Fusion Skill Books (120 combinations)
const getFusionCoreBg = (color1, color2) => `
<svg width="64" height="64" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#334155" />
      <stop offset="100%" stop-color="#0f172a" />
    </linearGradient>
    <linearGradient id="fusionBorder" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${color1}" />
      <stop offset="100%" stop-color="${color2}" />
    </linearGradient>
    <filter id="glow1" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="3" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>
  
  <rect x="8" y="4" width="48" height="56" rx="8" fill="url(#bgGrad)" stroke="url(#fusionBorder)" stroke-width="2" />
  <rect x="14" y="10" width="36" height="44" rx="4" fill="#1e293b" />
  
  <circle cx="32" cy="32" r="16" fill="none" stroke="url(#fusionBorder)" stroke-width="1.5" opacity="0.6" />
  <path d="M16 32a16 16 0 0 1 16-16v32a16 16 0 0 1-16-16z" fill="${color1}" opacity="0.2" filter="url(#glow1)" />
  <path d="M32 16a16 16 0 0 1 16 16 16 16 0 0 1-16 16z" fill="${color2}" opacity="0.2" filter="url(#glow1)" />
`;

for (let i = 0; i < elements.length; i++) {
  for (let j = i + 1; j < elements.length; j++) {
    const el1 = elements[i];
    const el2 = elements[j];
    
    // We create a hybrid symbol that displays half of el1 and half of el2
    const fusionBookSvg = `${getFusionCoreBg(el1.color, el2.color)}
  <g transform="translate(14, 20) scale(1)">
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${el1.color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      ${el1.symbol}
    </svg>
  </g>
  <g transform="translate(26, 20) scale(1)">
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${el2.color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      ${el2.symbol}
    </svg>
  </g>
</svg>`;
    
    fs.writeFileSync(path.join(skillsDir, `${el1.slug}-${el2.slug}-skill.svg`), fusionBookSvg);
  }
}

console.log("SVGs generated successfully! Includes 16 bases and 120 dual-fusions.");
