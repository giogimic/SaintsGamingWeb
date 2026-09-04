const fs = require('fs');
const path = require('path');

const actionsDir = path.resolve(__dirname, '../app/actions');
const rpcDir = path.resolve(__dirname, '../app/api/rpc');
const shimsDir = path.resolve(__dirname, '../saints-app/src/shims/actions');

if (!fs.existsSync(rpcDir)) fs.mkdirSync(rpcDir, { recursive: true });
if (!fs.existsSync(shimsDir)) fs.mkdirSync(shimsDir, { recursive: true });

const files = fs.readdirSync(actionsDir).filter(f => f.endsWith('.ts') && !f.endsWith('.d.ts'));

const API_URL_CODE = `const API_URL = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL) ? import.meta.env.VITE_API_URL : 'https://saintsgaming.net/api/rpc';`;

let registryImports = '';
let registryExports = 'export const actionRegistry: Record<string, any> = {\n';

for (const file of files) {
  const moduleName = file.replace('.ts', '');
  
  // 1. Generate Registry Entry for the Backend
  const camelName = moduleName.replace(/-([a-z])/g, g => g[1].toUpperCase());
  registryImports += `import * as ${camelName} from '@/app/actions/${moduleName}';\n`;
  registryExports += `  '${moduleName}': ${camelName},\n`;

  // 2. Parse exported functions to generate frontend shims
  const content = fs.readFileSync(path.join(actionsDir, file), 'utf8');
  
  // We look for `export async function name` or `export function name`
  const exportRegex = /export\s+(?:async\s+)?function\s+([a-zA-Z0-9_]+)/g;
  let match;
  let shimContent = `// AUTO-GENERATED SHIM FOR @/app/actions/${moduleName}\n\n`;
  shimContent += API_URL_CODE + '\n\n';

  while ((match = exportRegex.exec(content)) !== null) {
    const funcName = match[1];
    shimContent += `export async function ${funcName}(...args: any[]) {\n`;
    shimContent += `  const res = await fetch(API_URL, {\n`;
    shimContent += `    method: 'POST',\n`;
    shimContent += `    headers: { 'Content-Type': 'application/json' },\n`;
    shimContent += `    body: JSON.stringify({ module: '${moduleName}', action: '${funcName}', args })\n`;
    shimContent += `  });\n`;
    shimContent += `  if (!res.ok) throw new Error('RPC Error ' + res.status);\n`;
    shimContent += `  const json = await res.json();\n`;
    shimContent += `  if (json.error) throw new Error(json.error);\n`;
    shimContent += `  return json.result;\n`;
    shimContent += `}\n\n`;
  }

  // Also support constant exports: `export const name = async () => {}`
  const arrowRegex = /export\s+const\s+([a-zA-Z0-9_]+)\s*=\s*(?:async\s*)?(?:\([^)]*\)|[^=]*)=>/g;
  while ((match = arrowRegex.exec(content)) !== null) {
      const funcName = match[1];
      if (!shimContent.includes(`function ${funcName}(`)) {
        shimContent += `export async function ${funcName}(...args: any[]) {\n`;
        shimContent += `  const res = await fetch(API_URL, {\n`;
        shimContent += `    method: 'POST',\n`;
        shimContent += `    headers: { 'Content-Type': 'application/json' },\n`;
        shimContent += `    body: JSON.stringify({ module: '${moduleName}', action: '${funcName}', args })\n`;
        shimContent += `  });\n`;
        shimContent += `  if (!res.ok) throw new Error('RPC Error ' + res.status);\n`;
        shimContent += `  const json = await res.json();\n`;
        shimContent += `  if (json.error) throw new Error(json.error);\n`;
        shimContent += `  return json.result;\n`;
        shimContent += `}\n\n`;
      }
  }

  fs.writeFileSync(path.join(shimsDir, `${moduleName}.ts`), shimContent);
  console.log(`Generated shim for ${moduleName}`);
}

registryExports += '};\n';
fs.writeFileSync(path.join(rpcDir, 'registry.ts'), registryImports + '\n' + registryExports);
console.log('Generated app/api/rpc/registry.ts');
