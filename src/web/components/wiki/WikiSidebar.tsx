"use client"

import React, { useState } from 'react'
import Link from 'next/link'
import { getWikiCategories } from '@/shared/wiki/wikiRegistry'
import { Rocket, Gamepad2, Sparkles, Wand2, BookText, ChevronDown, ChevronRight, Menu } from 'lucide-react'
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/shared/ui/sheet'
import { Button } from '@/shared/ui/button'

const ICON_MAP: Record<string, React.FC<any>> = {
  Rocket, Gamepad2, Sparkles, Wand2, BookText
}

export default function WikiSidebar({ currentSlug }: { currentSlug?: string }) {
  const categories = getWikiCategories()
  
  const initialExpanded = categories.reduce((acc, cat) => {
    if (cat.articles.some(a => a.slug === currentSlug)) acc[cat.id] = true
    return acc
  }, {} as Record<string, boolean>)
  
  const [expanded, setExpanded] = useState<Record<string, boolean>>(initialExpanded)
  
  const toggleCategory = (id: string) => {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }))
  }

  const SidebarContent = () => (
    <div className="space-y-1 w-full max-w-[280px]">
      {categories.map(cat => {
        const Icon = ICON_MAP[cat.icon] || BookText
        const isExpanded = expanded[cat.id]
        
        return (
          <div key={cat.id} className="flex flex-col">
            <button 
              onClick={() => toggleCategory(cat.id)}
              className="flex items-center justify-between w-full p-2 text-sm font-semibold rounded-lg hover:bg-muted/50 transition-colors text-foreground"
            >
              <div className="flex items-center gap-2">
                <Icon className={`w-4 h-4 text-primary`} />
                <span>{cat.title}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs bg-muted/50 px-1.5 py-0.5 rounded text-muted-foreground">{cat.articles.length}</span>
                {isExpanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
              </div>
            </button>
            
            {isExpanded && (
              <div className="mt-1 mb-2 ml-4 pl-3 border-l border-border/50 space-y-1">
                {cat.articles.map(article => {
                  const isActive = article.slug === currentSlug
                  return (
                    <Link key={article.slug} href={`/wiki/${article.slug}`}>
                      <div className={`block py-1.5 px-3 text-sm rounded-md transition-colors ${isActive ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'}`}>
                        {article.title}
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )

  return (
    <>
      <div className="hidden lg:block w-[280px] shrink-0 sticky top-24 h-[calc(100vh-6rem)] overflow-y-auto pr-4 scrollbar-thin">
        <SidebarContent />
      </div>
      
      <div className="lg:hidden fixed bottom-6 right-6 z-50">
        <Sheet>
          <SheetTrigger render={<Button size="icon" className="rounded-full shadow-lg h-12 w-12 bg-primary text-primary-foreground hover:bg-primary/90" />}>
              <Menu className="h-6 w-6" />
          </SheetTrigger>
          <SheetContent side="left" className="w-[300px] sm:w-[340px] bg-background/95 backdrop-blur-xl border-r-border/50 pt-10">
            <SheetTitle className="sr-only">Wiki Navigation</SheetTitle>
            <div className="h-full overflow-y-auto pb-10">
              <SidebarContent />
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </>
  )
}
