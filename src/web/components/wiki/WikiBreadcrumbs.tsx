import React from 'react'
import Link from 'serapht/link'
import { ChevronRight, BookOpen } from 'lucide-react'
import { getWikiBreadcrumbs } from '@/shared/wiki/wikiRegistry'

export default function WikiBreadcrumbs({ slug }: { slug: string }) {
  const breadcrumbs = getWikiBreadcrumbs(slug)
  
  if (!breadcrumbs || breadcrumbs.length === 0) return null

  return (
    <nav aria-label="Breadcrumb" className="flex items-center text-sm text-muted-foreground overflow-x-auto whitespace-nowrap pb-2 scrollbar-none">
      <BookOpen className="w-4 h-4 mr-1.5 flex-shrink-0 text-primary/70" />
      {breadcrumbs.map((crumb, index) => {
        const isLast = index === breadcrumbs.length - 1
        return (
          <React.Fragment key={crumb.href + index}>
            {index > 0 && <ChevronRight className="w-3.5 h-3.5 mx-1.5 flex-shrink-0 text-muted-foreground/40" />}
            {isLast ? (
              <span className="text-foreground font-medium truncate max-w-[200px]">{crumb.label}</span>
            ) : (
              <Link href={crumb.href} className="hover:text-foreground transition-colors truncate max-w-[160px]">
                {crumb.label}
              </Link>
            )}
          </React.Fragment>
        )
      })}
    </nav>
  )
}
