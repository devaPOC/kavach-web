'use client';

import { DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components";
import { requestServicesForm } from "../../app/(frontend)/dashboard/action";
import { Label, Input, Button, PhoneInput } from "@/components";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useState } from "react";
import { SuccessMessage } from "./SuccessMessage";

interface CybersecurityBodyguardProps {
  onClose?: () => void;
}

export function CybersecurityBodyguard({ onClose }: CybersecurityBodyguardProps) {
  const [showSuccess, setShowSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedAssets, setSelectedAssets] = useState<string[]>([]);

  const assetTypes = [
    { id: 'personal-devices', label: 'Personal Devices' },
    { id: 'financial-accounts', label: 'Financial Accounts' },
    { id: 'business-systems', label: 'Business Systems' },
    { id: 'social-media', label: 'Social Media' },
    { id: 'email-accounts', label: 'Email Accounts' },
    { id: 'cloud-storage', label: 'Cloud Storage' },
    { id: 'home-network', label: 'Home Network' },
    { id: 'identity-docs', label: 'Identity Documents' },
    { id: 'crypto-wallets', label: 'Crypto Wallets' },
    { id: 'smart-home', label: 'Smart Home Devices' }
  ];

  const handleSubmit = async (formData: FormData) => {
    setIsSubmitting(true);
    try {
      formData.append('selectedAssets', JSON.stringify(selectedAssets));
      await requestServicesForm(formData);
      setShowSuccess(true);
    } catch (error) {
      console.error('Error submitting form:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAssetChange = (assetId: string, checked: boolean) => {
    setSelectedAssets(prev =>
      checked ? [...prev, assetId] : prev.filter(id => id !== assetId)
    );
  };

  if (showSuccess) {
    return <SuccessMessage onClose={() => onClose?.()} />;
  }

  return (
    <div className="w-full">
      <form action={handleSubmit} className="space-y-5">
        <DialogHeader className="space-y-2 pb-2">
          <DialogTitle className="text-xl font-semibold text-slate-800">
            Cybersecurity Bodyguard
          </DialogTitle>
          <DialogDescription className="text-slate-600 text-sm">
            24/7 personal cybersecurity protection with dedicated expert monitoring
          </DialogDescription>
        </DialogHeader>

        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
          <p className="text-sm font-medium text-slate-700 mb-1">What to expect</p>
          <p className="text-sm text-slate-600">
            Personal security monitoring dashboard and dedicated support team assignment
          </p>
        </div>

        <div className="space-y-5">
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-slate-800 pb-2 border-b border-slate-100">
              Protection Level
            </h3>
            <div className="space-y-2">
              <Label htmlFor="protectionLevel" className="text-sm font-medium text-slate-700">
                Select Level <span className="text-slate-400">*</span>
              </Label>
              <select
                id="protectionLevel"
                name="protectionLevel"
                required
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 bg-white"
              >
                <option value="">Select protection level</option>
                <option value="premium">Premium - Basic 24/7 monitoring and alerts</option>
                <option value="executive">Executive - Enhanced monitoring with priority response</option>
                <option value="vip">VIP - Comprehensive protection with dedicated analyst</option>
                <option value="enterprise">Enterprise - Full organizational protection suite</option>
                <option value="celebrity">Public Figure - Maximum privacy and threat protection</option>
                <option value="custom">Custom - Tailored protection package</option>
              </select>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-medium text-slate-800 pb-2 border-b border-slate-100">
              Assets to Monitor <span className="text-slate-400">*</span>
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
              {assetTypes.map((asset) => (
                <div
                  key={asset.id}
                  onClick={() => handleAssetChange(asset.id, !selectedAssets.includes(asset.id))}
                  className={`flex items-center gap-2 p-2.5 border rounded-lg cursor-pointer transition-all text-sm ${selectedAssets.includes(asset.id)
                      ? 'border-slate-600 bg-slate-700 text-white'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-slate-400'
                    }`}
                >
                  <Checkbox
                    checked={selectedAssets.includes(asset.id)}
                    className="pointer-events-none"
                  />
                  <span className="text-xs font-medium">{asset.label}</span>
                </div>
              ))}
            </div>
            {selectedAssets.length === 0 && (
              <p className="text-xs text-slate-500">Please select at least one asset type</p>
            )}

            <div className="space-y-2 mt-4">
              <Label htmlFor="assetDetails" className="text-sm font-medium text-slate-700">
                Asset Details <span className="text-slate-400">*</span>
              </Label>
              <Textarea
                id="assetDetails"
                name="assetDetails"
                placeholder="Provide details about your assets: number of devices, critical systems, important accounts, specific concerns..."
                className="min-h-[80px] resize-none border-slate-200 focus:border-slate-400 focus:ring-slate-400 rounded-lg"
                required
                rows={4}
              />
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-medium text-slate-800 pb-2 border-b border-slate-100">
              Contact Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="primaryPhone" className="text-sm font-medium text-slate-700">
                  Primary Phone <span className="text-slate-400">*</span>
                </Label>
                <PhoneInput
                  id="primaryPhone"
                  name="primaryPhone"
                  placeholder="Enter phone number"
                  required
                  defaultCountry="US"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="primaryEmail" className="text-sm font-medium text-slate-700">
                  Primary Email <span className="text-slate-400">*</span>
                </Label>
                <Input
                  id="primaryEmail"
                  name="primaryEmail"
                  type="email"
                  placeholder="your.email@example.com"
                  required
                  className="border-slate-200 focus:border-slate-400 focus:ring-slate-400"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="timezone" className="text-sm font-medium text-slate-700">
                  Time Zone <span className="text-slate-400">*</span>
                </Label>
                <Input
                  id="timezone"
                  name="timezone"
                  placeholder="e.g., EST, PST, GMT+2"
                  required
                  className="border-slate-200 focus:border-slate-400 focus:ring-slate-400"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="preferredContactMethod" className="text-sm font-medium text-slate-700">
                  Alert Method <span className="text-slate-400">*</span>
                </Label>
                <select
                  id="preferredContactMethod"
                  name="preferredContactMethod"
                  required
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 bg-white"
                >
                  <option value="">Select method</option>
                  <option value="phone-call">Phone Call</option>
                  <option value="sms">SMS Text</option>
                  <option value="email">Email</option>
                  <option value="app-push">Mobile App Push</option>
                  <option value="all">All Methods</option>
                </select>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-medium text-slate-800 pb-2 border-b border-slate-100">
              Emergency Contact
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="emergencyName1" className="text-sm font-medium text-slate-700">
                  Name <span className="text-slate-400">*</span>
                </Label>
                <Input
                  id="emergencyName1"
                  name="emergencyName1"
                  placeholder="Full name"
                  required
                  className="border-slate-200 focus:border-slate-400 focus:ring-slate-400"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="emergencyRelation1" className="text-sm font-medium text-slate-700">
                  Relationship <span className="text-slate-400">*</span>
                </Label>
                <Input
                  id="emergencyRelation1"
                  name="emergencyRelation1"
                  placeholder="e.g., Spouse, IT Manager"
                  required
                  className="border-slate-200 focus:border-slate-400 focus:ring-slate-400"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="emergencyPhone1" className="text-sm font-medium text-slate-700">
                  Phone <span className="text-slate-400">*</span>
                </Label>
                <PhoneInput
                  id="emergencyPhone1"
                  name="emergencyPhone1"
                  placeholder="Enter phone"
                  required
                  defaultCountry="US"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="securityPreferences" className="text-sm font-medium text-slate-700">
              Security Preferences <span className="text-slate-400">*</span>
            </Label>
            <Textarea
              id="securityPreferences"
              name="securityPreferences"
              placeholder="Describe your preferences: response protocols, privacy concerns, compliance requirements, tools you currently use..."
              className="min-h-[80px] resize-none border-slate-200 focus:border-slate-400 focus:ring-slate-400 rounded-lg"
              required
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="additionalRequirements" className="text-sm font-medium text-slate-700">
              Additional Requirements <span className="text-slate-400">(Optional)</span>
            </Label>
            <Textarea
              id="additionalRequirements"
              name="additionalRequirements"
              placeholder="Any special circumstances or specific needs"
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
            disabled={isSubmitting || selectedAssets.length === 0}
            className="bg-slate-800 hover:bg-slate-900 text-white"
          >
            {isSubmitting ? 'Submitting...' : 'Activate Protection'}
          </Button>
        </DialogFooter>
      </form>
    </div>
  );
}
