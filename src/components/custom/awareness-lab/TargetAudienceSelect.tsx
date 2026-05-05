'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui'
import { Button } from '@/components/ui'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui'
import { Label } from '@/components/ui'
import { Badge } from '@/components/ui'
import { Users, User } from 'lucide-react'

interface TargetAudienceSelectProps {
  value: 'customer' | 'expert'
  onChange: (value: 'customer' | 'expert') => void
  disabled?: boolean
  className?: string
  required?: boolean
}

export function TargetAudienceSelect({
  value,
  onChange,
  disabled = false,
  className = '',
  required = true
}: TargetAudienceSelectProps) {
  return (
    <div className={`space-y-2 ${className}`}>
      <Label htmlFor="target-audience" className="text-sm font-medium">
        Target Audience {required && <span className="text-red-500">*</span>}
      </Label>
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger id="target-audience" className="w-full">
          <SelectValue placeholder="Select target audience" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="customer">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-blue-500" />
              <span>Customers</span>
              <Badge variant="secondary" className="ml-auto">
                Customer
              </Badge>
            </div>
          </SelectItem>
          <SelectItem value="expert">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-green-500" />
              <span>Experts</span>
              <Badge variant="secondary" className="ml-auto">
                Expert
              </Badge>
            </div>
          </SelectItem>
        </SelectContent>
      </Select>
      <p className="text-xs text-muted-foreground">
        {value === 'customer'
          ? 'This content will be available to customers only'
          : 'This content will be available to experts only'
        }
      </p>
    </div>
  )
}

interface TargetAudienceInfoProps {
  targetAudience: 'customer' | 'expert'
  showIcon?: boolean
  variant?: 'badge' | 'text' | 'full'
}

export function TargetAudienceInfo({
  targetAudience,
  showIcon = true,
  variant = 'badge'
}: TargetAudienceInfoProps) {
  const config = {
    customer: {
      label: 'Customers',
      icon: User,
      color: 'blue',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-700',
      iconColor: 'text-blue-500'
    },
    expert: {
      label: 'Experts',
      icon: Users,
      color: 'green',
      bgColor: 'bg-green-50',
      textColor: 'text-green-700',
      iconColor: 'text-green-500'
    }
  }

  const { label, icon: Icon, color, bgColor, textColor, iconColor } = config[targetAudience]

  if (variant === 'badge') {
    return (
      <Badge variant="secondary" className={`${bgColor} ${textColor} border-0`}>
        {showIcon && <Icon className={`h-3 w-3 mr-1 ${iconColor}`} />}
        {label}
      </Badge>
    )
  }

  if (variant === 'text') {
    return (
      <span className={`inline-flex items-center gap-1 text-sm ${textColor}`}>
        {showIcon && <Icon className={`h-4 w-4 ${iconColor}`} />}
        {label}
      </span>
    )
  }

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg ${bgColor}`}>
      {showIcon && <Icon className={`h-4 w-4 ${iconColor}`} />}
      <span className={`text-sm font-medium ${textColor}`}>
        Target: {label}
      </span>
    </div>
  )
}

export { TargetAudienceSelect as default }
