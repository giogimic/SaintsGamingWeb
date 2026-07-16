import { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ArrowLeft } from "lucide-react";
import { NewThreadForm } from "./new-thread-form";
import { auth } from "@/auth";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const resolvedParams = await params;
  const subcategory = await prisma.subCategory.findUnique({
    where: { slug: resolvedParams.slug },
  });

  if (!subcategory) return { title: "Subcategory Not Found" };

  return {
    title: `New Thread in ${subcategory.name} | Forums`,
  };
}

export default async function NewThreadPage({ params }: Props) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const resolvedParams = await params;
  const subcategory = await prisma.subCategory.findUnique({
    where: { slug: resolvedParams.slug },
  });

  if (!subcategory) {
    notFound();
  }

  if (subcategory.isLocked) {
    // If the category is locked globally (e.g. announcements), check if user is admin
    const permissionLevel = (session.user.permissionLevel as number) || 0;
    if (permissionLevel < 300) {
      redirect(`/forum/${subcategory.slug}`);
    }
  }

  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      <div className="mb-8">
        <Link
          href={`/forum/${subcategory.slug}`}
          className="inline-flex items-center text-sm text-muted-foreground hover:text-primary transition-colors mb-4 group"
        >
          <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform" />
          Back to {subcategory.name}
        </Link>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-3 text-foreground">
              Create New Thread
            </h1>
            <p className="text-muted-foreground mt-2">
              Posting in: <span className="font-semibold text-foreground">{subcategory.name}</span>
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border/50 bg-card/40 sg-glass p-6 md:p-8">
        <NewThreadForm subcategoryId={subcategory.id} subcategorySlug={subcategory.slug} />
      </div>
    </div>
  );
}
