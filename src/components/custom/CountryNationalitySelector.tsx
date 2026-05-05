'use client';

import { useState, useMemo } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Search } from 'lucide-react';
import { countries, nationalities } from '@/lib/data/locations';

interface CountryNationalitySelectorProps {
  // Country props
  countryValue?: string;
  onCountryChange?: (value: string) => void;
  countryLabel?: string;
  countryPlaceholder?: string;
  countryError?: string;
  countryRequired?: boolean;
  countryDisabled?: boolean;
  
  // Nationality props
  nationalityValue?: string;
  onNationalityChange?: (value: string) => void;
  nationalityLabel?: string;
  nationalityPlaceholder?: string;
  nationalityError?: string;
  nationalityRequired?: boolean;
  nationalityDisabled?: boolean;
  
  // Layout props
  layout?: 'horizontal' | 'vertical';
  showSearch?: boolean;
  className?: string;
}

export function CountryNationalitySelector({
  // Country props
  countryValue,
  onCountryChange,
  countryLabel = 'Country',
  countryPlaceholder = 'Select country',
  countryError,
  countryRequired = false,
  countryDisabled = false,
  
  // Nationality props
  nationalityValue,
  onNationalityChange,
  nationalityLabel = 'Nationality',
  nationalityPlaceholder = 'Select nationality',
  nationalityError,
  nationalityRequired = false,
  nationalityDisabled = false,
  
  // Layout props
  layout = 'horizontal',
  showSearch = true,
  className = ''
}: CountryNationalitySelectorProps) {
  const [countrySearch, setCountrySearch] = useState('');
  const [nationalitySearch, setNationalitySearch] = useState('');

  // Filter countries based on search
  const filteredCountries = useMemo(() => {
    if (!countrySearch) return countries;
    return countries.filter(country =>
      country.label.toLowerCase().includes(countrySearch.toLowerCase())
    );
  }, [countrySearch]);

  // Filter nationalities based on search
  const filteredNationalities = useMemo(() => {
    if (!nationalitySearch) return nationalities;
    return nationalities.filter(nationality =>
      nationality.label.toLowerCase().includes(nationalitySearch.toLowerCase())
    );
  }, [nationalitySearch]);

  const containerClass = layout === 'horizontal' 
    ? 'grid grid-cols-1 md:grid-cols-2 gap-4' 
    : 'space-y-4';

  return (
    <div className={`${containerClass} ${className}`}>
      {/* Country Selector */}
      {onCountryChange && (
        <div>
          <Label htmlFor="country">
            {countryLabel} {countryRequired && '*'}
          </Label>
          <Select
            value={countryValue || ''}
            onValueChange={onCountryChange}
            disabled={countryDisabled}
          >
            <SelectTrigger className={countryError ? 'border-red-500' : ''}>
              <SelectValue placeholder={countryPlaceholder} />
            </SelectTrigger>
            <SelectContent>
              {showSearch && (
                <div className="flex items-center px-3 pb-2">
                  <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                  <Input
                    placeholder="Search countries..."
                    value={countrySearch}
                    onChange={(e) => setCountrySearch(e.target.value)}
                    className="h-8 w-full border-0 p-0 focus-visible:ring-0"
                  />
                </div>
              )}
              {filteredCountries.map((country) => (
                <SelectItem key={country.value} value={country.value}>
                  {country.label}
                </SelectItem>
              ))}
              {filteredCountries.length === 0 && (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  No countries found.
                </div>
              )}
            </SelectContent>
          </Select>
          {countryError && (
            <p className="text-sm text-red-500 mt-1">{countryError}</p>
          )}
        </div>
      )}

      {/* Nationality Selector */}
      {onNationalityChange && (
        <div>
          <Label htmlFor="nationality">
            {nationalityLabel} {nationalityRequired && '*'}
          </Label>
          <Select
            value={nationalityValue || ''}
            onValueChange={onNationalityChange}
            disabled={nationalityDisabled}
          >
            <SelectTrigger className={nationalityError ? 'border-red-500' : ''}>
              <SelectValue placeholder={nationalityPlaceholder} />
            </SelectTrigger>
            <SelectContent>
              {showSearch && (
                <div className="flex items-center px-3 pb-2">
                  <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                  <Input
                    placeholder="Search nationalities..."
                    value={nationalitySearch}
                    onChange={(e) => setNationalitySearch(e.target.value)}
                    className="h-8 w-full border-0 p-0 focus-visible:ring-0"
                  />
                </div>
              )}
              {filteredNationalities.map((nationality) => (
                <SelectItem key={nationality.value} value={nationality.value}>
                  {nationality.label}
                </SelectItem>
              ))}
              {filteredNationalities.length === 0 && (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  No nationalities found.
                </div>
              )}
            </SelectContent>
          </Select>
          {nationalityError && (
            <p className="text-sm text-red-500 mt-1">{nationalityError}</p>
          )}
        </div>
      )}
    </div>
  );
}

// Separate components for individual use
export function CountrySelector({
  value,
  onChange,
  label = 'Country',
  placeholder = 'Select country',
  error,
  required = false,
  disabled = false,
  showSearch = true,
  className = ''
}: {
  value?: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  showSearch?: boolean;
  className?: string;
}) {
  return (
    <CountryNationalitySelector
      countryValue={value}
      onCountryChange={onChange}
      countryLabel={label}
      countryPlaceholder={placeholder}
      countryError={error}
      countryRequired={required}
      countryDisabled={disabled}
      showSearch={showSearch}
      className={className}
    />
  );
}

export function NationalitySelector({
  value,
  onChange,
  label = 'Nationality',
  placeholder = 'Select nationality',
  error,
  required = false,
  disabled = false,
  showSearch = true,
  className = ''
}: {
  value?: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  showSearch?: boolean;
  className?: string;
}) {
  return (
    <CountryNationalitySelector
      nationalityValue={value}
      onNationalityChange={onChange}
      nationalityLabel={label}
      nationalityPlaceholder={placeholder}
      nationalityError={error}
      nationalityRequired={required}
      nationalityDisabled={disabled}
      showSearch={showSearch}
      className={className}
    />
  );
}