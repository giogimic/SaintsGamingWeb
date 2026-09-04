import { NextRequest, NextResponse } from 'next/server';
import { actionRegistry } from './registry';

// CORS headers if the Vite app calls it from a different origin
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(req: NextRequest) {
  try {
    const { module, action, args } = await req.json();

    if (!module || !action) {
      return NextResponse.json(
        { error: 'Missing module or action parameter' },
        { status: 400, headers: corsHeaders }
      );
    }

    const registeredModule = actionRegistry[module];
    if (!registeredModule) {
      return NextResponse.json(
        { error: `Module ${module} not found in RPC registry` },
        { status: 404, headers: corsHeaders }
      );
    }

    const actionFn = registeredModule[action];
    if (!actionFn || typeof actionFn !== 'function') {
      return NextResponse.json(
        { error: `Action ${action} not found in module ${module}` },
        { status: 404, headers: corsHeaders }
      );
    }

    const result = await actionFn(...(args || []));
    
    return NextResponse.json({ result }, { headers: corsHeaders });
  } catch (error: any) {
    console.error('[RPC Error]', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500, headers: corsHeaders }
    );
  }
}
