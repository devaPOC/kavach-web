"use client"

import * as React from "react"
import { Check, ChevronDown, Search } from "lucide-react"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { countries, type Country } from "@/lib/countries"

export interface PhoneInputProps extends Omit<React.ComponentProps<"input">, "onChange" | "value"> {
  value?: string
  onChange?: (value: string) => void
  defaultCountry?: string
  onCountryChange?: (country: Country) => void
}

const PhoneInput = React.forwardRef<HTMLInputElement, PhoneInputProps>(
  ({ className, value = "", onChange, defaultCountry = "US", onCountryChange, ...props }, ref) => {
    const [open, setOpen] = React.useState(false)
    const [selectedCountry, setSelectedCountry] = React.useState<Country>(() => {
      return countries.find(country => country.code === defaultCountry) || countries[0]
    })
    const [phoneNumber, setPhoneNumber] = React.useState("")

    // Parse initial value if provided
    React.useEffect(() => {
      if (value) {
        // Try to extract country code from the value
        const matchedCountry = countries.find(country => 
          value.startsWith(country.dialCode)
        )
        if (matchedCountry) {
          setSelectedCountry(matchedCountry)
          setPhoneNumber(value.slice(matchedCountry.dialCode.length))
        } else {
          setPhoneNumber(value)
        }
      }
    }, [value])

    const handleCountrySelect = (country: Country) => {
      setSelectedCountry(country)
      setOpen(false)
      onCountryChange?.(country)
      
      // Update the full phone number
      const fullNumber = country.dialCode + phoneNumber
      onChange?.(fullNumber)
    }

    const handlePhoneNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newPhoneNumber = e.target.value
      setPhoneNumber(newPhoneNumber)
      
      // Update the full phone number
      const fullNumber = selectedCountry.dialCode + newPhoneNumber
      onChange?.(fullNumber)
    }

    return (
      <div className="flex">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="w-[120px] justify-between rounded-r-none border-r-0 px-3"
            >
              <span className="flex items-center gap-2">
                <span className="text-lg">{selectedCountry.flag}</span>
                <span className="text-sm">{selectedCountry.dialCode}</span>
              </span>
              <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[300px] p-0">
            <Command>
              <CommandInput placeholder="Search country..." />
              <CommandEmpty>No country found.</CommandEmpty>
              <CommandList>
                <CommandGroup>
                  {countries.map((country) => (
                    <CommandItem
                      key={country.code}
                      value={`${country.name} ${country.dialCode}`}
                      onSelect={() => handleCountrySelect(country)}
                      className="flex items-center gap-2"
                    >
                      <span className="text-lg">{country.flag}</span>
                      <span className="flex-1">{country.name}</span>
                      <span className="text-sm text-muted-foreground">{country.dialCode}</span>
                      <Check
                        className={cn(
                          "ml-auto h-4 w-4",
                          selectedCountry.code === country.code ? "opacity-100" : "opacity-0"
                        )}
                      />
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        <Input
          {...props}
          ref={ref}
          type="tel"
          value={phoneNumber}
          onChange={handlePhoneNumberChange}
          className={cn("rounded-l-none", className)}
          placeholder="Enter phone number"
        />
      </div>
    )
  }
)

PhoneInput.displayName = "PhoneInput"

export { PhoneInput }