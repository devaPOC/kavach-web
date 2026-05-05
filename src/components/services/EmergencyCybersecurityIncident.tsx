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
                    <DialogTitle className="text-xl font-semibold text-slate-800">
                        Emergency Security Incident
                    </DialogTitle>
                    <DialogDescription className="text-slate-600 text-sm">
                        Identity theft, hacked account, or security breach assistance
                    </DialogDescription>
                </DialogHeader>

                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                    <p className="text-sm font-medium text-slate-700 mb-1">Priority Response</p>
                    <p className="text-sm text-slate-600">
                        Immediate incident containment, forensic analysis, and recovery assistance
                    </p>
                </div>

                <div className="space-y-5">
                    <div className="space-y-4">
                        <h3 className="text-sm font-medium text-slate-800 pb-2 border-b border-slate-100">
                            Incident Information
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="incidenttype" className="text-sm font-medium text-slate-700">
                                    Type of Incident <span className="text-slate-400">*</span>
                                </Label>
                                <Input
                                    id="incidenttype"
                                    name="incidenttype"
                                    placeholder="e.g., Identity theft, Account hack"
                                    required
                                    className="border-slate-200 focus:border-slate-400 focus:ring-slate-400"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="yourname" className="text-sm font-medium text-slate-700">
                                    Your Name <span className="text-slate-400">*</span>
                                </Label>
                                <Input
                                    id="yourname"
                                    name="yourname"
                                    placeholder="Enter your full name"
                                    required
                                    className="border-slate-200 focus:border-slate-400 focus:ring-slate-400"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="contactinfo" className="text-sm font-medium text-slate-700">
                                    Contact Information <span className="text-slate-400">*</span>
                                </Label>
                                <Input
                                    id="contactinfo"
                                    name="contactinfo"
                                    placeholder="Phone or email for urgent contact"
                                    required
                                    className="border-slate-200 focus:border-slate-400 focus:ring-slate-400"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="whendiscovered" className="text-sm font-medium text-slate-700">
                                    When Discovered <span className="text-slate-400">*</span>
                                </Label>
                                <Input
                                    id="whendiscovered"
                                    name="whendiscovered"
                                    type="datetime-local"
                                    required
                                    className="border-slate-200 focus:border-slate-400 focus:ring-slate-400"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="affectedaccounts" className="text-sm font-medium text-slate-700">
                                Affected Accounts/Devices <span className="text-slate-400">*</span>
                            </Label>
                            <Input
                                id="affectedaccounts"
                                name="affectedaccounts"
                                placeholder="List all affected accounts and devices"
                                required
                                className="border-slate-200 focus:border-slate-400 focus:ring-slate-400"
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
                                className="min-h-[100px] border-slate-200 focus:border-slate-400"
                            />
                        </div>
                    </div>

                    <div className="space-y-3">
                        <h3 className="text-sm font-medium text-slate-800 pb-2 border-b border-slate-100">
                            Actions Already Taken <span className="text-slate-400">*</span>
                        </h3>
                        <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-lg bg-white p-2 space-y-1">
                            {actionsTakenOptions.map((action) => (
                                <div
                                    key={action}
                                    onClick={() => handleActionChange(action, !selectedActions.includes(action))}
                                    className={`flex items-start gap-3 p-2 rounded-lg cursor-pointer transition-colors text-sm ${selectedActions.includes(action) ? 'bg-slate-100' : 'hover:bg-slate-50'
                                        }`}
                                >
                                    <Checkbox
                                        checked={selectedActions.includes(action)}
                                        className="mt-0.5 pointer-events-none"
                                    />
                                    <span className="text-slate-700">{action}</span>
                                </div>
                            ))}
                            <div
                                onClick={() => setShowOtherInput(!showOtherInput)}
                                className={`flex items-start gap-3 p-2 rounded-lg cursor-pointer transition-colors text-sm ${showOtherInput ? 'bg-slate-100' : 'hover:bg-slate-50'
                                    }`}
                            >
                                <Checkbox checked={showOtherInput} className="mt-0.5 pointer-events-none" />
                                <span className="text-slate-700">Other (please specify)</span>
                            </div>
                        </div>
                        {showOtherInput && (
                            <Input
                                placeholder="Describe other actions you've taken..."
                                value={otherAction}
                                onChange={(e) => setOtherAction(e.target.value)}
                                className="border-slate-200 focus:border-slate-400"
                            />
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
                        disabled={isSubmitting || (selectedActions.length === 0 && !showOtherInput)}
                        className="bg-slate-800 hover:bg-slate-900 text-white"
                    >
                        {isSubmitting ? 'Submitting...' : 'Submit Emergency Request'}
                    </Button>
                </DialogFooter>
            </form>
        </div>
    );
}
