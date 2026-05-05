'use client'
import React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { 
  Calendar, 
  Users, 
  Clock, 
  CheckCircle, 
  ArrowRight,
  Plus,
  FileText
} from 'lucide-react'

interface AwarenessSessionNavigationProps {
  userRole: 'customer' | 'expert' | 'admin'
  className?: string
}

export default function AwarenessSessionNavigation({ 
  userRole, 
  className = '' 
}: AwarenessSessionNavigationProps) {
  const router = useRouter()

  const getNavigationItems = () => {
    switch (userRole) {
      case 'customer':
        return [
          {
            title: 'Request New Session',
            description: 'Submit a new awareness session request',
            icon: Plus,
            href: '/dashboard/awareness-session-request',
            color: 'bg-primary hover:bg-primary'
          },
          {
            title: 'My Requests',
            description: 'View and track your session requests',
            icon: FileText,
            href: '/dashboard',
            color: 'bg-secondary hover:bg-secondary',
            onClick: () => {
              router.push('/dashboard')
              // Focus on awareness sessions tab
              setTimeout(() => {
                const tab = document.querySelector('[value="awareness_sessions"]')
                if (tab) (tab as HTMLElement).click()
              }, 100)
            }
          }
        ]

      case 'expert':
        return [
          {
            title: 'Assigned Sessions',
            description: 'View sessions assigned to you',
            icon: Users,
            href: '/expert/awareness-sessions',
            color: 'bg-primary hover:bg-primary'
          },
          {
            title: 'Schedule & Calendar',
            description: 'Manage your availability',
            icon: Calendar,
            href: '/expert/awareness-sessions',
            color: 'bg-primary hover:bg-primary'
          }
        ]

      case 'admin':
        return [
          {
            title: 'Review Requests',
            description: 'Approve and manage session requests',
            icon: Clock,
            href: '/admin/awareness-sessions',
            color: 'bg-accent hover:bg-accent'
          },
          {
            title: 'Assign Experts',
            description: 'Match experts with session requests',
            icon: Users,
            href: '/admin/awareness-sessions',
            color: 'bg-destructive hover:bg-destructive'
          },
          {
            title: 'Session Analytics',
            description: 'View session metrics and reports',
            icon: CheckCircle,
            href: '/admin/dashboard',
            color: 'bg-secondary hover:bg-secondary',
            onClick: () => {
              router.push('/admin/dashboard')
              // Focus on analytics tab
              setTimeout(() => {
                const tab = document.querySelector('[value="analytics"]')
                if (tab) (tab as HTMLElement).click()
              }, 100)
            }
          }
        ]

      default:
        return []
    }
  }

  const navigationItems = getNavigationItems()

  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 ${className}`}>
      {navigationItems.map((item, index) => (
        <Card key={index} className="hover:shadow-lg transition-shadow cursor-pointer">
          <CardContent className="p-6">
            {item.onClick ? (
              <button
                onClick={item.onClick}
                className="w-full text-left"
              >
                <div className="flex items-start space-x-4">
                  <div className={`p-3 rounded-lg ${item.color} text-white`}>
                    <item.icon className="h-6 w-6" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground mb-1">
                      {item.title}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      {item.description}
                    </p>
                    <div className="flex items-center text-sm text-primary">
                      <span>Go to {item.title.toLowerCase()}</span>
                      <ArrowRight className="h-4 w-4 ml-1" />
                    </div>
                  </div>
                </div>
              </button>
            ) : (
              <Link href={item.href}>
                <div className="flex items-start space-x-4">
                  <div className={`p-3 rounded-lg ${item.color} text-white`}>
                    <item.icon className="h-6 w-6" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground mb-1">
                      {item.title}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      {item.description}
                    </p>
                    <div className="flex items-center text-sm text-primary">
                      <span>Go to {item.title.toLowerCase()}</span>
                      <ArrowRight className="h-4 w-4 ml-1" />
                    </div>
                  </div>
                </div>
              </Link>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

// Quick action buttons for different roles
export function AwarenessSessionQuickActions({ 
  userRole 
}: { 
  userRole: 'customer' | 'expert' | 'admin' 
}) {
  const router = useRouter()

  const getQuickActions = () => {
    switch (userRole) {
      case 'customer':
        return (
          <div className="flex gap-2">
            <Link href="/dashboard/awareness-session-request">
              <Button size="sm" className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Request Session
              </Button>
            </Link>
          </div>
        )

      case 'expert':
        return (
          <div className="flex gap-2">
            <Link href="/expert/awareness-sessions">
              <Button size="sm" variant="outline" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                My Sessions
              </Button>
            </Link>
          </div>
        )

      case 'admin':
        return (
          <div className="flex gap-2">
            <Link href="/admin/awareness-sessions">
              <Button size="sm" variant="outline" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Review Requests
              </Button>
            </Link>
          </div>
        )

      default:
        return null
    }
  }

  return getQuickActions()
}