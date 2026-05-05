'use client';

import { DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components";
import { Label, Input, Button } from "@/components";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Minus, Facebook, Instagram, Twitter, Linkedin, Music } from "lucide-react";
import { useState } from "react";
import { requestServicesForm } from "../../app/(frontend)/dashboard/action";
import { SuccessMessage } from "./SuccessMessage";

interface ScanMySocialMediaForPrivacyRisksProps {
    onClose?: () => void;
}

export function ScanMySocialMediaForPrivacyRisks({ onClose }: ScanMySocialMediaForPrivacyRisksProps) {
    const [showSuccess, setShowSuccess] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
    const [profileUrls, setProfileUrls] = useState<string[]>(['']);
    const [selectedSecurityConcerns, setSelectedSecurityConcerns] = useState<string[]>([]);

    const platforms = [
        { id: 'Facebook', label: 'Facebook', icon: Facebook },
        { id: 'Instagram', label: 'Instagram', icon: Instagram },
        { id: 'Twitter', label: 'X (Twitter)', icon: Twitter },
        { id: 'LinkedIn', label: 'LinkedIn', icon: Linkedin },
        { id: 'TikTok', label: 'TikTok', icon: Music }
    ];

    const securityConcerns = [
        'Exposure of Personal Information',
        'Public Visibility of Private Content',
        'Tagged Posts and Location Sharing',
        'Over-Sharing of Daily Activities',
        'Friend List and Network Privacy',
        'Unauthorized App or Third-Party Access',
        'Impersonation or Fake Profiles',
        'Phishing or Suspicious Messages',
        'Facial Recognition and Photo Tagging',
        'Risky Posts from the Past',
        'Data Sharing with Advertisers',
        'Weak Password or Missing 2FA',
        'Profile Cloning or Account Hijacking',
        'Search Engine Visibility',
        'Children Information on Profile'
    ];

    const handleSubmit = async (formData: FormData) => {
        setIsSubmitting(true);
        try {
            const validUrls = profileUrls.filter(url => url.trim() !== '');
            formData.append('platforms', JSON.stringify(selectedPlatforms));
            formData.append('profileUrls', JSON.stringify(validUrls));
            formData.append('securityConcerns', JSON.stringify(selectedSecurityConcerns));
            await requestServicesForm(formData);
            setShowSuccess(true);
        } catch (error) {
            console.error('Error submitting form:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handlePlatformChange = (platformId: string, checked: boolean) => {
        setSelectedPlatforms(prev =>
            checked ? [...prev, platformId] : prev.filter(id => id !== platformId)
        );
    };

    const handleUrlChange = (index: number, value: string) => {
        const newUrls = [...profileUrls];
        newUrls[index] = value;
        setProfileUrls(newUrls);
    };

    const addUrlField = () => setProfileUrls([...profileUrls, '']);

    const removeUrlField = (index: number) => {
        if (profileUrls.length > 1) {
            setProfileUrls(profileUrls.filter((_, i) => i !== index));
        }
    };

    const handleSecurityConcernChange = (concern: string, checked: boolean) => {
        setSelectedSecurityConcerns(prev =>
            checked ? [...prev, concern] : prev.filter(c => c !== concern)
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
                        Social Media Privacy Scan
                    </DialogTitle>
                    <DialogDescription className="text-slate-600 text-sm">
                        Complete privacy assessment of your social media accounts
                    </DialogDescription>
                </DialogHeader>

                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                    <p className="text-sm font-medium text-slate-700 mb-1">What to expect</p>
                    <p className="text-sm text-slate-600">
                        Comprehensive privacy risk assessment with actionable recommendations
                    </p>
                </div>

                <div className="space-y-5">
                    <div className="space-y-3">
                        <h3 className="text-sm font-medium text-slate-800 pb-2 border-b border-slate-100">
                            Platforms to Scan <span className="text-slate-400">*</span>
                        </h3>
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                            {platforms.map((platform) => (
                                <div
                                    key={platform.id}
                                    onClick={() => handlePlatformChange(platform.id, !selectedPlatforms.includes(platform.id))}
                                    className={`flex items-center gap-2 p-2.5 border rounded-lg cursor-pointer transition-all text-sm ${selectedPlatforms.includes(platform.id)
                                            ? 'border-slate-600 bg-slate-700 text-white'
                                            : 'border-slate-200 bg-white text-slate-700 hover:border-slate-400'
                                        }`}
                                >
                                    <Checkbox
                                        checked={selectedPlatforms.includes(platform.id)}
                                        className="pointer-events-none"
                                    />
                                    <platform.icon className="w-4 h-4" />
                                    <span className="text-xs font-medium">{platform.label}</span>
                                </div>
                            ))}
                        </div>
                        {selectedPlatforms.length === 0 && (
                            <p className="text-xs text-slate-500">Please select at least one platform</p>
                        )}
                    </div>

                    <div className="space-y-3">
                        <h3 className="text-sm font-medium text-slate-800 pb-2 border-b border-slate-100">
                            Profile URLs <span className="text-slate-400">*</span>
                        </h3>
                        <div className="space-y-2">
                            {profileUrls.map((url, index) => (
                                <div key={index} className="flex gap-2 items-center">
                                    <Input
                                        type="url"
                                        value={url}
                                        onChange={(e) => handleUrlChange(index, e.target.value)}
                                        placeholder="https://facebook.com/yourprofile"
                                        className="flex-1 border-slate-200 focus:border-slate-400"
                                        required={index === 0}
                                    />
                                    {profileUrls.length > 1 && (
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="icon"
                                            onClick={() => removeUrlField(index)}
                                            className="h-10 w-10 border-slate-200 text-slate-500"
                                        >
                                            <Minus className="w-4 h-4" />
                                        </Button>
                                    )}
                                </div>
                            ))}
                            <Button
                                type="button"
                                variant="outline"
                                onClick={addUrlField}
                                className="w-full border-dashed border-slate-300 text-slate-600 hover:border-slate-400"
                            >
                                <Plus className="w-4 h-4 mr-2" />
                                Add Another URL
                            </Button>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <h3 className="text-sm font-medium text-slate-800 pb-2 border-b border-slate-100">
                            Specific Concerns <span className="text-slate-400">(Optional)</span>
                        </h3>
                        <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-lg bg-white p-2 space-y-1">
                            {securityConcerns.map((concern) => (
                                <div
                                    key={concern}
                                    onClick={() => handleSecurityConcernChange(concern, !selectedSecurityConcerns.includes(concern))}
                                    className={`flex items-start gap-3 p-2 rounded-lg cursor-pointer transition-colors text-sm ${selectedSecurityConcerns.includes(concern)
                                            ? 'bg-slate-100'
                                            : 'hover:bg-slate-50'
                                        }`}
                                >
                                    <Checkbox
                                        checked={selectedSecurityConcerns.includes(concern)}
                                        className="mt-0.5 pointer-events-none"
                                    />
                                    <span className="text-slate-700">{concern}</span>
                                </div>
                            ))}
                        </div>
                        {selectedSecurityConcerns.length > 0 && (
                            <p className="text-xs text-slate-500">
                                {selectedSecurityConcerns.length} concern{selectedSecurityConcerns.length > 1 ? 's' : ''} selected
                            </p>
                        )}
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
                        disabled={isSubmitting || selectedPlatforms.length === 0 || profileUrls.filter(url => url.trim()).length === 0}
                        className="bg-slate-800 hover:bg-slate-900 text-white"
                    >
                        {isSubmitting ? 'Submitting...' : 'Start Privacy Scan'}
                    </Button>
                </DialogFooter>
            </form>
        </div>
    );
}
