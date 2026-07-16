import { handlers } from "@/auth";

export const dynamic = "force-dynamic";

export async function GET(req: any) {
  return handlers.GET(req);
}

export async function POST(req: any) {
  return handlers.POST(req);
}
