// AUTO-GENERATED SHIM FOR @/app/actions/auth

export async function resetPasswordAction(...args: any[]) {
  const res = await fetch('http://localhost:3000/api/rpc', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ module: 'auth', action: 'resetPasswordAction', args })
  });
  if (!res.ok) throw new Error('RPC Error ' + res.status);
  const json = await res.json();
  if (json.error) throw new Error(json.error);
  return json.result;
}

export async function forcePasswordChangeAction(...args: any[]) {
  const res = await fetch('http://localhost:3000/api/rpc', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ module: 'auth', action: 'forcePasswordChangeAction', args })
  });
  if (!res.ok) throw new Error('RPC Error ' + res.status);
  const json = await res.json();
  if (json.error) throw new Error(json.error);
  return json.result;
}

