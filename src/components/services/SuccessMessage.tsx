'use client';

import { DialogTitle, DialogDescription } from "@/components";
import { Button } from "@/components";
import { CheckCircle } from "lucide-react";

interface SuccessMessageProps {
  onClose: () => void;
}

export function SuccessMessage({ onClose }: SuccessMessageProps) {
  return (
    <div className="text-center py-8 px-4">
      <div className="w-14 h-14 mx-auto mb-5 bg-muted rounded-full flex items-center justify-center">
        <CheckCircle className="w-7 h-7 text-foreground/80" />
      </div>
      <DialogTitle className="text-foreground font-semibold text-lg mb-3">
        Request Submitted Successfully
      </DialogTitle>
      <DialogDescription className="text-muted-foreground text-sm leading-relaxed mb-6 max-w-sm mx-auto">
        Your service request has been submitted and is now awaiting review. You will be notified once an expert has been assigned to your case.
      </DialogDescription>
      <Button
        onClick={onClose}
        className="bg-secondary hover:bg-primary text-white px-6 py-2 rounded-lg transition-colors"
      >
        Close
      </Button>
    </div>
  );
}
