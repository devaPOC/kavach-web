'use client'
import React from 'react'
import Link from 'next/link'
import { ChevronRight, Home } from 'lucide-react'

export interface BreadcrumbItem {
  label: string
  href?: string
  current?: boolean
}

interface BreadcrumbProps {
  items: BreadcrumbItem[]
  showHome?: boolean
  className?: string
}

export default function Breadcrumb({ 
  items, 
  showHome = true, 
  className = '' 
}: BreadcrumbProps) {
  return (
    <nav 
      className={`flex items-center space-x-2 text-sm text-muted-foreground ${className}`}
      aria-label="Breadcrumb"
    >
      {showHome && (
        <>
          <Link 
            href="/" 
            className="hover:text-foreground/80 flex items-center"
            aria-label="Home"
          >
            <Home className="h-4 w-4" />
          </Link>
          {items.length > 0 && <ChevronRight className="h-4 w-4" />}
        </>
      )}
      
      {items.map((item, index) => (
        <React.Fragment key={index}>
          {item.href && !item.current ? (
            <Link 
              href={item.href} 
              className="hover:text-foreground/80 transition-colors"
            >
              {item.label}
            </Link>
          ) : (
            <span 
              className={item.current ? 'text-foreground font-medium' : 'text-muted-foreground'}
              aria-current={item.current ? 'page' : undefined}
            >
              {item.label}
            </span>
          )}
          
          {index < items.length - 1 && (
            <ChevronRight className="h-4 w-4" />
          )}
        </React.Fragment>
      ))}
    </nav>
  )
}

// Utility function to generate breadcrumbs based on pathname
export function generateBreadcrumbs(pathname: string): BreadcrumbItem[] {
  const segments = pathname.split('/').filter(Boolean)
  const breadcrumbs: BreadcrumbItem[] = []

  // Build breadcrumbs based on route segments
  let currentPath = ''
  
  segments.forEach((segment, index) => {
    currentPath += `/${segment}`
    const isLast = index === segments.length - 1

    // Convert segment to readable label
    let label = segment
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')

    // Handle special cases
    switch (segment) {
      case 'admin':
        label = 'Admin Dashboard'
        break
      case 'expert':
        label = 'Expert Dashboard'
        break
      case 'dashboard':
        if (segments[0] === 'admin') {
          label = 'Admin Dashboard'
        } else if (segments[0] === 'expert') {
          label = 'Expert Dashboard'
        } else {
          label = 'Dashboard'
        }
        break
      case 'awareness-sessions':
        label = 'Awareness Sessions'
        break
      case 'awareness-session-request':
        label = 'Request Session'
        break
      case 'profile':
        label = 'Profile'
        break
    }

    breadcrumbs.push({
      label,
      href: isLast ? undefined : currentPath,
      current: isLast
    })
  })

  return breadcrumbs
}

// Hook for using breadcrumbs with current pathname
export function useBreadcrumbs(customItems?: BreadcrumbItem[]) {
  if (typeof window === 'undefined') {
    return customItems || []
  }

  const pathname = window.location.pathname
  return customItems || generateBreadcrumbs(pathname)
}