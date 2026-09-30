import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import {
  getCharacterProfiles,
  getCharacterProfileBySlug,
  upsertCharacterProfile,
} from '@/server/services/characterProfileService';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const slug = searchParams.get('slug');

    if (slug) {
      const profile = await getCharacterProfileBySlug(slug);
      if (!profile) {
        return NextResponse.json({ success: false, error: 'Profile not found' }, { status: 404 });
      }
      return NextResponse.json({ success: true, profile });
    }

    const gameId = searchParams.get('gameId') || undefined;
    const category = searchParams.get('category') || undefined;
    const rigFamily = searchParams.get('rigFamily') || undefined;
    const query = searchParams.get('query') || undefined;

    const profiles = await getCharacterProfiles({
      gameId,
      category,
      rigFamily,
      query,
    });

    return NextResponse.json({ success: true, profiles, total: profiles.length });
  } catch (error: any) {
    console.error('[api/profiles/character] GET error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to fetch profiles' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized — login required' }, { status: 401 });
    }

    const body = await req.json();
    if (!body.name || !body.slug) {
      return NextResponse.json({ success: false, error: 'Missing required fields: name and slug are required' }, { status: 400 });
    }

    const profile = await upsertCharacterProfile({
      id: body.id,
      slug: body.slug.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-'),
      name: body.name.trim(),
      description: body.description,
      category: body.category || 'character',
      gameId: body.gameId || 'saints',
      baseModelAssetId: body.baseModelAssetId,
      rigFamily: body.rigFamily || 'HUMANOID_BIPED',
      skeletonType: body.skeletonType || 'mixamo',
      transformData: typeof body.transformData === 'object' ? JSON.stringify(body.transformData) : body.transformData,
      skeletonData: typeof body.skeletonData === 'object' ? JSON.stringify(body.skeletonData) : body.skeletonData,
      animationData: typeof body.animationData === 'object' ? JSON.stringify(body.animationData) : body.animationData,
      socketsData: typeof body.socketsData === 'object' ? JSON.stringify(body.socketsData) : body.socketsData,
      materialsData: typeof body.materialsData === 'object' ? JSON.stringify(body.materialsData) : body.materialsData,
      modularData: typeof body.modularData === 'object' ? JSON.stringify(body.modularData) : body.modularData,
      thumbnailUrl: body.thumbnailUrl,
      tags: body.tags,
      version: body.version || 1,
      isDefault: Boolean(body.isDefault),
      isActive: body.isActive !== undefined ? Boolean(body.isActive) : true,
    });

    return NextResponse.json({ success: true, profile });
  } catch (error: any) {
    console.error('[api/profiles/character] POST error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to save profile' }, { status: 500 });
  }
}
