// AUTO-GENERATED SHIM FOR @/app/actions/publishing

const API_URL = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL) ? import.meta.env.VITE_API_URL : 'https://saintsgaming.net/api/rpc';

export async function validateWorldForPublish(...args: any[]) {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ module: 'publishing', action: 'validateWorldForPublish', args })
  });
  if (!res.ok) throw new Error('RPC Error ' + res.status);
  const json = await res.json();
  if (json.error) throw new Error(json.error);
  return json.result;
}

export async function createPublishSnapshot(...args: any[]) {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ module: 'publishing', action: 'createPublishSnapshot', args })
  });
  if (!res.ok) throw new Error('RPC Error ' + res.status);
  const json = await res.json();
  if (json.error) throw new Error(json.error);
  return json.result;
}

export async function listPublishSnapshots(...args: any[]) {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ module: 'publishing', action: 'listPublishSnapshots', args })
  });
  if (!res.ok) throw new Error('RPC Error ' + res.status);
  const json = await res.json();
  if (json.error) throw new Error(json.error);
  return json.result;
}

export async function rollbackToSnapshot(...args: any[]) {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ module: 'publishing', action: 'rollbackToSnapshot', args })
  });
  if (!res.ok) throw new Error('RPC Error ' + res.status);
  const json = await res.json();
  if (json.error) throw new Error(json.error);
  return json.result;
}

