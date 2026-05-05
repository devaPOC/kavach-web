'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui';
import { Button } from '@/components/ui';
import { Checkbox } from '@/components/ui';
import { LEGAL_DOCUMENTS, type CustomerLegalDocumentType } from '@/lib/constants/legal-documents';

interface CustomerLegalAgreementsProps {
  onAgreementChange: (agreements: Record<CustomerLegalDocumentType, boolean>) => void;
  agreements: Record<CustomerLegalDocumentType, boolean>;
  className?: string;
}

const CustomerLegalAgreements: React.FC<CustomerLegalAgreementsProps> = ({
  onAgreementChange,
  agreements,
  className = ''
}) => {
  const [openDialog, setOpenDialog] = useState<CustomerLegalDocumentType | null>(null);

  const handleAgreementToggle = (documentType: CustomerLegalDocumentType, checked: boolean) => {
    const updatedAgreements = {
      ...agreements,
      [documentType]: checked
    };
    onAgreementChange(updatedAgreements);
  };

  const handleAcceptFromModal = (documentType: CustomerLegalDocumentType) => {
    handleAgreementToggle(documentType, true);
    setOpenDialog(null);
  };

  const formatDocumentContent = (content: string) => {
    return content.split('\n').map((line, index) => {
      if (line.trim() === '') {
        return <br key={index} />;
      }

      if (line.trim().startsWith('•')) {
        return (
          <div key={index} className="ml-4 mb-1 text-gray-700">
            {line.trim()}
          </div>
        );
      }

      if (/^\d+\./.test(line.trim())) {
        return (
          <div key={index} className="font-semibold mt-6 mb-3 text-gray-900 text-base">
            {line.trim()}
          </div>
        );
      }

      if (/^\d+\.\d+/.test(line.trim())) {
        return (
          <div key={index} className="ml-2 mb-2 font-medium text-gray-800">
            {line.trim()}
          </div>
        );
      }

      return (
        <div key={index} className="mb-3 text-gray-700 leading-relaxed">
          {line.trim()}
        </div>
      );
    });
  };

  const customerDocuments: CustomerLegalDocumentType[] = [
    'CUSTOMER_SERVICES_AGREEMENT',
    'CUSTOMER_INFORMED_CONSENT',
    'CUSTOMER_DATA_PROCESSING_CONSENT',
    'DISPUTE_RESOLUTION_ARBITRATION',
    'ACCEPTABLE_USE_POLICY'
  ];
  const totalAgreements = customerDocuments.length;
  const acceptedCount = customerDocuments.filter(doc => agreements[doc]).length;

  return (
    <div className={`space-y-4 ${className}`}>

      <div className="space-y-3">
        {customerDocuments.map((documentType) => {
          const document = LEGAL_DOCUMENTS[documentType];
          const isAccepted = agreements[documentType] || false;

          return (
            <div key={documentType} className="flex items-start justify-start space-x-3 py-2">
              <Checkbox
                id={documentType}
                checked={isAccepted}
                onCheckedChange={(checked) => handleAgreementToggle(documentType, checked === true)}
                className="data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600"
              />
              <div className="flex-1">
                <label htmlFor={documentType} className="text-sm text-gray-900 cursor-pointer">
                  I agree to the{' '}
                  <Dialog open={openDialog === documentType} onOpenChange={(open) => setOpenDialog(open ? documentType : null)}>
                    <DialogTrigger asChild>
                      <button className="text-blue-600 hover:text-blue-800 underline font-medium">
                        {document.shortName}
                      </button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl max-h-[80vh]">
                      <DialogHeader>
                        <DialogTitle className="text-lg font-semibold">
                          {document.name}
                        </DialogTitle>
                        <p className="text-sm text-gray-600">
                          Version {document.version}
                        </p>
                      </DialogHeader>
                      <div className="h-[60vh] overflow-y-auto pr-4 py-4">
                        <div className="text-sm leading-relaxed">
                          {formatDocumentContent(document.content)}
                        </div>
                      </div>
                      <div className="flex items-center justify-between pt-4 border-t">
                        <p className="text-xs text-gray-500">
                          By accepting, you agree to be legally bound by this document.
                        </p>
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            onClick={() => setOpenDialog(null)}
                          >
                            Close
                          </Button>
                          {!isAccepted && (
                            <Button
                              onClick={() => handleAcceptFromModal(documentType)}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              Accept Agreement
                            </Button>
                          )}
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </label>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CustomerLegalAgreements;
