'use client';

import { DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components";
import { requestServicesForm } from "../../app/(frontend)/dashboard/action";
import { Label, Input, Button } from "@/components";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { SuccessMessage } from "./SuccessMessage";

export function RecoverMyLostData({ onClose }: { onClose?: () => void }) {
    const [showSuccess, setShowSuccess] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (formData: FormData) => {
        setIsSubmitting(true);
        try {
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
                        Data Recovery
                    </DialogTitle>
                    <DialogDescription className="text-slate-600 text-sm">
                        Professional data recovery for deleted, corrupted, or inaccessible files
                    </DialogDescription>
                </DialogHeader>

                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                    <p className="text-sm font-medium text-slate-700 mb-1">What to expect</p>
                    <p className="text-sm text-slate-600">
                        Data recovery assessment with recovery options, success probability, and step-by-step guidance
                    </p>
                </div>

                <div className="space-y-5">
                    <div className="space-y-4">
                        <h3 className="text-sm font-medium text-slate-800 pb-2 border-b border-slate-100">
                            Data Loss Information
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="losstype" className="text-sm font-medium text-slate-700">
                                    Type of Data Loss <span className="text-slate-400">*</span>
                                </Label>
                                <select
                                    id="losstype"
                                    name="losstype"
                                    required
                                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 bg-white"
                                >
                                    <option value="">Select loss type</option>
                                    <option value="accidental-deletion">Accidental Deletion</option>
                                    <option value="hard-drive-failure">Hard Drive Failure</option>
                                    <option value="corruption">File Corruption</option>
                                    <option value="ransomware">Ransomware Attack</option>
                                    <option value="format">Accidental Format</option>
                                    <option value="physical-damage">Physical Damage</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="datatype" className="text-sm font-medium text-slate-700">
                                    Type of Data Lost <span className="text-slate-400">*</span>
                                </Label>
                                <select
                                    id="datatype"
                                    name="datatype"
                                    required
                                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 bg-white"
                                >
                                    <option value="">Select data type</option>
                                    <option value="documents">Documents</option>
                                    <option value="photos">Photos</option>
                                    <option value="videos">Videos</option>
                                    <option value="emails">Emails</option>
                                    <option value="database">Database</option>
                                    <option value="system-files">System Files</option>
                                    <option value="mixed">Mixed Files</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h3 className="text-sm font-medium text-slate-800 pb-2 border-b border-slate-100">
                            Storage Device
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="devicetype" className="text-sm font-medium text-slate-700">
                                    Device Type <span className="text-slate-400">*</span>
                                </Label>
                                <select
                                    id="devicetype"
                                    name="devicetype"
                                    required
                                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 bg-white"
                                >
                                    <option value="">Select device type</option>
                                    <option value="internal-hdd">Internal Hard Drive</option>
                                    <option value="internal-ssd">Internal SSD</option>
                                    <option value="external-hdd">External Hard Drive</option>
                                    <option value="usb-drive">USB Flash Drive</option>
                                    <option value="sd-card">SD Card</option>
                                    <option value="smartphone">Smartphone</option>
                                    <option value="raid">RAID Array</option>
                                    <option value="cloud">Cloud Storage</option>
                                </select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="operatingsystem" className="text-sm font-medium text-slate-700">
                                    Operating System <span className="text-slate-400">*</span>
                                </Label>
                                <Input
                                    id="operatingsystem"
                                    name="operatingsystem"
                                    placeholder="e.g., Windows 11, macOS, Linux"
                                    required
                                    className="border-slate-200 focus:border-slate-400 focus:ring-slate-400"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="incident" className="text-sm font-medium text-slate-700">
                            What Happened <span className="text-slate-400">*</span>
                        </Label>
                        <Textarea
                            id="incident"
                            name="incident"
                            placeholder="Provide details about how the data was lost, when it happened, and any error messages"
                            className="min-h-[100px] resize-none border-slate-200 focus:border-slate-400 focus:ring-slate-400 rounded-lg"
                            required
                            rows={5}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="recoveryattempts" className="text-sm font-medium text-slate-700">
                            Recovery Attempts <span className="text-slate-400">(Optional)</span>
                        </Label>
                        <Textarea
                            id="recoveryattempts"
                            name="recoveryattempts"
                            placeholder="Describe any recovery attempts you've already made"
                            className="min-h-[60px] resize-none border-slate-200 focus:border-slate-400 focus:ring-slate-400 rounded-lg"
                            rows={3}
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
                        {isSubmitting ? 'Submitting...' : 'Start Recovery'}
                    </Button>
                </DialogFooter>
            </form>
        </div>
    );
}
