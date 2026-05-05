'use client';

import { DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components";
import { Label, Button } from "@/components";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useState } from "react";
import { requestServicesForm } from "../../app/(frontend)/dashboard/action";
import { SuccessMessage } from "./SuccessMessage";

interface RemoveMyInformationFromTheInternetProps {
    onClose?: () => void;
}

export function RemoveMyInformationFromTheInternet({ onClose }: RemoveMyInformationFromTheInternetProps) {
    const [showSuccess, setShowSuccess] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [removalUrgency, setRemovalUrgency] = useState('normal');
    const [selectedReasons, setSelectedReasons] = useState<string[]>([]);

    const removalReasons = [
        'Personal data appears in search engines',
        'Phone number, address, or email published online',
        'Old or outdated information visible',
        'Information on data broker websites',
        'Receiving spam, scam, or harassing messages',
        'Victim of doxxing (intentional exposure)',
        'Images or content shared without consent',
        'Want to reduce digital footprint',
        'Fake or impersonated profiles using my info',
        'Concerned about identity theft',
        'Old legal, academic, or employment records',
        'Protect children digital identity',
        'Clean online presence for job search',
        'Personal threats or stalking',
        'Changed lifestyle, want past content removed'
    ];

    const handleReasonChange = (reason: string, checked: boolean) => {
        setSelectedReasons(prev =>
            checked ? [...prev, reason] : prev.filter(r => r !== reason)
        );
    };

    const handleSubmit = async (formData: FormData) => {
        setIsSubmitting(true);
        try {
            formData.append('removalUrgency', removalUrgency);
            formData.append('removalReasons', JSON.stringify(selectedReasons));
            await requestServicesForm(formData);
            setShowSuccess(true);
        } catch (error) {
            console.error('Error submitting form:', error);
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
                    <DialogTitle className="text-xl font-semibold text-slate-800">
                        Information Removal
                    </DialogTitle>
                    <DialogDescription className="text-slate-600 text-sm">
                        Professional data removal from public databases and data brokers
                    </DialogDescription>
                </DialogHeader>

                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                    <p className="text-sm font-medium text-slate-700 mb-1">What to expect</p>
                    <p className="text-sm text-slate-600">
                        Removal confirmation reports, documentation, and ongoing monitoring
                    </p>
                </div>

                <div className="space-y-5">
                    <div className="space-y-4">
                        <h3 className="text-sm font-medium text-slate-800 pb-2 border-b border-slate-100">
                            Information to Remove
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="personalinfo" className="text-sm font-medium text-slate-700">
                                    Personal Information <span className="text-slate-400">*</span>
                                </Label>
                                <Textarea
                                    id="personalinfo"
                                    name="personalinfo"
                                    placeholder="List personal information to remove (name, address, phone, email, etc.)"
                                    className="min-h-[100px] resize-none border-slate-200 focus:border-slate-400 focus:ring-slate-400 rounded-lg"
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="websiteplatforms" className="text-sm font-medium text-slate-700">
                                    Specific Websites <span className="text-slate-400">(Optional)</span>
                                </Label>
                                <Textarea
                                    id="websiteplatforms"
                                    name="websiteplatforms"
                                    placeholder="List specific sites where your info appears, or leave blank for full scan"
                                    className="min-h-[100px] resize-none border-slate-200 focus:border-slate-400 focus:ring-slate-400 rounded-lg"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <h3 className="text-sm font-medium text-slate-800 pb-2 border-b border-slate-100">
                            Reason for Removal <span className="text-slate-400">*</span>
                        </h3>
                        <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-lg bg-white p-2 space-y-1">
                            {removalReasons.map((reason) => (
                                <div
                                    key={reason}
                                    onClick={() => handleReasonChange(reason, !selectedReasons.includes(reason))}
                                    className={`flex items-start gap-3 p-2 rounded-lg cursor-pointer transition-colors text-sm ${selectedReasons.includes(reason)
                                            ? 'bg-slate-100'
                                            : 'hover:bg-slate-50'
                                        }`}
                                >
                                    <Checkbox
                                        checked={selectedReasons.includes(reason)}
                                        className="mt-0.5 pointer-events-none"
                                    />
                                    <span className="text-slate-700">{reason}</span>
                                </div>
                            ))}
                        </div>
                        {selectedReasons.length === 0 && (
                            <p className="text-xs text-slate-500">Please select at least one reason</p>
                        )}
                    </div>

                    <div className="space-y-3">
                        <h3 className="text-sm font-medium text-slate-800 pb-2 border-b border-slate-100">
                            Urgency Level <span className="text-slate-400">*</span>
                        </h3>
                        <div className="space-y-2">
                            {[
                                { value: 'normal', label: 'Standard', desc: 'Within 30 days' },
                                { value: 'high', label: 'High Priority', desc: 'Within 14 days' },
                                { value: 'emergency', label: 'Emergency', desc: 'Within 3-5 business days' }
                            ].map((option) => (
                                <div
                                    key={option.value}
                                    onClick={() => setRemovalUrgency(option.value)}
                                    className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all border ${removalUrgency === option.value
                                            ? 'border-slate-600 bg-slate-50'
                                            : 'border-slate-200 bg-white hover:border-slate-400'
                                        }`}
                                >
                                    <input
                                        type="radio"
                                        name="urgency"
                                        value={option.value}
                                        checked={removalUrgency === option.value}
                                        onChange={(e) => setRemovalUrgency(e.target.value)}
                                        className="w-4 h-4 text-slate-600"
                                    />
                                    <Label className="text-sm cursor-pointer flex-1">
                                        <strong className="text-slate-800">{option.label}</strong>
                                        <span className="text-slate-600 ml-2">- {option.desc}</span>
                                    </Label>
                                </div>
                            ))}
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
                        disabled={isSubmitting || selectedReasons.length === 0}
                        className="bg-slate-800 hover:bg-slate-900 text-white"
                    >
                        {isSubmitting ? 'Submitting...' : 'Start Removal'}
                    </Button>
                </DialogFooter>
            </form>
        </div>
    );
}
