import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/web/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const preset = await prisma.uiPreset.findUnique({
      where: { id },
      include: {
        user: { select: { username: true, image: true } }
      }
    });

    if (!preset) {
      return NextResponse.json({ error: 'Preset not found' }, { status: 404 });
    }

    return NextResponse.json({ preset });
  } catch (error: any) {
    console.error('Error fetching ui preset:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const preset = await prisma.uiPreset.findUnique({
      where: { id },
    });

    if (!preset) {
      return NextResponse.json({ error: 'Preset not found' }, { status: 404 });
    }

    if (preset.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await prisma.uiPreset.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting ui preset:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
