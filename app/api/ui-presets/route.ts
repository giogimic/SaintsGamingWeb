import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const presets = await prisma.uiPreset.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ presets });
  } catch (error: any) {
    console.error('Error fetching ui presets:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, data, isPublic } = body;

    if (!name || !data) {
      return NextResponse.json({ error: 'Name and data are required' }, { status: 400 });
    }

    const preset = await prisma.uiPreset.create({
      data: {
        userId: session.user.id,
        name,
        data: JSON.stringify(data),
        isPublic: !!isPublic,
      },
    });

    return NextResponse.json({ preset });
  } catch (error: any) {
    console.error('Error creating ui preset:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
