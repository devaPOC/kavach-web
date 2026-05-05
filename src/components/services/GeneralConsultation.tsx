'use client';

import { DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components";
import { Label, Input, Button } from "@/components";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { useServiceSubmission } from "@/lib/hooks/useServiceSubmission";
import { SuccessMessage } from "./SuccessMessage";

interface GeneralConsultationProps {
  onClose?: () => void;
  serviceType?: string;
}

export function GeneralConsultation({ onClose, serviceType }: GeneralConsultationProps) {
  const [showSuccess, setShowSuccess] = useState(false);

  const {
    isSubmitting,
    handleSubmitWithPricing,
  } = useServiceSubmission({
    serviceType: serviceType || 'General Consultation',
    onSuccess: () => setShowSuccess(true),
    onError: (error) => {
      console.error('Error submitting form:', error);
      alert('Submission failed: ' + error);
    }
  });

  const handleSubmit = async (formData: FormData) => {
    try {
      await handleSubmitWithPricing(formData);
    } catch (error) {
      console.error('Error submitting form:', error);
    }
  };

  if (showSuccess) {
    return <SuccessMessage onClose={() => onClose?.()} />;
  }

  return (
    <div className="w-full">
      <form action={handleSubmit} className="space-y-5">
        <DialogHeader className="space-y-2 pb-2">
          <DialogTitle className="text-xl font-semibold text-slate-800">
            Security Consultation
          </DialogTitle>
          <DialogDescription className="text-slate-600 text-sm">
            Expert cybersecurity consultation for personal and family security guidance
          </DialogDescription>
        </DialogHeader>

        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
          <p className="text-sm font-medium text-slate-700 mb-1">What to expect</p>
          <p className="text-sm text-slate-600">
            Consultation report with personalized recommendations and action plan
          </p>
        </div>

        <div className="space-y-5">
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-slate-800 pb-2 border-b border-slate-100">
              Consultation Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="consultationType" className="text-sm font-medium text-slate-700">
                  Consultation Type <span className="text-slate-400">*</span>
                </Label>
                <select
                  id="consultationType"
                  name="consultationType"
                  required
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 bg-white"
                >
                  <option value="">Select consultation type</option>
                  <option value="personal-security">Personal Security Assessment</option>
                  <option value="family-protection">Family Security Protection</option>
                  <option value="home-network">Home Network Security</option>
                  <option value="identity-protection">Identity Protection</option>
                  <option value="financial-security">Financial Security</option>
                  <option value="business-consultation">Small Business Security</option>
                  <option value="device-security">Device and Technology Security</option>
                  <option value="privacy-review">Privacy Settings Review</option>
                  <option value="threat-assessment">Threat Assessment</option>
                  <option value="security-training">Security Awareness Training</option>
                  <option value="incident-response">Incident Response Planning</option>
                  <option value="general-guidance">General Security Guidance</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="familyMembers" className="text-sm font-medium text-slate-700">
                  Family Members <span className="text-slate-400">*</span>
                </Label>
                <Input
                  id="familyMembers"
                  name="familyMembers"
                  placeholder="e.g., 2 adults, 3 children (ages 8, 12, 16)"
                  required
                  className="border-slate-200 focus:border-slate-400 focus:ring-slate-400"
                />
                <p className="text-xs text-slate-500">Include ages for age-appropriate recommendations</p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="specificQuestions" className="text-sm font-medium text-slate-700">
              Questions or Concerns <span className="text-slate-400">*</span>
            </Label>
            <Textarea
              id="specificQuestions"
              name="specificQuestions"
              placeholder="Describe your specific cybersecurity questions, concerns, or situations you need guidance on"
              className="min-h-[100px] resize-none border-slate-200 focus:border-slate-400 focus:ring-slate-400 rounded-lg"
              required
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="currentSecuritySetup" className="text-sm font-medium text-slate-700">
              Current Security Setup <span className="text-slate-400">*</span>
            </Label>
            <Textarea
              id="currentSecuritySetup"
              name="currentSecuritySetup"
              placeholder="Describe your current security measures (antivirus, password managers, 2FA usage, network setup, backup solutions)"
              className="min-h-[100px] resize-none border-slate-200 focus:border-slate-400 focus:ring-slate-400 rounded-lg"
              required
              rows={4}
            />
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-medium text-slate-800 pb-2 border-b border-slate-100">
              Technical Environment
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="devicesUsed" className="text-sm font-medium text-slate-700">
                  Devices Used <span className="text-slate-400">(Optional)</span>
                </Label>
                <Textarea
                  id="devicesUsed"
                  name="devicesUsed"
                  placeholder="List devices used by family members"
                  className="min-h-[60px] resize-none border-slate-200 focus:border-slate-400 focus:ring-slate-400 rounded-lg"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="internetUsage" className="text-sm font-medium text-slate-700">
                  Internet Usage <span className="text-slate-400">(Optional)</span>
                </Label>
                <Textarea
                  id="internetUsage"
                  name="internetUsage"
                  placeholder="Typical internet activities (banking, social media, work, etc.)"
                  className="min-h-[60px] resize-none border-slate-200 focus:border-slate-400 focus:ring-slate-400 rounded-lg"
                  rows={3}
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-medium text-slate-800 pb-2 border-b border-slate-100">
              Priority and Timeline
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="urgencyLevel" className="text-sm font-medium text-slate-700">
                  Urgency Level <span className="text-slate-400">*</span>
                </Label>
                <select
                  id="urgencyLevel"
                  name="urgencyLevel"
                  required
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 bg-white"
                >
                  <option value="">Select urgency level</option>
                  <option value="emergency">Emergency (Immediate response)</option>
                  <option value="urgent">Urgent (Within 24 hours)</option>
                  <option value="high">High Priority (Within 3 days)</option>
                  <option value="normal">Normal Priority (Within 1 week)</option>
                  <option value="low">Low Priority (Flexible timeline)</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="contactMethod" className="text-sm font-medium text-slate-700">
                  Contact Method <span className="text-slate-400">(Optional)</span>
                </Label>
                <select
                  id="contactMethod"
                  name="contactMethod"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 bg-white"
                >
                  <option value="">Select preferred method</option>
                  <option value="email">Email</option>
                  <option value="phone">Phone Call</option>
                  <option value="video">Video Conference</option>
                  <option value="chat">Live Chat</option>
                  <option value="in-person">In-Person</option>
                </select>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="additionalInfo" className="text-sm font-medium text-slate-700">
              Additional Information <span className="text-slate-400">(Optional)</span>
            </Label>
            <Textarea
              id="additionalInfo"
              name="additionalInfo"
              placeholder="Any other relevant information or special requirements"
              className="min-h-[60px] resize-none border-slate-200 focus:border-slate-400 focus:ring-slate-400 rounded-lg"
              rows={2}
            />
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
            className="bg-slate-800 hover:bg-slate-900 text-white"
          >
            {isSubmitting ? 'Submitting...' : 'Schedule Consultation'}
          </Button>
        </DialogFooter>
      </form>
    </div>
  );
}
