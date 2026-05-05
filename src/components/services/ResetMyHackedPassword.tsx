'use client';

import { DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components";
import { Label, Input, Button, PhoneInput } from "@/components";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { Plus, X } from "lucide-react";
import { requestServicesForm } from "../../app/(frontend)/dashboard/action";
import { SuccessMessage } from "./SuccessMessage";

interface ResetMyHackedPasswordProps {
    onClose?: () => void;
}

const accountCategories: Record<string, string[] | null> = {
    'Social Media': [
        'Facebook', 'Instagram', 'TikTok', 'Snapchat', 'X (Twitter)',
        'LinkedIn', 'YouTube', 'Threads', 'Pinterest', 'Reddit',
        'Telegram', 'Discord', 'Tumblr', 'BeReal'
    ],
    'Email': [
        'Gmail', 'Outlook / Hotmail', 'Yahoo Mail', 'iCloud Mail',
        'ProtonMail', 'Zoho Mail', 'AOL Mail', 'GMX Mail'
    ],
    'Gaming': [
        'PlayStation Network', 'Xbox Live', 'Steam', 'Epic Games',
        'Riot Games', 'Nintendo Account', 'Battle.net', 'EA Origin',
        'Ubisoft Connect', 'Roblox', 'Minecraft', 'Twitch'
    ],
    'Other': null
};

const whatHappenedOptions = [
    'Suspicious login activity or unknown devices',
    'Login alert or security warning received',
    'Contacts received strange messages from my account',
    'Locked out or password was changed',
    'Unfamiliar posts or actions on my account',
    'Password reset emails I did not request',
    'My information on unknown websites',
    'Unauthorized financial transactions',
    'Platform notified possible compromise',
    'Antivirus flagged unusual activity',
    'Profile cloned or duplicated',
    'Changes in settings or linked apps',
    'Phishing attempts targeting my account',
    'Credentials found in data breach'
];

interface AffectedAccount {
    category: string;
    platform: string;
    customPlatform?: string;
}

export function ResetMyHackedPassword({ onClose }: ResetMyHackedPasswordProps) {
    const [showSuccess, setShowSuccess] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [affectedAccounts, setAffectedAccounts] = useState<AffectedAccount[]>([]);
    const [currentCategory, setCurrentCategory] = useState('');
    const [currentPlatform, setCurrentPlatform] = useState('');
    const [customPlatform, setCustomPlatform] = useState('');
    const [selectedWhatHappened, setSelectedWhatHappened] = useState<string[]>([]);
    const [otherWhatHappened, setOtherWhatHappened] = useState('');
    const [showOtherInput, setShowOtherInput] = useState(false);

    const handleSubmit = async (formData: FormData) => {
        setIsSubmitting(true);
        try {
            formData.append('affectedAccounts', JSON.stringify(affectedAccounts));
            formData.append('whatHappened', JSON.stringify([
                ...selectedWhatHappened,
                ...(showOtherInput && otherWhatHappened ? [`Other: ${otherWhatHappened}`] : [])
            ]));
            await requestServicesForm(formData);
            setShowSuccess(true);
        } catch (error) {
            console.error('Error submitting form:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const addAccount = () => {
        if (currentCategory === 'Other' && customPlatform.trim()) {
            setAffectedAccounts([...affectedAccounts, {
                category: currentCategory,
                platform: 'Custom',
                customPlatform: customPlatform.trim()
            }]);
            setCustomPlatform('');
        } else if (currentCategory && currentPlatform) {
            setAffectedAccounts([...affectedAccounts, {
                category: currentCategory,
                platform: currentPlatform
            }]);
        }
        setCurrentCategory('');
        setCurrentPlatform('');
    };

    const removeAccount = (index: number) => {
        setAffectedAccounts(affectedAccounts.filter((_, i) => i !== index));
    };

    const handleWhatHappenedChange = (option: string, checked: boolean) => {
        setSelectedWhatHappened(prev =>
            checked ? [...prev, option] : prev.filter(o => o !== option)
        );
    };

    const getPlatformDisplay = (account: AffectedAccount) => {
        return account.customPlatform || account.platform;
    };

    if (showSuccess) {
        return <SuccessMessage onClose={() => onClose?.()} />;
    }

    return (
        <div className="w-full">
            <form action={handleSubmit} className="space-y-5">
                <DialogHeader className="space-y-2 pb-2">
                    <DialogTitle className="text-xl font-semibold text-foreground">
                        Hacked Account Recovery
                    </DialogTitle>
                    <DialogDescription className="text-muted-foreground text-sm">
                        Expert account recovery assistance for compromised accounts
                    </DialogDescription>
                </DialogHeader>

                <div className="bg-muted/50 border border-border rounded-lg p-4">
                    <p className="text-sm font-medium text-foreground/80 mb-1">What to expect</p>
                    <p className="text-sm text-muted-foreground">
                        Password reset confirmation, account security verification, and security recommendations
                    </p>
                </div>

                <div className="space-y-5">
                    <div className="space-y-4">
                        <h3 className="text-sm font-medium text-foreground pb-2 border-b border-border/50">
                            Compromised Accounts <span className="text-muted-foreground/80">*</span>
                        </h3>

                        <div className="border border-border rounded-lg p-4 space-y-3 bg-card">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="space-y-2">
                                    <Label className="text-sm font-medium text-foreground/80">Account Type</Label>
                                    <Select value={currentCategory} onValueChange={(value) => {
                                        setCurrentCategory(value);
                                        setCurrentPlatform('');
                                        setCustomPlatform('');
                                    }}>
                                        <SelectTrigger className="border-border">
                                            <SelectValue placeholder="Select type..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {Object.keys(accountCategories).map((category) => (
                                                <SelectItem key={category} value={category}>
                                                    {category}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {currentCategory && currentCategory !== 'Other' && (
                                    <div className="space-y-2">
                                        <Label className="text-sm font-medium text-foreground/80">Platform</Label>
                                        <Select value={currentPlatform} onValueChange={setCurrentPlatform}>
                                            <SelectTrigger className="border-border">
                                                <SelectValue placeholder="Select platform..." />
                                            </SelectTrigger>
                                            <SelectContent className="max-h-60">
                                                {accountCategories[currentCategory]?.map((platform) => (
                                                    <SelectItem key={platform} value={platform}>
                                                        {platform}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}

                                {currentCategory === 'Other' && (
                                    <div className="space-y-2">
                                        <Label className="text-sm font-medium text-foreground/80">Platform Name</Label>
                                        <Input
                                            placeholder="Enter platform name..."
                                            value={customPlatform}
                                            onChange={(e) => setCustomPlatform(e.target.value)}
                                            className="border-border focus:border-border/80"
                                        />
                                    </div>
                                )}
                            </div>

                            <Button
                                type="button"
                                variant="outline"
                                onClick={addAccount}
                                disabled={
                                    !currentCategory ||
                                    (currentCategory !== 'Other' && !currentPlatform) ||
                                    (currentCategory === 'Other' && !customPlatform.trim())
                                }
                                className="w-full border-dashed border-border text-muted-foreground"
                            >
                                <Plus className="w-4 h-4 mr-2" />
                                Add Account
                            </Button>
                        </div>

                        {affectedAccounts.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                                {affectedAccounts.map((account, index) => (
                                    <div
                                        key={index}
                                        className="bg-muted text-foreground/80 px-3 py-1.5 rounded-full text-sm flex items-center gap-2"
                                    >
                                        <span className="font-medium">{getPlatformDisplay(account)}</span>
                                        <span className="text-muted-foreground text-xs">({account.category})</span>
                                        <button
                                            type="button"
                                            onClick={() => removeAccount(index)}
                                            className="hover:text-foreground ml-1"
                                        >
                                            <X className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        {affectedAccounts.length === 0 && (
                            <p className="text-xs text-muted-foreground">Please add at least one compromised account</p>
                        )}
                    </div>

                    <div className="space-y-3">
                        <h3 className="text-sm font-medium text-foreground pb-2 border-b border-border/50">
                            What Happened? <span className="text-muted-foreground/80">*</span>
                        </h3>
                        <div className="max-h-48 overflow-y-auto border border-border rounded-lg bg-card p-2 space-y-1">
                            {whatHappenedOptions.map((option) => (
                                <div
                                    key={option}
                                    onClick={() => handleWhatHappenedChange(option, !selectedWhatHappened.includes(option))}
                                    className={`flex items-start gap-3 p-2 rounded-lg cursor-pointer transition-colors text-sm ${selectedWhatHappened.includes(option) ? 'bg-muted' : 'hover:bg-muted/50'
                                        }`}
                                >
                                    <Checkbox
                                        checked={selectedWhatHappened.includes(option)}
                                        className="mt-0.5 pointer-events-none"
                                    />
                                    <span className="text-foreground/80">{option}</span>
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
                                placeholder="Please describe what happened..."
                                value={otherWhatHappened}
                                onChange={(e) => setOtherWhatHappened(e.target.value)}
                                className="border-border focus:border-border/80"
                            />
                        )}
                    </div>

                    <div className="space-y-4">
                        <h3 className="text-sm font-medium text-foreground pb-2 border-b border-border/50">
                            Recovery Information
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="recoveryemail" className="text-sm font-medium text-foreground/80">
                                    Recovery Email <span className="text-muted-foreground/80">*</span>
                                </Label>
                                <Input
                                    id="recoveryemail"
                                    name="recoveryemail"
                                    type="email"
                                    placeholder="backup@email.com"
                                    required
                                    className="border-border focus:border-border/80 focus:ring-ring"
                                />
                                <p className="text-xs text-muted-foreground">Use a secure email you still have access to</p>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="recoveryphone" className="text-sm font-medium text-foreground/80">
                                    Recovery Phone <span className="text-muted-foreground/80">(Optional)</span>
                                </Label>
                                <PhoneInput
                                    id="recoveryphone"
                                    name="recoveryphone"
                                    placeholder="Enter phone number"
                                    defaultCountry="US"
                                />
                            </div>
                        </div>
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
                        disabled={isSubmitting || affectedAccounts.length === 0 || (selectedWhatHappened.length === 0 && !showOtherInput)}
                        className="bg-secondary hover:bg-primary text-white"
                    >
                        {isSubmitting ? 'Submitting...' : 'Start Recovery'}
                    </Button>
                </DialogFooter>
            </form>
        </div>
    );
}
