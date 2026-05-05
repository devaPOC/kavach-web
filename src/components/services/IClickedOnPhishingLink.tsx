'use client';

import { DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components";
import { requestServicesForm } from "../../app/(frontend)/dashboard/action";
import { Label, Button } from "@/components";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { SuccessMessage } from "./SuccessMessage";

export function IClickedOnPhishingLink({ onClose }: { onClose?: () => void }) {
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
                        Phishing Link Incident
                    </DialogTitle>
                    <DialogDescription className="text-slate-600 text-sm">
                        Report the phishing link and get immediate security assistance
                    </DialogDescription>
                </DialogHeader>

                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                    <p className="text-sm font-medium text-slate-700 mb-1">What to expect</p>
                    <p className="text-sm text-slate-600">
                        Emergency security assessment with immediate action steps and account protection measures
                    </p>
                </div>

                <div className="space-y-5">
                    <div className="space-y-2">
                        <Label htmlFor="phishinglink" className="text-sm font-medium text-slate-700">
                            Phishing Link URL <span className="text-slate-400">*</span>
                        </Label>
                        <Textarea
                            id="phishinglink"
                            name="phishinglink"
                            placeholder="Paste the suspicious link you clicked on"
                            className="min-h-[80px] resize-none border-slate-200 focus:border-slate-400 focus:ring-slate-400 rounded-lg"
                            required
                            rows={3}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="actionstaken" className="text-sm font-medium text-slate-700">
                            Information Entered <span className="text-slate-400">*</span>
                        </Label>
                        <Textarea
                            id="actionstaken"
                            name="actionstaken"
                            placeholder="Describe what information you entered (passwords, personal info, credit card details, etc.)"
                            className="min-h-[100px] resize-none border-slate-200 focus:border-slate-400 focus:ring-slate-400 rounded-lg"
                            required
                            rows={4}
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
                        {isSubmitting ? 'Submitting...' : 'Get Help Now'}
                    </Button>
                </DialogFooter>
            </form>
        </div>
    );
}
