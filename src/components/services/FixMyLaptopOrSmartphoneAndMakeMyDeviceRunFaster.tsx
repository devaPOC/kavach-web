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
                    <DialogTitle className="text-xl font-semibold text-foreground">
                        Device Performance Optimization
                    </DialogTitle>
                    <DialogDescription className="text-muted-foreground text-sm">
                        Optimize device performance, resolve issues, and enhance system speed
                    </DialogDescription>
                </DialogHeader>

                <div className="bg-muted/50 border border-border rounded-lg p-4">
                    <p className="text-sm font-medium text-foreground/80 mb-1">What to expect</p>
                    <p className="text-sm text-muted-foreground">
                        Comprehensive device optimization report with performance improvements and troubleshooting solutions
                    </p>
                </div>

                <div className="space-y-5">
                    <div className="space-y-4">
                        <h3 className="text-sm font-medium text-foreground pb-2 border-b border-border/50">
                            Device Information
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="devicetype" className="text-sm font-medium text-foreground/80">
                                    Device Type <span className="text-muted-foreground/80">*</span>
                                </Label>
                                <select
                                    id="devicetype"
                                    name="devicetype"
                                    required
                                    className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-border/80 focus:ring-1 focus:ring-ring bg-card"
                                >
                                    <option value="">Select device type</option>
                                    <option value="laptop">Laptop</option>
                                    <option value="smartphone">Smartphone</option>
                                    <option value="tablet">Tablet</option>
                                    <option value="desktop">Desktop Computer</option>
                                </select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="operatingsystem" className="text-sm font-medium text-foreground/80">
                                    Operating System <span className="text-muted-foreground/80">*</span>
                                </Label>
                                <Input
                                    id="operatingsystem"
                                    name="operatingsystem"
                                    placeholder="e.g., Windows 11, macOS, Android 14"
                                    required
                                    className="border-border focus:border-border/80 focus:ring-ring"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="issues" className="text-sm font-medium text-foreground/80">
                            Current Issues <span className="text-muted-foreground/80">*</span>
                        </Label>
                        <Textarea
                            id="issues"
                            name="issues"
                            placeholder="Describe the performance issues you're experiencing (slow startup, freezing, crashes, overheating, etc.)"
                            className="min-h-[100px] resize-none border-border focus:border-border/80 focus:ring-ring rounded-lg"
                            required
                            rows={4}
                        />
                    </div>
                </div>

                <DialogFooter className="pt-4 border-t border-border/50 flex gap-3">
                    <DialogClose asChild>
                        <Button
                            variant="outline"
                            type="button"
                            className="border-border text-muted-foreground hover:bg-muted/50"
                        >
                            Cancel
                        </Button>
                    </DialogClose>
                    <Button
                        type="submit"
                        disabled={isSubmitting}
                        className="bg-secondary hover:bg-primary text-white"
                    >
                        {isSubmitting ? 'Submitting...' : 'Optimize Device'}
                    </Button>
                </DialogFooter>
            </form>
        </div>
    );
}
