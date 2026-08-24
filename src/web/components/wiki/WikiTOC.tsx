"use client"

import React, { useEffect, useState } from 'react'

interface TOCItem {
  id: string
  text: string
  level: number
}

export default function WikiTOC({ content }: { content: string }) {
  const [headings, setHeadings] = useState<TOCItem[]>([])
  const [activeId, setActiveId] = useState<string>('')

  useEffect(() => {
    const slugify = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
    const regex = /^(##|###)\s+(.+)$/gm
    let match
    const items: TOCItem[] = []
    
    while ((match = regex.exec(content)) !== null) {
      items.push({
        level: match[1].length,
        text: match[2].trim(),
        id: slugify(match[2].trim())
      })
    }
    setHeadings(items)
  }, [content])

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id)
          }
        })
      },
      { rootMargin: '0px 0px -80% 0px' }
    )

    headings.forEach(heading => {
      const el = document.getElementById(heading.id)
      if (el) observer.observe(el)
    })

    return () => observer.disconnect()
  }, [headings])

  if (headings.length === 0) return null

  return (
    <div className="hidden xl:block w-[240px] shrink-0">
      <div className="sticky top-24 max-h-[calc(100vh-6rem)] overflow-y-auto">
        <h4 className="font-semibold mb-4 text-sm uppercase tracking-wider text-muted-foreground">On this page</h4>
        <ul className="space-y-2.5 text-sm">
          {headings.map((heading, i) => (
            <li key={i} style={{ paddingLeft: `${(heading.level - 2) * 1}rem` }}>
              <a
                href={`#${heading.id}`}
                onClick={(e) => {
                  e.preventDefault()
                  document.getElementById(heading.id)?.scrollIntoView({ behavior: 'smooth' })
                }}
                className={`block transition-colors hover:text-foreground ${activeId === heading.id ? 'text-primary font-medium' : 'text-muted-foreground'}`}
              >
                {heading.text}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
