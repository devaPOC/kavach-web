'use client';

import { DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components";
import { requestServicesForm } from "../../app/(frontend)/dashboard/action";
import { Label, Input, Button } from "@/components";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { SuccessMessage } from "./SuccessMessage";

export function FixMyLaptopOrSmartphoneAndMakeMyDeviceRunFaster({ onClose }: { onClose?: () => void }) {
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
                        Device Performance Optimization
                    </DialogTitle>
                    <DialogDescription className="text-slate-600 text-sm">
                        Optimize device performance, resolve issues, and enhance system speed
                    </DialogDescription>
                </DialogHeader>

                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                    <p className="text-sm font-medium text-slate-700 mb-1">What to expect</p>
                    <p className="text-sm text-slate-600">
                        Comprehensive device optimization report with performance improvements and troubleshooting solutions
                    </p>
                </div>

                <div className="space-y-5">
                    <div className="space-y-4">
                        <h3 className="text-sm font-medium text-slate-800 pb-2 border-b border-slate-100">
                            Device Information
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
                                    <option value="laptop">Laptop</option>
                                    <option value="smartphone">Smartphone</option>
                                    <option value="tablet">Tablet</option>
                                    <option value="desktop">Desktop Computer</option>
                                </select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="operatingsystem" className="text-sm font-medium text-slate-700">
                                    Operating System <span className="text-slate-400">*</span>
                                </Label>
                                <Input
                                    id="operatingsystem"
                                    name="operatingsystem"
                                    placeholder="e.g., Windows 11, macOS, Android 14"
                                    required
                                    className="border-slate-200 focus:border-slate-400 focus:ring-slate-400"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="issues" className="text-sm font-medium text-slate-700">
                            Current Issues <span className="text-slate-400">*</span>
                        </Label>
                        <Textarea
                            id="issues"
                            name="issues"
                            placeholder="Describe the performance issues you're experiencing (slow startup, freezing, crashes, overheating, etc.)"
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
                        {isSubmitting ? 'Submitting...' : 'Optimize Device'}
                    </Button>
                </DialogFooter>
            </form>
        </div>
    );
}
