import { countries, type Country } from "./countries"

export interface PhoneValidationResult {
  isValid: boolean
  country?: Country
  nationalNumber?: string
  internationalNumber?: string
  error?: string
}

/**
 * Validates a phone number and extracts country information
 */
export function validatePhoneNumber(phoneNumber: string): PhoneValidationResult {
  if (!phoneNumber) {
    return {
      isValid: false,
      error: "Phone number is required"
    }
  }

  // Remove all non-digit characters except the leading +
  const cleanNumber = phoneNumber.replace(/[^\d+]/g, "")
  
  if (!cleanNumber.startsWith("+")) {
    return {
      isValid: false,
      error: "Phone number must include country code (start with +)"
    }
  }

  // Find matching country by dial code
  const matchedCountry = countries.find(country => 
    cleanNumber.startsWith(country.dialCode)
  )

  if (!matchedCountry) {
    return {
      isValid: false,
      error: "Invalid country code"
    }
  }

  const nationalNumber = cleanNumber.slice(matchedCountry.dialCode.length)
  
  // Basic validation - at least 4 digits for national number
  if (nationalNumber.length < 4) {
    return {
      isValid: false,
      error: "Phone number is too short"
    }
  }

  // Maximum 15 digits total (ITU-T E.164 standard)
  if (cleanNumber.length > 16) { // +1 for the + sign
    return {
      isValid: false,
      error: "Phone number is too long"
    }
  }

  return {
    isValid: true,
    country: matchedCountry,
    nationalNumber,
    internationalNumber: cleanNumber
  }
}

/**
 * Formats a phone number for display
 */
export function formatPhoneNumber(phoneNumber: string, format: "international" | "national" = "international"): string {
  const validation = validatePhoneNumber(phoneNumber)
  
  if (!validation.isValid || !validation.country || !validation.nationalNumber) {
    return phoneNumber
  }

  if (format === "national") {
    // Basic national formatting - you can enhance this per country
    const national = validation.nationalNumber
    if (validation.country.code === "US" && national.length === 10) {
      return `(${national.slice(0, 3)}) ${national.slice(3, 6)}-${national.slice(6)}`
    }
    return national
  }

  return `${validation.country.dialCode} ${validation.nationalNumber}`
}

/**
 * Zod schema for phone number validation
 */
export const phoneNumberSchema = (required = true) => {
  const baseSchema = (value: string) => {
    const result = validatePhoneNumber(value)
    return result.isValid
  }

  return required 
    ? baseSchema
    : (value: string) => !value || baseSchema(value)
}