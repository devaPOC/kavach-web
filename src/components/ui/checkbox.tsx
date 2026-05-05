"use client"

import * as React from "react"
import { CheckIcon } from "lucide-react"

import { cn } from "@/lib/utils"

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'onChange'> {
  checked?: boolean
  defaultChecked?: boolean
  onCheckedChange?: (checked: boolean) => void
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, checked, defaultChecked, onCheckedChange, disabled, ...props }, ref) => {
    const [isChecked, setIsChecked] = React.useState(defaultChecked ?? false)

    // Use controlled value if provided, otherwise use internal state
    const checkedValue = checked !== undefined ? checked : isChecked

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newChecked = e.target.checked
      if (checked === undefined) {
        setIsChecked(newChecked)
      }
      onCheckedChange?.(newChecked)
    }

    return (
      <label
        data-slot="checkbox"
        className={cn(
          "relative inline-flex items-center justify-center size-4 shrink-0 rounded border shadow-xs transition-all cursor-pointer",
          "border-input bg-background",
          checkedValue && "bg-primary border-primary",
          disabled && "cursor-not-allowed opacity-50",
          "focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-1",
          className
        )}
      >
        <input
          type="checkbox"
          ref={ref}
          checked={checkedValue}
          onChange={handleChange}
          disabled={disabled}
          className="sr-only"
          {...props}
        />
        {checkedValue && (
          <CheckIcon
            className={cn(
              "size-3 text-primary-foreground",
              disabled && "opacity-50"
            )}
            strokeWidth={3}
          />
        )}
      </label>
    )
  }
)

Checkbox.displayName = "Checkbox"

export { Checkbox }
