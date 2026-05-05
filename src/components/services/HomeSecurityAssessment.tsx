'use client';

import { DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components";
import { Label, Input, Button } from "@/components";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { requestServicesForm } from "../../app/(frontend)/dashboard/action";
import { SuccessMessage } from "./SuccessMessage";

interface HomeSecurityAssessmentProps {
  onClose?: () => void;
}

const securityConcerns = [
  'Weak or reused Wi-Fi password',
  'Outdated router firmware',
  'Unsecured smart devices',
  'Unknown devices on network',
  'No parental controls',
  'Devices without antivirus',
  'No guest Wi-Fi separation',
  'Remote access without protection',
  'Suspected network compromise',
  'IoT devices may leak data',
  'Default passwords not changed',
  'No network monitoring',
  'Cameras/microphones vulnerable',
  'Privacy concerns with voice assistants',
  'Unclear device access control',
  'Devices auto-connect to insecure networks',
  'Frequent phishing emails or scam calls'
];

export function HomeSecurityAssessment({ onClose }: HomeSecurityAssessmentProps) {
  const [showSuccess, setShowSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [preferredDate1, setPreferredDate1] = useState<Date>();
  const [preferredDate2, setPreferredDate2] = useState<Date>();
  const [showCalendar1, setShowCalendar1] = useState(false);
  const [showCalendar2, setShowCalendar2] = useState(false);
  const [selectedConcerns, setSelectedConcerns] = useState<string[]>([]);
  const [showOtherInput, setShowOtherInput] = useState(false);
  const [otherConcern, setOtherConcern] = useState('');

  const handleConcernChange = (concern: string, checked: boolean) => {
    setSelectedConcerns(prev =>
      checked ? [...prev, concern] : prev.filter(c => c !== concern)
    );
  };

  const handleSubmit = async (formData: FormData) => {
    setIsSubmitting(true);
    try {
      if (preferredDate1) formData.append('preferredDateTime1', format(preferredDate1, 'PPP p'));
      if (preferredDate2) formData.append('preferredDateTime2', format(preferredDate2, 'PPP p'));
      formData.append('securityConcerns', JSON.stringify([
        ...selectedConcerns,
        ...(showOtherInput && otherConcern ? [`Other: ${otherConcern}`] : [])
      ]));
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
            Home Security Assessment
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-sm">
            Comprehensive evaluation of your home IoT devices and network
          </DialogDescription>
        </DialogHeader>

        <div className="bg-muted/50 border border-border rounded-lg p-4">
          <p className="text-sm font-medium text-foreground/80 mb-1">What to expect</p>
          <p className="text-sm text-muted-foreground">
            Complete home security report with vulnerability analysis and recommendations
          </p>
        </div>

        <div className="space-y-5">
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-foreground pb-2 border-b border-border/50">
              Property Information
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="numberoffloors" className="text-sm font-medium text-foreground/80">
                  Floors <span className="text-muted-foreground/80">*</span>
                </Label>
                <Input
                  id="numberoffloors"
                  name="numberoffloors"
                  type="number"
                  min="1"
                  max="50"
                  placeholder="e.g., 2"
                  required
                  className="border-border focus:border-border/80 focus:ring-ring"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="smartdevicescount" className="text-sm font-medium text-foreground/80">
                  Smart Devices <span className="text-muted-foreground/80">*</span>
                </Label>
                <Input
                  id="smartdevicescount"
                  name="smartdevicescount"
                  type="number"
                  min="0"
                  placeholder="e.g., 15"
                  required
                  className="border-border focus:border-border/80 focus:ring-ring"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="securitycameras" className="text-sm font-medium text-foreground/80">
                  Cameras <span className="text-muted-foreground/80">*</span>
                </Label>
                <Input
                  id="securitycameras"
                  name="securitycameras"
                  type="number"
                  min="0"
                  placeholder="e.g., 4"
                  required
                  className="border-border focus:border-border/80 focus:ring-ring"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-medium text-foreground pb-2 border-b border-border/50">
              Device and Location Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="iotdeviceslist" className="text-sm font-medium text-foreground/80">
                  IoT Devices List <span className="text-muted-foreground/80">*</span>
                </Label>
                <Textarea
                  id="iotdeviceslist"
                  name="iotdeviceslist"
                  placeholder="List your smart devices (thermostats, locks, lights, TVs, etc.)"
                  className="min-h-[80px] resize-none border-border focus:border-border/80 focus:ring-ring rounded-lg"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="homeaddress" className="text-sm font-medium text-foreground/80">
                  Home Address <span className="text-muted-foreground/80">*</span>
                </Label>
                <Textarea
                  id="homeaddress"
                  name="homeaddress"
                  placeholder="Complete address including city and ZIP"
                  className="min-h-[80px] resize-none border-border focus:border-border/80 focus:ring-ring rounded-lg"
                  required
                />
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-medium text-foreground pb-2 border-b border-border/50">
              Security Concerns <span className="text-muted-foreground/80">*</span>
            </h3>
            <div className="max-h-48 overflow-y-auto border border-border rounded-lg bg-card p-2 space-y-1">
              {securityConcerns.map((concern) => (
                <div
                  key={concern}
                  onClick={() => handleConcernChange(concern, !selectedConcerns.includes(concern))}
                  className={`flex items-start gap-3 p-2 rounded-lg cursor-pointer transition-colors text-sm ${selectedConcerns.includes(concern) ? 'bg-muted' : 'hover:bg-muted/50'
                    }`}
                >
                  <Checkbox checked={selectedConcerns.includes(concern)} className="mt-0.5 pointer-events-none" />
                  <span className="text-foreground/80">{concern}</span>
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
                placeholder="Describe your other security concern..."
                value={otherConcern}
                onChange={(e) => setOtherConcern(e.target.value)}
                className="border-border focus:border-border/80"
              />
            )}
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-medium text-foreground pb-2 border-b border-border/50">
              Preferred Assessment Times
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground/80">
                  First Preference <span className="text-muted-foreground/80">*</span>
                </Label>
                <Popover open={showCalendar1} onOpenChange={setShowCalendar1}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal border-border",
                        !preferredDate1 && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {preferredDate1 ? format(preferredDate1, "MMM dd, yyyy 'at' h:mm a") : "Select date and time"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={preferredDate1}
                      onSelect={setPreferredDate1}
                      disabled={(date) => date < new Date()}
                    />
                    <div className="p-3 border-t">
                      <Label className="text-xs text-muted-foreground mb-2 block">Time</Label>
                      <Input
                        type="time"
                        onChange={(e) => {
                          if (preferredDate1 && e.target.value) {
                            const [hours, minutes] = e.target.value.split(':');
                            const newDate = new Date(preferredDate1);
                            newDate.setHours(parseInt(hours), parseInt(minutes));
                            setPreferredDate1(newDate);
                          }
                        }}
                        className="w-full border-border"
                      />
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground/80">
                  Second Preference <span className="text-muted-foreground/80">(Optional)</span>
                </Label>
                <Popover open={showCalendar2} onOpenChange={setShowCalendar2}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal border-border",
                        !preferredDate2 && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {preferredDate2 ? format(preferredDate2, "MMM dd, yyyy 'at' h:mm a") : "Select date and time"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={preferredDate2}
                      onSelect={setPreferredDate2}
                      disabled={(date) => date < new Date()}
                    />
                    <div className="p-3 border-t">
                      <Label className="text-xs text-muted-foreground mb-2 block">Time</Label>
                      <Input
                        type="time"
                        onChange={(e) => {
                          if (preferredDate2 && e.target.value) {
                            const [hours, minutes] = e.target.value.split(':');
                            const newDate = new Date(preferredDate2);
                            newDate.setHours(parseInt(hours), parseInt(minutes));
                            setPreferredDate2(newDate);
                          }
                        }}
                        className="w-full border-border"
                      />
                    </div>
                  </PopoverContent>
                </Popover>
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
            disabled={isSubmitting || (selectedConcerns.length === 0 && !showOtherInput)}
            className="bg-secondary hover:bg-primary text-white"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Request'}
          </Button>
        </DialogFooter>
      </form>
    </div>
  );
}
