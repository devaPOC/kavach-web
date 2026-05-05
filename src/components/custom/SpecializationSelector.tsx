'use client';

import React, { useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export interface SpecializationOption {
  id: string;
  label: string;
}

export interface SpecializationSelectorProps {
  selectedSpecializations: string[];
  onSpecializationsChange: (specializations: string[]) => void;
  otherSpecialization?: string;
  onOtherSpecializationChange?: (value: string) => void;
  title?: string;
  className?: string;
}

const DEFAULT_SPECIALIZATIONS: SpecializationOption[] = [
  { id: 'digital-footprint', label: 'Digital Footprint & Privacy Specialist' },
  { id: 'endpoint-security', label: 'Endpoint & Device Security Specialist' },
  { id: 'home-wifi-security', label: 'Home & WiFi Security Specialist' },
  { id: 'incident-response', label: 'Incident Response Specialist' },
  { id: 'threat-intelligence', label: 'Threat Intelligence & Dark Web Analyst' },
  { id: 'cyber-awareness', label: 'Cyber Awareness & Training Specialist' },
  { id: 'executive-advisor', label: 'Executive & VIP Cybersecurity Advisor' },
  { id: 'compliance-governance', label: 'Compliance & Governance Specialist' },
  { id: 'pc-mobile-repair', label: 'PC & Mobile Repair Specialist' },
  { id: 'forensics', label: 'PC/Mobile Forensics Specialist' },
  { id: 'data-recovery', label: 'Data Recovery Specialist' },
];

export default function SpecializationSelector({
  selectedSpecializations,
  onSpecializationsChange,
  otherSpecialization = '',
  onOtherSpecializationChange,
  title = 'Areas of Specialization',
  className = '',
}: SpecializationSelectorProps) {
  const [showOtherInput, setShowOtherInput] = useState(
    selectedSpecializations.includes('other') || otherSpecialization.length > 0
  );

  const handleSpecializationChange = (specializationId: string, checked: boolean) => {
    let updatedSpecializations: string[];

    if (checked) {
      updatedSpecializations = [...selectedSpecializations, specializationId];
    } else {
      updatedSpecializations = selectedSpecializations.filter(id => id !== specializationId);
    }

    // Handle "Other" option
    if (specializationId === 'other') {
      setShowOtherInput(checked);
      if (!checked && onOtherSpecializationChange) {
        onOtherSpecializationChange('');
      }
    }

    onSpecializationsChange(updatedSpecializations);
  };

  const handleOtherInputChange = (value: string) => {
    if (onOtherSpecializationChange) {
      onOtherSpecializationChange(value);
    }

    // Auto-select "other" when user starts typing
    if (value.trim() && !selectedSpecializations.includes('other')) {
      onSpecializationsChange([...selectedSpecializations, 'other']);
    }
    // Auto-deselect "other" when user clears the input
    else if (!value.trim() && selectedSpecializations.includes('other')) {
      onSpecializationsChange(selectedSpecializations.filter(id => id !== 'other'));
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">{title}</CardTitle>
        <p className="text-sm text-muted-foreground">
          Select one or more areas that match your expertise
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3">
          {DEFAULT_SPECIALIZATIONS.map((specialization) => (
            <div key={specialization.id} className="flex items-center space-x-3">
              <Checkbox
                id={specialization.id}
                checked={selectedSpecializations.includes(specialization.id)}
                onCheckedChange={(checked) =>
                  handleSpecializationChange(specialization.id, checked as boolean)
                }
              />
              <Label
                htmlFor={specialization.id}
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                {specialization.label}
              </Label>
            </div>
          ))}

          {/* Other option */}
          <div className="flex items-center space-x-3">
            <Checkbox
              id="other"
              checked={selectedSpecializations.includes('other')}
              onCheckedChange={(checked) =>
                handleSpecializationChange('other', checked as boolean)
              }
            />
            <Label
              htmlFor="other"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
            >
              Other
            </Label>
          </div>

          {/* Other input field */}
          {showOtherInput && (
            <div className="ml-6 mt-2">
              <Input
                placeholder="Please specify your specialization..."
                value={otherSpecialization}
                onChange={(e) => handleOtherInputChange(e.target.value)}
                className="w-full"
              />
            </div>
          )}
        </div>

        {selectedSpecializations.length > 0 && (
          <div className="mt-4 p-3 bg-muted rounded-md">
            <p className="text-sm font-medium mb-2">Selected Specializations:</p>
            <div className="flex flex-wrap gap-2">
              {selectedSpecializations.map((id) => {
                const specialization = DEFAULT_SPECIALIZATIONS.find(s => s.id === id);
                const label = specialization ? specialization.label : 
                  id === 'other' ? `Other: ${otherSpecialization}` : id;
                
                return (
                  <span
                    key={id}
                    className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary"
                  >
                    {label}
                  </span>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}