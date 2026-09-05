"use client"

import React, { useState } from 'react'
import Link from 'serapht/link'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { ChevronLeft, ChevronRight, Copy, Check, Info, Lightbulb, AlertTriangle, ShieldAlert, Clock } from 'lucide-react'
import { WikiArticleMeta, getAdjacentArticles } from '@/shared/wiki/wikiRegistry'
import { Button } from '@/web/components/ui/button'

interface Props {
  content: string
  article: WikiArticleMeta
}

export default function WikiArticleView({ content, article }: Props) {
  const { prev, serapht } = getAdjacentArticles(article.slug)

  const slugify = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

  return (
    <div className="w-full max-w-4xl mx-auto pb-20">
      <div className="mb-10 space-y-4">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">{article.title}</h1>
        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Clock className="w-4 h-4" />
            {article.readTime} min read
          </span>
          <span className="w-px h-4 bg-border/50" />
          <div className="flex flex-wrap gap-1.5">
            {article.tags.slice(0, 4).map(tag => (
              <span key={tag} className="bg-muted/50 px-2 py-0.5 rounded-full text-xs">#{tag}</span>
            ))}
            {article.tags.length > 4 && (
              <span className="bg-muted/50 px-2 py-0.5 rounded-full text-xs">+{article.tags.length - 4}</span>
            )}
          </div>
        </div>
      </div>

      <div className="prose prose-invert prose-lg max-w-none prose-headings:scroll-mt-24 prose-a:text-primary prose-a:no-underline hover:prose-a:underline">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            h1: ({node, children}) => <h1 id={slugify(String(children))} className="text-3xl font-bold mt-10 mb-4">{children}</h1>,
            h2: ({node, children}) => <h2 id={slugify(String(children))} className="text-2xl font-bold mt-8 mb-4 border-b border-border/50 pb-2">{children}</h2>,
            h3: ({node, children}) => <h3 id={slugify(String(children))} className="text-xl font-bold mt-6 mb-3">{children}</h3>,
            a: ({node, href, children}) => <a href={href} className="text-primary hover:underline transition-colors">{children}</a>,
            img: ({node, src, alt}) => <img src={src} alt={alt} className="rounded-xl mx-auto my-8 max-h-[500px] object-cover border border-border/50" />,
            table: ({node, children}) => <div className="overflow-x-auto my-8"><table className="w-full border-collapse border border-border/50 rounded-lg">{children}</table></div>,
            thead: ({node, children}) => <thead className="bg-muted/50">{children}</thead>,
            tbody: ({node, children}) => <tbody>{children}</tbody>,
            tr: ({node, children}) => <tr className="border-b border-border/50 last:border-0 hover:bg-muted/20 transition-colors">{children}</tr>,
            th: ({node, children}) => <th className="p-3 text-left font-semibold">{children}</th>,
            td: ({node, children}) => <td className="p-3">{children}</td>,
            code: ({node, className, children, ...props}) => {
              const match = /language-(\w+)/.exec(className || '')
              const inline = !className
              if (inline) {
                return <code className="bg-muted/50 px-1.5 py-0.5 rounded text-sm font-mono text-primary/90" {...props}>{children}</code>
              }
              const language = match ? match[1] : 'text'
              const textContent = String(children).replace(/\n$/, '')
              
              return (
                <div className="relative my-6 rounded-xl overflow-hidden border border-border/50 bg-[#0d1117]">
                  <div className="flex items-center justify-between px-4 py-2 bg-muted/20 border-b border-border/50">
                    <span className="text-xs font-mono text-muted-foreground uppercase">{language}</span>
                    <CopyButton text={textContent} />
                  </div>
                  <pre className="p-4 overflow-x-auto text-sm font-mono text-gray-300">
                    <code className={className} {...props}>{children}</code>
                  </pre>
                </div>
              )
            },
            blockquote: ({node, children}) => {
              const text = String(children)
              let type = 'default'
              let icon = null
              let colors = 'border-l-4 border-muted-foreground bg-muted/20'
              
              if (text.includes('[!NOTE]')) { type = 'note'; icon = <Info className="w-5 h-5 text-blue-500" />; colors = 'border-l-4 border-blue-500 bg-blue-500/10' }
              else if (text.includes('[!TIP]')) { type = 'tip'; icon = <Lightbulb className="w-5 h-5 text-green-500" />; colors = 'border-l-4 border-green-500 bg-green-500/10' }
              else if (text.includes('[!IMPORTANT]')) { type = 'important'; icon = <Info className="w-5 h-5 text-purple-500" />; colors = 'border-l-4 border-purple-500 bg-purple-500/10' }
              else if (text.includes('[!WARNING]')) { type = 'warning'; icon = <AlertTriangle className="w-5 h-5 text-yellow-500" />; colors = 'border-l-4 border-yellow-500 bg-yellow-500/10' }
              else if (text.includes('[!CAUTION]')) { type = 'caution'; icon = <ShieldAlert className="w-5 h-5 text-red-500" />; colors = 'border-l-4 border-red-500 bg-red-500/10' }
              
              if (type !== 'default') {
                const cleanedText = React.Children.map(children, child => {
                  if (typeof child === 'string') return child.replace(/\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]/, '')
                  if (React.isValidElement(child) && (child as React.ReactElement<{children?: React.ReactNode}>).props.children) {
                    return React.cloneElement(child as React.ReactElement<{children?: React.ReactNode}>, {}, React.Children.map((child as React.ReactElement<{children?: React.ReactNode}>).props.children, c => 
                      typeof c === 'string' ? c.replace(/\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]/, '') : c
                    ))
                  }
                  return child
                })
                
                return (
                  <div className={`my-6 p-4 rounded-r-lg ${colors}`}>
                    <div className="flex items-center gap-2 font-bold mb-2 capitalize text-foreground">
                      {icon} {type}
                    </div>
                    <div className="text-muted-foreground">{cleanedText}</div>
                  </div>
                )
              }
              
              return <blockquote className="border-l-4 border-primary/50 pl-4 italic text-muted-foreground my-6">{children}</blockquote>
            }
          }}
        >
          {content}
        </ReactMarkdown>
      </div>

      <div className="mt-16 pt-8 border-t border-border/50 grid grid-cols-2 gap-4">
        {prev ? (
          <Link href={`/wiki/${prev.slug}`} className="flex flex-col items-start p-4 rounded-xl border border-border/50 bg-card/30 hover:bg-card/60 transition-colors group">
            <span className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><ChevronLeft className="w-3 h-3"/> Previous</span>
            <span className="font-semibold text-foreground group-hover:text-primary transition-colors">{prev.title}</span>
          </Link>
        ) : <div />}
        
        {serapht ? (
          <Link href={`/wiki/${serapht.slug}`} className="flex flex-col items-end text-right p-4 rounded-xl border border-border/50 bg-card/30 hover:bg-card/60 transition-colors group">
            <span className="text-xs text-muted-foreground mb-1 flex items-center gap-1">Serapht <ChevronRight className="w-3 h-3"/></span>
            <span className="font-semibold text-foreground group-hover:text-primary transition-colors">{serapht.title}</span>
          </Link>
        ) : <div />}
      </div>
    </div>
  )
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = () => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button onClick={handleCopy} className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded hover:bg-muted/50">
      {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
    </button>
  )
}
