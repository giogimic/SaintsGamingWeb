import { NextRequest } from 'next/server';
import { SampManager } from '@/server/sampManager';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  // Authentication check would go here for production.
  // We assume the caller is an admin if they can reach this endpoint via UCP.

  const manager = SampManager.getInstance();

  const responseStream = new TransformStream();
  const writer = responseStream.writable.getWriter();
  const encoder = new TextEncoder();

  const handleLog = (data: string) => {
    // Send as an SSE message
    const formatted = data.split('\n').map(line => line.trim()).filter(Boolean);
    for (const line of formatted) {
      writer.write(encoder.encode(`data: ${JSON.stringify({ type: 'log', message: line })}\n\n`));
    }
  };

  const handleErrorLog = (data: string) => {
    const formatted = data.split('\n').map(line => line.trim()).filter(Boolean);
    for (const line of formatted) {
      writer.write(encoder.encode(`data: ${JSON.stringify({ type: 'error', message: line })}\n\n`));
    }
  };

  const handleStop = (code: number) => {
    writer.write(encoder.encode(`data: ${JSON.stringify({ type: 'sys', message: `Server stopped with code ${code}` })}\n\n`));
    // Don't close the stream, they might start it again.
  };

  manager.on('log', handleLog);
  manager.on('error_log', handleErrorLog);
  manager.on('stopped', handleStop);

  req.signal.addEventListener('abort', () => {
    manager.off('log', handleLog);
    manager.off('error_log', handleErrorLog);
    manager.off('stopped', handleStop);
    writer.close();
  });

  // Send an initial connected message
  writer.write(encoder.encode(`data: ${JSON.stringify({ type: 'sys', message: 'Connected to SA-MP log stream.' })}\n\n`));

  return new Response(responseStream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
    },
  });
}
