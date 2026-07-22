import { redirect } from 'next/navigation';

export default async function TerminalPage(props: { searchParams: Promise<{ characterId?: string, create?: string }> }) {
  const params = await props.searchParams;
  const query = new URLSearchParams();
  if (params.characterId) query.set('characterId', params.characterId);
  if (params.create) query.set('create', params.create);
  
  const queryString = query.toString();
  redirect(`/lobby${queryString ? `?${queryString}` : ''}`);
}
