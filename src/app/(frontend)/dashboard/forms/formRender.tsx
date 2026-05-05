'use client';

// Import the new service components
import {
    SuccessMessage,
    DefaultService,
    ScanMySocialMediaForPrivacyRisks,
    RemoveMyInformationFromTheInternet,
    ResetMyHackedPassword,
    HomeSecurityAssessment,
    EmergencyCybersecurityIncident,
    FixMyLaptopOrSmartphoneAndMakeMyDeviceRunFaster,
    IClickedOnPhishingLink,
    RemoveMalwareFromMyComputer,
    RecoverMyLostData,
    SetUpParentalControls,
    GeneralConsultation,
    CybersecurityAwarenessTraining,
} from "@/components/services";

// Export the imported components for backward compatibility
export {
    DefaultService,
    ScanMySocialMediaForPrivacyRisks,
    RemoveMyInformationFromTheInternet,
    ResetMyHackedPassword,
    HomeSecurityAssessment,
    EmergencyCybersecurityIncident,
    FixMyLaptopOrSmartphoneAndMakeMyDeviceRunFaster,
    IClickedOnPhishingLink,
    RemoveMalwareFromMyComputer,
    RecoverMyLostData,
    SetUpParentalControls,
    GeneralConsultation,
    CybersecurityAwarenessTraining,
    SuccessMessage
};
// All service components are now imported from @/components/services
// The formRender.tsx file now serves as a re-export hub for backward compatibility
