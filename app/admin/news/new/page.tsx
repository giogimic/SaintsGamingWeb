import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSION_LEVELS } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { NewsEditor } from "@/components/admin/news-editor";
import { saveNewsArticle, deleteNewsArticle } from "@/app/admin/news/actions";

export const metadata = { title: "Admin - Create Article" };

export default async function NewArticlePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { permissionLevel: true }
  });

  if (!user || user.permissionLevel < PERMISSION_LEVELS.ADMIN) {
    return <div className="p-8 text-center text-red-500">Access Denied</div>;
  }

  return (
    <div className="py-6">
      <NewsEditor saveAction={saveNewsArticle} deleteAction={deleteNewsArticle} />
    </div>
  );
}
