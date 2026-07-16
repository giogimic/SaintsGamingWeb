import { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { format } from "date-fns";
import { Calendar, ArrowLeft, Clock } from "lucide-react";
import ReactMarkdown from "react-markdown";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const resolvedParams = await params;
  const article = await prisma.newsArticle.findUnique({
    where: { slug: resolvedParams.slug },
  });

  if (!article) return { title: "Article Not Found" };

  return {
    title: article.title,
    description: article.excerpt || article.title,
  };
}

export default async function NewsArticlePage({ params }: Props) {
  const resolvedParams = await params;
  const article = await prisma.newsArticle.findUnique({
    where: { slug: resolvedParams.slug },
    include: {
      author: {
        select: {
          username: true,
          image: true,
        },
      },
    },
  });

  if (!article) {
    notFound();
  }

  // Calculate reading time (roughly 200 words per minute)
  const wordCount = article.body.split(/\s+/).length;
  const readingTime = Math.ceil(wordCount / 200);

  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      <Link
        href="/news"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-primary transition-colors mb-8 group"
      >
        <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform" />
        Back to News
      </Link>

      <article className="sg-glass p-1 rounded-2xl overflow-hidden border border-border/50">
        {article.coverImage ? (
          <div className="relative h-64 md:h-96 w-full overflow-hidden rounded-t-xl">
            {article.coverImage.trim().startsWith('<svg') ? (
              <div 
                className="w-full h-full [&>svg]:w-full [&>svg]:h-full [&>svg]:object-cover"
                dangerouslySetInnerHTML={{ __html: sanitizeSvg(article.coverImage) }} 
              />
            ) : (
              <Image
                src={article.coverImage}
                alt={article.title}
                fill
                className="object-cover"
                priority
              />
            )}
          </div>
        ) : (
          <div className="h-48 md:h-64 w-full bg-gradient-to-br from-primary/20 to-purple-500/20 flex items-center justify-center rounded-t-xl">
            <span className="text-5xl font-bold opacity-20">SG</span>
          </div>
        )}

        <div className="p-6 md:p-10 bg-card/60 backdrop-blur-md rounded-b-xl">
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-6">
            <div className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4" />
              {article.publishedAt ? format(new Date(article.publishedAt), "MMMM d, yyyy") : "Draft"}
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="h-4 w-4" />
              {readingTime} min read
            </div>
          </div>

          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-6 text-foreground">
            {article.title}
          </h1>

          <div className="flex items-center gap-3 mb-10 pb-10 border-b border-border/50">
            {article.author.image ? (
              <Image 
                src={article.author.image} 
                alt={article.author.username} 
                width={40} 
                height={40} 
                className="rounded-full"
              />
            ) : (
              <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                {article.author.username.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <p className="font-medium text-foreground">{article.author.username}</p>
              <p className="text-xs text-muted-foreground">Author</p>
            </div>
          </div>

          <div className="prose prose-invert prose-lg max-w-none prose-headings:text-foreground prose-a:text-primary hover:prose-a:text-primary/80 prose-strong:text-foreground">
            <ReactMarkdown>{article.body}</ReactMarkdown>
          </div>
        </div>
      </article>
    </div>
  );
}

// Simple XSS strip for SVGs
function sanitizeSvg(svg: string) {
  if (!svg) return "";
  let clean = svg.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
  clean = clean.replace(/\bon\w+\s*=\s*(['"])(?:(?!\1).)*\1/gi, "");
  clean = clean.replace(/\bon\w+\s*=\s*[^>\s]+/gi, "");
  clean = clean.replace(/href\s*=\s*(['"])javascript:.*?\1/gi, "");
  return clean;
}
