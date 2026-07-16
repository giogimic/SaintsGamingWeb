import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSION_LEVELS } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { NewsEditor } from "@/components/admin/news-editor";
import { saveWriterNewsArticle, deleteWriterNewsArticle } from "@/app/writer/news/actions";

export const metadata = { title: "Writer - Create Article" };

export default async function NewWriterArticlePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { permissionLevel: true, isWriter: true }
  });

  if (!user || (!user.isWriter && user.permissionLevel < PERMISSION_LEVELS.ADMIN)) {
    return <div className="p-8 text-center text-red-500">Access Denied</div>;
  }

  return (
    <div className="py-6">
      <NewsEditor 
        saveAction={saveWriterNewsArticle} 
        deleteAction={deleteWriterNewsArticle} 
        backHref="/writer/news"
      />
    </div>
  );
}
