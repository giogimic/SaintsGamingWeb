// AUTO-GENERATED SHIM FOR @/app/actions/quest-templates

export async function listQuestTemplates(...args: any[]) {
  const res = await fetch('http://localhost:3000/api/rpc', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ module: 'quest-templates', action: 'listQuestTemplates', args })
  });
  if (!res.ok) throw new Error('RPC Error ' + res.status);
  const json = await res.json();
  if (json.error) throw new Error(json.error);
  return json.result;
}

export async function upsertQuestTemplate(...args: any[]) {
  const res = await fetch('http://localhost:3000/api/rpc', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ module: 'quest-templates', action: 'upsertQuestTemplate', args })
  });
  if (!res.ok) throw new Error('RPC Error ' + res.status);
  const json = await res.json();
  if (json.error) throw new Error(json.error);
  return json.result;
}

export async function deleteQuestTemplate(...args: any[]) {
  const res = await fetch('http://localhost:3000/api/rpc', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ module: 'quest-templates', action: 'deleteQuestTemplate', args })
  });
  if (!res.ok) throw new Error('RPC Error ' + res.status);
  const json = await res.json();
  if (json.error) throw new Error(json.error);
  return json.result;
}

