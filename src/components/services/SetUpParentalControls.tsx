'use client';

import { DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components";
import { requestServicesForm } from "../../app/(frontend)/dashboard/action";
import { Label, Input, Button } from "@/components";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { SuccessMessage } from "./SuccessMessage";

export function SetUpParentalControls({ onClose }: { onClose?: () => void }) {
    const [showSuccess, setShowSuccess] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [selectedDevices, setSelectedDevices] = useState<string[]>([]);

    const deviceTypes = [
        { id: 'windows', label: 'Windows Computer' },
        { id: 'mac', label: 'Mac Computer' },
        { id: 'iphone', label: 'iPhone' },
        { id: 'android', label: 'Android Phone' },
        { id: 'ipad', label: 'iPad' },
        { id: 'tablet', label: 'Android Tablet' },
        { id: 'gaming', label: 'Gaming Console' },
        { id: 'router', label: 'Router/Network' },
        { id: 'smart-tv', label: 'Smart TV' },
        { id: 'other', label: 'Other Device' }
    ];

    const handleDeviceToggle = (deviceId: string) => {
        setSelectedDevices(prev =>
            prev.includes(deviceId)
                ? prev.filter(id => id !== deviceId)
                : [...prev, deviceId]
        );
    };

    const handleSubmit = async (formData: FormData) => {
        setIsSubmitting(true);
        try {
            formData.append('devices', selectedDevices.join(', '));
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
                        Parental Controls Setup
                    </DialogTitle>
                    <DialogDescription className="text-muted-foreground text-sm">
                        Configure comprehensive parental controls and digital safety measures
                    </DialogDescription>
                </DialogHeader>

                <div className="bg-muted/50 border border-border rounded-lg p-4">
                    <p className="text-sm font-medium text-foreground/80 mb-1">What to expect</p>
                    <p className="text-sm text-muted-foreground">
                        Complete setup guide with device-specific instructions and monitoring recommendations
                    </p>
                </div>

                <div className="space-y-5">
                    <div className="space-y-4">
                        <h3 className="text-sm font-medium text-foreground pb-2 border-b border-border/50">
                            Child Information
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="childage" className="text-sm font-medium text-foreground/80">
                                    Age Range <span className="text-muted-foreground/80">*</span>
                                </Label>
                                <select
                                    id="childage"
                                    name="childage"
                                    required
                                    className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-border/80 focus:ring-1 focus:ring-ring bg-card"
                                >
                                    <option value="">Select age range</option>
                                    <option value="3-6">3-6 years old</option>
                                    <option value="7-10">7-10 years old</option>
                                    <option value="11-13">11-13 years old</option>
                                    <option value="14-17">14-17 years old</option>
                                    <option value="multiple">Multiple children (different ages)</option>
                                </select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="numchildren" className="text-sm font-medium text-foreground/80">
                                    Number of Children <span className="text-muted-foreground/80">*</span>
                                </Label>
                                <Input
                                    id="numchildren"
                                    name="numchildren"
                                    type="number"
                                    min="1"
                                    max="10"
                                    placeholder="1"
                                    required
                                    className="border-border focus:border-border/80 focus:ring-ring"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <h3 className="text-sm font-medium text-foreground pb-2 border-b border-border/50">
                            Devices to Control
                        </h3>
                        <p className="text-sm text-muted-foreground">Select all devices needing parental controls:</p>
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                            {deviceTypes.map((device) => (
                                <div
                                    key={device.id}
                                    className={`p-2.5 rounded-lg border text-xs font-medium text-center cursor-pointer transition-all ${selectedDevices.includes(device.id)
                                        ? 'bg-muted/80 text-white border-border/80'
                                        : 'bg-card text-foreground/80 border-border hover:border-border/80'
                                        }`}
                                    onClick={() => handleDeviceToggle(device.id)}
                                >
                                    {device.label}
                                </div>
                            ))}
                        </div>
                        {selectedDevices.length === 0 && (
                            <p className="text-muted-foreground text-xs">Please select at least one device</p>
                        )}
                    </div>

                    <div className="space-y-4">
                        <h3 className="text-sm font-medium text-foreground pb-2 border-b border-border/50">
                            Control Preferences
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="timecontrol" className="text-sm font-medium text-foreground/80">
                                    Time Controls <span className="text-muted-foreground/80">*</span>
                                </Label>
                                <select
                                    id="timecontrol"
                                    name="timecontrol"
                                    required
                                    className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-border/80 focus:ring-1 focus:ring-ring bg-card"
                                >
                                    <option value="">Select time control level</option>
                                    <option value="basic">Basic (Daily time limits)</option>
                                    <option value="advanced">Advanced (Scheduled access)</option>
                                    <option value="strict">Strict (Limited access periods)</option>
                                    <option value="none">No time restrictions</option>
                                </select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="contentfilter" className="text-sm font-medium text-foreground/80">
                                    Content Filtering <span className="text-muted-foreground/80">*</span>
                                </Label>
                                <select
                                    id="contentfilter"
                                    name="contentfilter"
                                    required
                                    className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-border/80 focus:ring-1 focus:ring-ring bg-card"
                                >
                                    <option value="">Select filtering level</option>
                                    <option value="high">High (Strict content blocking)</option>
                                    <option value="medium">Medium (Moderate filtering)</option>
                                    <option value="low">Low (Basic protection)</option>
                                    <option value="custom">Custom (Specific categories)</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="requirements" className="text-sm font-medium text-foreground/80">
                            Special Requirements <span className="text-muted-foreground/80">(Optional)</span>
                        </Label>
                        <Textarea
                            id="requirements"
                            name="requirements"
                            placeholder="Any specific websites to block/allow, app restrictions, or other considerations"
                            className="min-h-[80px] resize-none border-border focus:border-border/80 focus:ring-ring rounded-lg"
                            rows={3}
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
                        disabled={isSubmitting || selectedDevices.length === 0}
                        className="bg-secondary hover:bg-primary text-white"
                    >
                        {isSubmitting ? 'Submitting...' : 'Set Up Controls'}
                    </Button>
                </DialogFooter>
            </form>
        </div>
    );
}
