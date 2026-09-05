"use client"

import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Clock, ChevronRight } from 'lucide-react'
import { searchWikiArticles, WikiSearchResult } from '@/shared/wiki/wikiRegistry'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function WikiSearchModal({ open, onOpenChange }: Props) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<WikiSearchResult[]>([])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        onOpenChange(true)
      }
      if (e.key === 'Escape' && open) {
        onOpenChange(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, onOpenChange])

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100)
    } else {
      setQuery('')
      setResults([])
    }
  }, [open])

  useEffect(() => {
    if (query.trim().length > 0) {
      setResults(searchWikiArticles(query))
      setSelectedIndex(0)
    } else {
      setResults([])
    }
  }, [query])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(prev => (prev + 1) % results.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(prev => (prev - 1 + results.length) % results.length)
    } else if (e.key === 'Enter' && results.length > 0) {
      e.preventDefault()
      router.push(`/wiki/${results[selectedIndex].article.slug}`)
      onOpenChange(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] sm:pt-[20vh]">
      <div 
        className="fixed inset-0 bg-background/80 backdrop-blur-sm" 
        onClick={() => onOpenChange(false)} 
      />
      
      <div className="relative w-full max-w-2xl bg-card border border-border shadow-2xl rounded-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 mx-4">
        <div className="flex items-center px-4 border-b border-border/50">
          <Search className="w-5 h-5 text-muted-foreground mr-3" />
          <input
            ref={inputRef}
            className="flex-1 h-14 bg-transparent outline-none text-foreground placeholder-muted-foreground"
            placeholder="Search wiki articles..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <div className="flex gap-1 text-[10px] text-muted-foreground bg-muted px-2 py-1 rounded font-mono">
            <span>ESC</span>
          </div>
        </div>
        
        <div className="max-h-[60vh] overflow-y-auto">
          {query.trim().length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">
              Start typing to search the wiki...
            </div>
          ) : results.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">
              No articles found for '{query}'
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {results.map((result, i) => (
                <div
                  key={result.article.slug}
                  className={`flex flex-col p-3 rounded-xl cursor-pointer transition-colors ${i === selectedIndex ? 'bg-primary/10 border-primary/20' : 'hover:bg-muted/50'} border border-transparent`}
                  onClick={() => {
                    router.push(`/wiki/${result.article.slug}`)
                    onOpenChange(false)
                  }}
                  onMouseEnter={() => setSelectedIndex(i)}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full bg-gradient-to-r ${result.category.color} bg-opacity-10 border border-border/50 text-foreground`}>
                        {result.category.title}
                      </span>
                      <span className={`font-semibold ${i === selectedIndex ? 'text-primary' : 'text-foreground'}`}>
                        {result.article.title}
                      </span>
                    </div>
                    <ChevronRight className={`w-4 h-4 ${i === selectedIndex ? 'text-primary opacity-100' : 'text-muted-foreground opacity-0'} transition-opacity`} />
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-1">{result.article.summary}</p>
                  <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    <span>{result.article.readTime} min read</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
