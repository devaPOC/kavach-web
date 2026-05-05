'use client';

import { DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components";
import { Label, Input, Button, ValidatedTextarea, TextareaValidationPresets } from "@/components";
import { Checkbox } from "@/components/ui/checkbox";
import { useState } from "react";
import { useServiceSubmission } from "@/lib/hooks/useServiceSubmission";
import { SuccessMessage } from "./SuccessMessage";

interface EmergencyCybersecurityIncidentProps {
    onClose?: () => void;
    serviceType?: string;
}

const actionsTakenOptions = [
    'Changed my password immediately',
    'Enabled two-factor authentication (2FA)',
    'Reported to the platform/service provider',
    'Scanned device with antivirus software',
    'Removed suspicious apps or extensions',
    'Notified bank or financial institution',
    'Filed a police report',
    'Reported to employer or IT department',
    'Checked other accounts for unusual activity',
    'Logged out of all devices',
    'Informed family/friends about the situation',
    'Backed up data and reset devices',
    'Requested account recovery support',
    'No action taken yet'
];

export function EmergencyCybersecurityIncident({ onClose, serviceType }: EmergencyCybersecurityIncidentProps) {
    const [showSuccess, setShowSuccess] = useState(false);
    const [selectedActions, setSelectedActions] = useState<string[]>([]);
    const [showOtherInput, setShowOtherInput] = useState(false);
    const [otherAction, setOtherAction] = useState('');

    const {
        isSubmitting,
        handleSubmitWithPricing,
    } = useServiceSubmission({
        serviceType: serviceType || 'Emergency Cybersecurity Incident',
        onSuccess: () => setShowSuccess(true),
        onError: (error) => {
            console.error('Error submitting form:', error);
            alert('Submission failed: ' + error);
        }
    });

    const handleActionChange = (action: string, checked: boolean) => {
        setSelectedActions(prev =>
            checked ? [...prev, action] : prev.filter(a => a !== action)
        );
    };

    const handleSubmit = async (formData: FormData) => {
        try {
            formData.append('actionsTaken', JSON.stringify([
                ...selectedActions,
                ...(showOtherInput && otherAction ? [`Other: ${otherAction}`] : [])
            ]));
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
                    <DialogTitle className="text-xl font-semibold text-foreground">
                        Emergency Security Incident
                    </DialogTitle>
                    <DialogDescription className="text-muted-foreground text-sm">
                        Identity theft, hacked account, or security breach assistance
                    </DialogDescription>
                </DialogHeader>

                <div className="bg-muted/50 border border-border rounded-lg p-4">
                    <p className="text-sm font-medium text-foreground/80 mb-1">Priority Response</p>
                    <p className="text-sm text-muted-foreground">
                        Immediate incident containment, forensic analysis, and recovery assistance
                    </p>
                </div>

                <div className="space-y-5">
                    <div className="space-y-4">
                        <h3 className="text-sm font-medium text-foreground pb-2 border-b border-border/50">
                            Incident Information
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="incidenttype" className="text-sm font-medium text-foreground/80">
                                    Type of Incident <span className="text-muted-foreground/80">*</span>
                                </Label>
                                <Input
                                    id="incidenttype"
                                    name="incidenttype"
                                    placeholder="e.g., Identity theft, Account hack"
                                    required
                                    className="border-border focus:border-border/80 focus:ring-ring"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="yourname" className="text-sm font-medium text-foreground/80">
                                    Your Name <span className="text-muted-foreground/80">*</span>
                                </Label>
                                <Input
                                    id="yourname"
                                    name="yourname"
                                    placeholder="Enter your full name"
                                    required
                                    className="border-border focus:border-border/80 focus:ring-ring"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="contactinfo" className="text-sm font-medium text-foreground/80">
                                    Contact Information <span className="text-muted-foreground/80">*</span>
                                </Label>
                                <Input
                                    id="contactinfo"
                                    name="contactinfo"
                                    placeholder="Phone or email for urgent contact"
                                    required
                                    className="border-border focus:border-border/80 focus:ring-ring"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="whendiscovered" className="text-sm font-medium text-foreground/80">
                                    When Discovered <span className="text-muted-foreground/80">*</span>
                                </Label>
                                <Input
                                    id="whendiscovered"
                                    name="whendiscovered"
                                    type="datetime-local"
                                    required
                                    className="border-border focus:border-border/80 focus:ring-ring"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="affectedaccounts" className="text-sm font-medium text-foreground/80">
                                Affected Accounts/Devices <span className="text-muted-foreground/80">*</span>
                            </Label>
                            <Input
                                id="affectedaccounts"
                                name="affectedaccounts"
                                placeholder="List all affected accounts and devices"
                                required
                                className="border-border focus:border-border/80 focus:ring-ring"
                            />
                        </div>

                        <div className="space-y-2">
                            <ValidatedTextarea
                                id="incidentdetails"
                                name="incidentdetails"
                                label="Incident Details"
                                required
                                placeholder="Describe what happened - what you noticed, suspicious activity, timeline of events..."
                                validationRules={TextareaValidationPresets.incidentDetails}
                                className="min-h-[100px] border-border focus:border-border/80"
                            />
                        </div>
                    </div>

                    <div className="space-y-3">
                        <h3 className="text-sm font-medium text-foreground pb-2 border-b border-border/50">
                            Actions Already Taken <span className="text-muted-foreground/80">*</span>
                        </h3>
                        <div className="max-h-48 overflow-y-auto border border-border rounded-lg bg-card p-2 space-y-1">
                            {actionsTakenOptions.map((action) => (
                                <div
                                    key={action}
                                    onClick={() => handleActionChange(action, !selectedActions.includes(action))}
                                    className={`flex items-start gap-3 p-2 rounded-lg cursor-pointer transition-colors text-sm ${selectedActions.includes(action) ? 'bg-muted' : 'hover:bg-muted/50'
                                        }`}
                                >
                                    <Checkbox
                                        checked={selectedActions.includes(action)}
                                        className="mt-0.5 pointer-events-none"
                                    />
                                    <span className="text-foreground/80">{action}</span>
                                </div>
                            ))}
                            <div
                                onClick={() => setShowOtherInput(!showOtherInput)}
                                className={`flex items-start gap-3 p-2 rounded-lg cursor-pointer transition-colors text-sm ${showOtherInput ? 'bg-muted' : 'hover:bg-muted/50'
                                    }`}
                            >
                                <Checkbox checked={showOtherInput} className="mt-0.5 pointer-events-none" />
                                <span className="text-foreground/80">Other (please specify)</span>
                            </div>
                        </div>
                        {showOtherInput && (
                            <Input
                                placeholder="Describe other actions you've taken..."
                                value={otherAction}
                                onChange={(e) => setOtherAction(e.target.value)}
                                className="border-border focus:border-border/80"
                            />
                        )}
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
                        disabled={isSubmitting || (selectedActions.length === 0 && !showOtherInput)}
                        className="bg-secondary hover:bg-primary text-white"
                    >
                        {isSubmitting ? 'Submitting...' : 'Submit Emergency Request'}
                    </Button>
                </DialogFooter>
            </form>
        </div>
    );
}
