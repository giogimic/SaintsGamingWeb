// AUTO-GENERATED SHIM FOR @/app/actions/steam

const API_URL = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL) ? import.meta.env.VITE_API_URL : 'https://saintsgaming.net/api/rpc';

export async function addSteamWishlistItem(...args: any[]) {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ module: 'steam', action: 'addSteamWishlistItem', args })
  });
  if (!res.ok) throw new Error('RPC Error ' + res.status);
  const json = await res.json();
  if (json.error) throw new Error(json.error);
  return json.result;
}

export async function removeSteamWishlistItem(...args: any[]) {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ module: 'steam', action: 'removeSteamWishlistItem', args })
  });
  if (!res.ok) throw new Error('RPC Error ' + res.status);
  const json = await res.json();
  if (json.error) throw new Error(json.error);
  return json.result;
}

