// AUTO-GENERATED SHIM FOR @/app/actions/recipes

export async function listCraftingRecipes(...args: any[]) {
  const res = await fetch('http://localhost:3000/api/rpc', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ module: 'recipes', action: 'listCraftingRecipes', args })
  });
  if (!res.ok) throw new Error('RPC Error ' + res.status);
  const json = await res.json();
  if (json.error) throw new Error(json.error);
  return json.result;
}

export async function getCraftingRecipe(...args: any[]) {
  const res = await fetch('http://localhost:3000/api/rpc', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ module: 'recipes', action: 'getCraftingRecipe', args })
  });
  if (!res.ok) throw new Error('RPC Error ' + res.status);
  const json = await res.json();
  if (json.error) throw new Error(json.error);
  return json.result;
}

export async function upsertCraftingRecipe(...args: any[]) {
  const res = await fetch('http://localhost:3000/api/rpc', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ module: 'recipes', action: 'upsertCraftingRecipe', args })
  });
  if (!res.ok) throw new Error('RPC Error ' + res.status);
  const json = await res.json();
  if (json.error) throw new Error(json.error);
  return json.result;
}

export async function deleteCraftingRecipe(...args: any[]) {
  const res = await fetch('http://localhost:3000/api/rpc', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ module: 'recipes', action: 'deleteCraftingRecipe', args })
  });
  if (!res.ok) throw new Error('RPC Error ' + res.status);
  const json = await res.json();
  if (json.error) throw new Error(json.error);
  return json.result;
}

