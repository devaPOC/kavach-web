"use client"

import * as React from "react"
import { format } from "date-fns"
import { CalendarIcon, ClockIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface DateTimePickerProps {
  value?: Date
  onChange?: (date: Date | undefined) => void
  placeholder?: string
  disabled?: boolean
  minDate?: Date
  className?: string
}

export function DateTimePicker({
  value,
  onChange,
  placeholder = "Select date and time",
  disabled = false,
  minDate,
  className,
}: DateTimePickerProps) {
  const [open, setOpen] = React.useState(false)
  const [timeValue, setTimeValue] = React.useState("")

  // Initialize time value when date changes
  React.useEffect(() => {
    if (value) {
      const hours = value.getHours().toString().padStart(2, "0")
      const minutes = value.getMinutes().toString().padStart(2, "0")
      setTimeValue(`${hours}:${minutes}`)
    } else {
      setTimeValue("")
    }
  }, [value])

  const handleDateSelect = (selectedDate: Date | undefined) => {
    if (!selectedDate) {
      onChange?.(undefined)
      setTimeValue("")
      return
    }

    // If we have a time value, apply it to the selected date
    if (timeValue) {
      const [hours, minutes] = timeValue.split(":").map(Number)
      if (!isNaN(hours) && !isNaN(minutes)) {
        const newDate = new Date(selectedDate)
        newDate.setHours(hours, minutes, 0, 0)
        onChange?.(newDate)
        return
      }
    }

    // Otherwise, use current time or 00:00
    const newDate = new Date(selectedDate)
    if (value) {
      // Keep existing time
      newDate.setHours(value.getHours(), value.getMinutes(), 0, 0)
    } else {
      // Set to current time
      const now = new Date()
      newDate.setHours(now.getHours(), now.getMinutes(), 0, 0)
    }
    onChange?.(newDate)
  }

  const handleTimeChange = (timeString: string) => {
    setTimeValue(timeString)

    if (!value || !timeString) return

    const [hours, minutes] = timeString.split(":").map(Number)
    if (isNaN(hours) || isNaN(minutes)) return

    const newDate = new Date(value)
    newDate.setHours(hours, minutes, 0, 0)
    onChange?.(newDate)
  }

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-full justify-start text-left font-normal",
              !value && "text-muted-foreground"
            )}
            disabled={disabled}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {value ? (
              format(value, "PPP 'at' HH:mm")
            ) : (
              <span>{placeholder}</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div className="space-y-4 p-4">
            <Calendar
              mode="single"
              selected={value}
              onSelect={handleDateSelect}
              disabled={minDate ? (date) => date < minDate : undefined}
              initialFocus
            />
            <div className="space-y-2">
              <Label htmlFor="time">Time</Label>
              <div className="flex items-center space-x-2">
                <ClockIcon className="h-4 w-4 text-muted-foreground" />
                <Input
                  id="time"
                  type="time"
                  value={timeValue}
                  onChange={(e) => handleTimeChange(e.target.value)}
                  className="w-full"
                />
              </div>
            </div>
            <div className="flex justify-between">
              <Button
                variant="outline"
                onClick={() => {
                  onChange?.(undefined)
                  setOpen(false)
                }}
              >
                Clear
              </Button>
              <Button
                onClick={() => setOpen(false)}
                disabled={!value}
              >
                Done
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
