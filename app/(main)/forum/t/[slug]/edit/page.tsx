import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import EditThreadClient from "./edit-client";
import { PERMISSION_LEVELS } from "@/lib/permissions";

export default async function EditThreadPage({ params }: { params: Promise<{ slug: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const { slug } = await params;

  const thread = await prisma.thread.findUnique({
    where: { slug },
    include: { subcategory: true }
  });

  if (!thread) {
    notFound();
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { permissionLevel: true }
  });

  const canEdit = thread.authorId === session.user.id || (user?.permissionLevel ?? 0) >= PERMISSION_LEVELS.MODERATOR;

  if (!canEdit) {
    redirect(`/forum/t/${slug}`);
  }

  return (
    <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <EditThreadClient 
        threadId={thread.id} 
        initialTitle={thread.title} 
        initialBody={thread.body} 
        slug={slug} 
        subcategorySlug={thread.subcategory.slug}
      />
    </div>
  );
}
