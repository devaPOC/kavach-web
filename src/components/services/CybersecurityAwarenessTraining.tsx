'use client';

import { DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components";
import { Label, Input, Button } from "@/components";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { SuccessMessage } from "./SuccessMessage";

interface CybersecurityAwarenessTrainingProps {
  onClose?: () => void;
  serviceType?: string;
}

export function CybersecurityAwarenessTraining({ onClose, serviceType }: CybersecurityAwarenessTrainingProps) {
  const [showSuccess, setShowSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (formData: FormData) => {
    setIsSubmitting(true);
    try {
      // Extract and format data to match CreateAwarenessSessionData schema
      const sessionDate = formData.get('preferredDate') as string;
      const sessionTime = formData.get('preferredTime') as string;
      // Combine date and time
      const dateTime = new Date(`${sessionDate}T${sessionTime}`).toISOString();

      const audienceNumberRaw = formData.get('audienceNumber') as string;
      // Parse audience number from range or direct value.
      // If scalar, parse int. If range "1-5", take upper bound 5.
      let audienceSize = 0;
      if (audienceNumberRaw && audienceNumberRaw.includes('-')) {
        const parts = audienceNumberRaw.split('-');
        audienceSize = parseInt(parts[1], 10);
      } else if (audienceNumberRaw && audienceNumberRaw.includes('+')) {
        audienceSize = parseInt(audienceNumberRaw.replace('+', ''), 10);
      } else if (audienceNumberRaw) {
        audienceSize = parseInt(audienceNumberRaw, 10);
      } else {
        audienceSize = 10; // Default
      }

      // Map duration to allowed values
      let duration = formData.get('trainingDuration') as string;
      // Map old values to new schema if necessary, otherwise pass through
      const durationMap: Record<string, string> = {
        '30-minutes': '1_hour', // Fallback to minimum
        '1-hour': '1_hour',
        '2-hours': '2_hours',
        'half-day': 'half_day',
        'full-day': 'full_day',
        'multi-day': 'full_day', // Fallback
        'ongoing': 'full_day'    // Fallback
      };
      if (durationMap[duration]) {
        duration = durationMap[duration];
      }

      // Determine session mode from location selection
      const locationType = formData.get('awarenessPlace') as string;
      const sessionMode = (locationType === 'online-virtual' || locationType === 'hybrid') ? 'online' : 'on_site';

      // Map Audience Type (Single select to Array)
      const audienceTypeRaw = formData.get('audienceType') as string;
      const audienceTypeMap: Record<string, string> = {
        'non-technical': 'corporate_staff',
        'technical': 'corporate_staff',
        'executive': 'corporate_staff',
        'board': 'corporate_staff',
        'mixed': 'mixed',
        'students': 'students',
        'healthcare': 'corporate_staff',
        'finance': 'corporate_staff',
        'government': 'corporate_staff',
        'retail': 'corporate_staff'
      };
      const audienceType = audienceTypeMap[audienceTypeRaw] || 'mixed';


      const requestData = {
        sessionDate: dateTime,
        location: locationType, // Keep the descriptive value
        duration: duration,
        subject: formData.get('awarenessSubject') as string || 'General Awareness',
        audienceSize: audienceSize || 10,
        audienceTypes: [audienceType],
        sessionMode: sessionMode,
        specialRequirements: (formData.get('trainingObjectives') as string) + '\n\n' + (formData.get('additionalRequirements') as string),
        organizationName: formData.get('organizationName') as string,
        contactEmail: formData.get('contactEmail') as string,
        contactPhone: formData.get('contactPhone') as string,
      };

      console.log('Validating/Submitting Awareness Session:', requestData);

      const response = await fetch('/api/v1/awareness-sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      const result = await response.json();

      if (result.success) {
        setShowSuccess(true);
      } else {
        throw new Error(result.message || result.error || 'Failed to submit request');
      }

    } catch (error: any) {
      console.error('Error submitting form:', error);
      alert('Submission failed: ' + (error.message || error));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (showSuccess) {
    return <SuccessMessage onClose={() => onClose?.()} />;
  }

  return (
    <div className="w-full">
      <form action={handleSubmit} className="space-y-5">
        <DialogHeader className="space-y-2 pb-2">
          <DialogTitle className="text-xl font-semibold text-slate-900">
            Security Awareness Training
          </DialogTitle>
          <DialogDescription className="text-slate-600 text-sm">
            Professional cybersecurity awareness training tailored to your audience
          </DialogDescription>
        </DialogHeader>

        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
          <p className="text-sm font-medium text-slate-700 mb-1">What to expect</p>
          <p className="text-sm text-slate-600">
            Comprehensive training session with materials, assessments, and ongoing support
          </p>
        </div>

        <div className="space-y-5">
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-slate-900 pb-2 border-b border-slate-100">
              Training Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="awarenessSubject" className="text-sm font-medium text-slate-700">
                  Subject <span className="text-slate-400">*</span>
                </Label>
                <select
                  id="awarenessSubject"
                  name="awarenessSubject"
                  required
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-white text-slate-700"
                >
                  <option value="">Select awareness subject</option>
                  <option value="Phishing and Social Engineering">Phishing and Social Engineering</option>
                  <option value="Password Security and Authentication">Password Security and Authentication</option>
                  <option value="Data Protection and Privacy">Data Protection and Privacy</option>
                  <option value="Safe Internet Browsing">Safe Internet Browsing</option>
                  <option value="General Cybersecurity Awareness">General Cybersecurity Awareness</option>
                  <option value="Compliance and Regulatory Training">Compliance and Regulatory Training</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="awarenessPlace" className="text-sm font-medium text-slate-700">
                  Location <span className="text-slate-400">*</span>
                </Label>
                <select
                  id="awarenessPlace"
                  name="awarenessPlace"
                  required
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-white text-slate-700"
                >
                  <option value="">Select training location</option>
                  <option value="online-virtual">Online/Virtual Session</option>
                  <option value="on-site-office">On-site at Office</option>
                  <option value="training-center">Training Center</option>
                  <option value="hybrid">Hybrid (Online + In-Person)</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="audienceNumber" className="text-sm font-medium text-slate-700">
                  Number of Attendees <span className="text-slate-400">*</span>
                </Label>
                <select
                  id="audienceNumber"
                  name="audienceNumber"
                  required
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-white text-slate-700"
                >
                  <option value="">Select number of attendees</option>
                  <option value="1-5">1-5 people</option>
                  <option value="6-15">6-15 people</option>
                  <option value="16-30">16-30 people</option>
                  <option value="31-50">31-50 people</option>
                  <option value="51-100">51-100 people</option>
                  <option value="101-250">101-250 people</option>
                  <option value="251-500">251-500 people</option>
                  <option value="500+">500+ people</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="audienceType" className="text-sm font-medium text-slate-700">
                  Audience Type <span className="text-slate-400">*</span>
                </Label>
                <select
                  id="audienceType"
                  name="audienceType"
                  required
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-white text-slate-700"
                >
                  <option value="">Select audience type</option>
                  <option value="non-technical">Non-Technical Users</option>
                  <option value="technical">Technical/IT Staff</option>
                  <option value="executive">Management/Leadership</option>
                  <option value="mixed">Mixed Audience</option>
                  <option value="students">Students/Educational</option>
                </select>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-medium text-slate-900 pb-2 border-b border-slate-100">
              Scheduling
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="preferredDate" className="text-sm font-medium text-slate-700">
                  Date <span className="text-slate-400">*</span>
                </Label>
                <Input
                  type="date"
                  id="preferredDate"
                  name="preferredDate"
                  required
                  min={new Date().toISOString().split('T')[0]}
                  className="border-slate-200 focus:border-indigo-500 focus:ring-indigo-500 rounded-lg"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="preferredTime" className="text-sm font-medium text-slate-700">
                  Time <span className="text-slate-400">*</span>
                </Label>
                <Input
                  type="time"
                  id="preferredTime"
                  name="preferredTime"
                  required
                  className="border-slate-200 focus:border-indigo-500 focus:ring-indigo-500 rounded-lg"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="trainingDuration" className="text-sm font-medium text-slate-700">
                  Duration <span className="text-slate-400">*</span>
                </Label>
                <select
                  id="trainingDuration"
                  name="trainingDuration"
                  required
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-white text-slate-700"
                >
                  <option value="">Select duration</option>
                  <option value="1-hour">1 hour</option>
                  <option value="2-hours">2 hours</option>
                  <option value="half-day">Half Day (4 hours)</option>
                  <option value="full-day">Full Day (8 hours)</option>
                </select>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="trainingObjectives" className="text-sm font-medium text-slate-700">
              Training Objectives <span className="text-slate-400">*</span>
            </Label>
            <Textarea
              id="trainingObjectives"
              name="trainingObjectives"
              placeholder="Describe the specific goals and learning outcomes you want to achieve"
              className="min-h-[80px] resize-none border-slate-200 focus:border-indigo-500 focus:ring-indigo-500 rounded-lg"
              rows={3}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="additionalRequirements" className="text-sm font-medium text-slate-700">
              Additional Requirements <span className="text-slate-400">(Optional)</span>
            </Label>
            <Textarea
              id="additionalRequirements"
              name="additionalRequirements"
              placeholder="Special requirements, equipment needs, or accessibility considerations"
              className="min-h-[60px] resize-none border-slate-200 focus:border-indigo-500 focus:ring-indigo-500 rounded-lg"
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-medium text-slate-900 pb-2 border-b border-slate-100">
              Contact Information
            </h3>
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label htmlFor="organizationName" className="text-sm font-medium text-slate-700">
                  Organization Name <span className="text-slate-400">*</span>
                </Label>
                <Input
                  id="organizationName"
                  name="organizationName"
                  required
                  placeholder="Company or Organization Name"
                  className="border-slate-200 focus:border-indigo-500 focus:ring-indigo-500 rounded-lg"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contactEmail" className="text-sm font-medium text-slate-700">
                    Contact Email <span className="text-slate-400">*</span>
                  </Label>
                  <Input
                    id="contactEmail"
                    name="contactEmail"
                    type="email"
                    required
                    placeholder="email@example.com"
                    className="border-slate-200 focus:border-indigo-500 focus:ring-indigo-500 rounded-lg"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contactPhone" className="text-sm font-medium text-slate-700">
                    Contact Phone <span className="text-slate-400">*</span>
                  </Label>
                  <Input
                    id="contactPhone"
                    name="contactPhone"
                    type="tel"
                    required
                    placeholder="+1 (555) 000-0000"
                    className="border-slate-200 focus:border-indigo-500 focus:ring-indigo-500 rounded-lg"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="pt-4 border-t border-slate-100 flex gap-3">
          <DialogClose asChild>
            <Button
              variant="outline"
              type="button"
              className="border-slate-200 text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </Button>
          </DialogClose>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
          >
            {isSubmitting ? 'Submitting...' : 'Schedule Training'}
          </Button>
        </DialogFooter>
      </form>
    </div>
  );
}
