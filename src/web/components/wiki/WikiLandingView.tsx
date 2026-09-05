"use client"

import React, { useState } from 'react'
import Link from 'next/link'
import { Search, Rocket, Gamepad2, Sparkles, Wand2, BookText, Clock, ArrowRight, BookOpen } from 'lucide-react'
import { getWikiCategories, getWikiArticleCount, FEATURED_GUIDES, getWikiArticle } from '@/shared/wiki/wikiRegistry'
import WikiSearchModal from './WikiSearchModal'

const ICON_MAP: Record<string, React.FC<any>> = {
  Rocket, Gamepad2, Sparkles, Wand2, BookText
}

export default function WikiLandingView() {
  const [searchOpen, setSearchOpen] = useState(false)
  const categories = getWikiCategories()
  const articleCount = getWikiArticleCount()
  const featuredArticles = FEATURED_GUIDES.map(slug => getWikiArticle(slug)).filter(Boolean)

  return (
    <div className="container mx-auto px-4 space-y-16 pb-20">
      {/* Hero Section */}
      <div className="text-center space-y-6 pt-12 pb-4">
        <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-1.5 rounded-full text-sm font-medium mb-4">
          <BookOpen className="w-4 h-4" />
          {articleCount} articles across {categories.length} categories
        </div>
        <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight sg-text-gradient">
          Saints Gaming Wiki
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          The complete Saints Gaming knowledge base. Everything from game systems and World Studio guides to community history since 2007.
        </p>

        {/* Search Bar */}
        <div className="max-w-xl mx-auto mt-8 relative group cursor-pointer" onClick={() => setSearchOpen(true)}>
          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
          <input 
            type="text" 
            placeholder="Search articles, guides, API docs..." 
            className="w-full h-14 pl-12 pr-24 rounded-2xl bg-card/60 backdrop-blur-xl border border-border/50 text-foreground placeholder-muted-foreground focus:outline-none transition-all duration-200 hover:border-primary/50 cursor-pointer shadow-sm pointer-events-none"
            readOnly
          />
          <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
            <kbd className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded border border-border/50 font-mono">
              <span className="text-[10px]">⌘</span>K
            </kbd>
          </div>
        </div>
      </div>

      {/* Category Grid */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold tracking-tight">Browse by Category</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {categories.map(category => {
            const Icon = ICON_MAP[category.icon] || BookText
            const firstArticle = category.articles[0]
            if (!firstArticle) return null;
            return (
              <div key={category.id} className="bg-card/60 backdrop-blur-xl border border-border/50 rounded-2xl p-6 transition-all duration-200 hover:border-primary/30 group flex flex-col">
                {/* Card Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className={`p-3 rounded-xl bg-gradient-to-br ${category.color} text-white shadow-lg shadow-black/20`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <span className="bg-muted/50 px-2.5 py-1 rounded-full text-xs font-semibold text-muted-foreground">
                    {category.articles.length} articles
                  </span>
                </div>

                {/* Title & Description */}
                <h3 className="text-xl font-bold mb-2">{category.title}</h3>
                <p className="text-muted-foreground text-sm mb-4">{category.description}</p>

                {/* Article Preview List */}
                <div className="flex-1 space-y-1 mb-4">
                  {category.articles.slice(0, 4).map(article => (
                    <Link
                      key={article.slug}
                      href={`/wiki/${article.slug}`}
                      className="flex items-center gap-2 py-1.5 px-2 -mx-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors group/item"
                    >
                      <span className="w-1 h-1 rounded-full bg-muted-foreground/50 flex-shrink-0" />
                      <span className="truncate">{article.title}</span>
                      <ArrowRight className="w-3 h-3 opacity-0 group-hover/item:opacity-100 transition-opacity flex-shrink-0 ml-auto" />
                    </Link>
                  ))}
                  {category.articles.length > 4 && (
                    <Link
                      href={`/wiki/${firstArticle.slug}`}
                      className="flex items-center gap-1 py-1.5 px-2 -mx-2 rounded-lg text-sm text-primary hover:bg-primary/10 transition-colors font-medium"
                    >
                      View all {category.articles.length} articles
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  )}
                </div>

                {/* Card Footer */}
                <Link
                  href={`/wiki/${firstArticle.slug}`}
                  className="mt-auto pt-4 border-t border-border/50 flex items-center justify-between text-sm font-medium text-foreground group-hover:text-primary transition-colors"
                >
                  Start reading
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </div>
            )
          })}
        </div>
      </div>

      {/* Featured Guides */}
      {featuredArticles.length > 0 && (
        <div className="space-y-6">
          <h2 className="text-2xl font-bold tracking-tight">Featured Guides</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {featuredArticles.map(article => article && (
              <Link key={article.slug} href={`/wiki/${article.slug}`} className="group">
                <div className="bg-card/60 backdrop-blur-xl border border-border/50 rounded-2xl p-5 transition-all duration-200 hover:border-primary/40 hover:scale-[1.02] h-full flex flex-col">
                  <h3 className="font-bold text-base mb-2 group-hover:text-primary transition-colors">{article.title}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-4 flex-grow">{article.summary}</p>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {article.readTime} min read
                    </span>
                    <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Quick Start CTA */}
      <div className="text-center bg-card/40 backdrop-blur-xl border border-border/50 rounded-2xl p-8 sm:p-12">
        <h2 className="text-2xl font-bold mb-3">New to Saints Gaming?</h2>
        <p className="text-muted-foreground mb-6 max-w-lg mx-auto">
          Welcome to the community. Start with the platform overview, check out the mod packs, and jump into The Lobby.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link
            href="/wiki/getting-started/overview"
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-xl font-medium hover:bg-primary/90 transition-colors"
          >
            <Rocket className="w-4 h-4" />
            Read the Overview
          </Link>
          <Link
            href="/wiki/getting-started/installation"
            className="inline-flex items-center gap-2 bg-muted/50 text-foreground px-6 py-3 rounded-xl font-medium hover:bg-muted/80 transition-colors border border-border/50"
          >
            Installation Guide
          </Link>
        </div>
      </div>

      <WikiSearchModal open={searchOpen} onOpenChange={setSearchOpen} />
    </div>
  )
}
