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

  const description = article.excerpt || article.body.substring(0, 150) + "...";
  
  return {
    title: `${article.title} | Saints Gaming`,
    description,
    openGraph: {
      title: article.title,
      description,
      type: "article",
      url: `https://saintsgaming.net/news/${article.slug}`,
      siteName: "Saints Gaming",
      images: article.coverImage ? [
        {
          url: article.coverImage.startsWith("/") 
            ? `https://saintsgaming.net${article.coverImage}` 
            : article.coverImage,
          width: 1200,
          height: 630,
          alt: article.title,
        }
      ] : [],
    },
    twitter: {
      card: "summary_large_image",
      title: article.title,
      description,
      images: article.coverImage ? [
        article.coverImage.startsWith("/") 
          ? `https://saintsgaming.net${article.coverImage}` 
          : article.coverImage
      ] : [],
    },
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
    <article className="w-full min-h-screen animate-in fade-in duration-500 pb-20 -mt-28 pt-28 relative">
      {/* Hero Header */}
      <div className="relative w-full h-[50vh] md:h-[70vh] lg:h-[80vh]">
        {article.coverImage ? (
          <>
            {article.coverImage.trim().startsWith('<svg') ? (
              <div 
                className="w-full h-full [&>svg]:w-full [&>svg]:h-full [&>svg]:object-cover opacity-90"
                dangerouslySetInnerHTML={{ __html: sanitizeSvg(article.coverImage) }} 
              />
            ) : (
              <Image
                src={article.coverImage}
                alt={article.title}
                fill
                className="object-cover opacity-90"
                priority
              />
            )}
          </>
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/30 to-purple-600/30 flex items-center justify-center">
            <span className="text-6xl md:text-9xl font-bold opacity-10">SG</span>
          </div>
        )}
        
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-black/30 pointer-events-none" />

        {/* Back Button Overlay */}
        <div className="absolute top-28 left-4 md:left-8 z-20">
          <Link
            href="/news"
            className="inline-flex items-center text-sm font-medium text-white hover:text-primary transition-colors group bg-black/40 px-5 py-2.5 rounded-full border border-white/10 backdrop-blur-md shadow-sm"
          >
            <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform" />
            Back to News
          </Link>
        </div>
      </div>

      {/* Article Content Area */}
      <div className="relative z-10 px-4 sm:px-6 lg:px-8 -mt-32 md:-mt-48 lg:-mt-64 max-w-[1200px] mx-auto">
        <div className="bg-background/80 backdrop-blur-2xl border border-border/50 p-8 md:p-12 lg:p-16 rounded-3xl shadow-2xl">
          
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-8">
            <div className="flex items-center gap-1.5 bg-muted/50 px-3 py-1.5 rounded-full border border-border/30">
              <Calendar className="h-4 w-4" />
              {article.publishedAt ? format(new Date(article.publishedAt), "MMMM d, yyyy") : "Draft"}
            </div>
            <div className="flex items-center gap-1.5 bg-muted/50 px-3 py-1.5 rounded-full border border-border/30">
              <Clock className="h-4 w-4" />
              {readingTime} min read
            </div>
          </div>

          <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold tracking-tight mb-8 text-foreground leading-tight">
            {article.title}
          </h1>

          <div className="flex items-center gap-4 mb-12 pb-12 border-b border-border/50">
            {article.author.image ? (
              <Image 
                src={article.author.image} 
                alt={article.author.username} 
                width={56} 
                height={56} 
                className="rounded-full ring-2 ring-primary/30"
              />
            ) : (
              <div className="h-14 w-14 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xl ring-2 ring-primary/20">
                {article.author.username.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <p className="font-bold text-lg text-foreground">{article.author.username}</p>
              <p className="text-sm text-primary font-medium uppercase tracking-wider">Author</p>
            </div>
          </div>

          <div className="prose prose-invert prose-lg md:prose-xl max-w-none prose-headings:text-foreground prose-a:text-primary hover:prose-a:text-primary/80 prose-strong:text-foreground">
            <ReactMarkdown>{article.body}</ReactMarkdown>
          </div>
        </div>
      </div>
    </article>
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
