import { dummyServices } from '@/app/(frontend)/dashboard/data';

/**
 * Service type to service name mapping
 * Maps internal service types to user-friendly service names from dummyServices
 */
export const serviceTypeToNameMap: { [key: string]: string } = {
  // Personal services
  'social-media-privacy-scan': 'Scan My Social Media for Privacy Risks',
  'remove-information-internet': 'Remove My Information from the Internet',
  'laptop-smartphone-repair': 'Fix My Laptop or Smartphone and Make My Devices Run Faster',
  'password-reset-hacked': 'Reset My Hacked Password',

  // Emergency response
  'emergency-cybersecurity': 'Emergency Cybersecurity Incident',
  'phishing-link-response': 'I Clicked on a Phishing Link',
  'malware-removal': 'Remove Malware from My Computer',
  'data-recovery': 'Recover My Lost Data',

  // Personal and family safety
  'parental-controls': 'Set Up Parental Controls',
  'home-security-assessment': 'Home Security Assessment',
  'general-consultation': 'General Consultation',
  'cybersecurity-bodyguard': 'Cybersecurity Bodyguard',

  // Awareness training
  'cybersecurity-awareness-training': 'Cybersecurity Awareness Training'
};

/**
 * Get service name by service type
 * @param serviceType - The internal service type
 * @returns The user-friendly service name
 */
export function getServiceNameByType(serviceType: string): string {
  return serviceTypeToNameMap[serviceType] || 'General Consultation';
}

/**
 * Get service details by service type
 * @param serviceType - The internal service type
 * @returns The service object from dummyServices or null
 */
export function getServiceDetailsByType(serviceType: string) {
  const serviceName = getServiceNameByType(serviceType);
  return dummyServices.find(service => service.service === serviceName) || null;
}

/**
 * Get service category by service type
 * @param serviceType - The internal service type
 * @returns The service category
 */
export function getServiceCategoryByType(serviceType: string): string {
  const service = getServiceDetailsByType(serviceType);
  return service?.category || 'personal-and-family-safety';
}

/**
 * Map form data to appropriate service type and get service details
 * @param formEntries - The form data entries
 * @returns Object with serviceType, title, category, and description
 */
export function mapFormToServiceDetails(formEntries: { [key: string]: any }) {
  let serviceType = 'general-consultation';

  // Check if serviceType is explicitly provided
  if (formEntries.serviceType && serviceTypeToNameMap[formEntries.serviceType]) {
    serviceType = formEntries.serviceType;
  }
  // Map different form types to service categories
  else if (formEntries.consultationType || formEntries.specificQuestions || formEntries.currentSecuritySetup) {
    serviceType = 'general-consultation';
  } else if (formEntries.protectionLevel || formEntries.selectedAssets || formEntries.primaryPhone) {
    serviceType = 'cybersecurity-bodyguard';
  } else if (formEntries.incidenttype || formEntries.incidentdetails) {
    serviceType = 'emergency-cybersecurity';
  } else if (formEntries.devicetype || formEntries.operatingsystem || formEntries.issues) {
    serviceType = 'laptop-smartphone-repair';
  } else if (formEntries.profileurls || formEntries.usernames || formEntries.securityconcerns || formEntries.selectedPlatforms) {
    serviceType = 'social-media-privacy-scan';
  } else if (formEntries.websitestoremove || formEntries.personalinfo) {
    serviceType = 'remove-information-internet';
  } else if (formEntries.recoveryemail || formEntries.hackdetails || formEntries.securityquestions) {
    serviceType = 'password-reset-hacked';
  } else if (formEntries.numberoffloors || formEntries.smartdevicescount || formEntries.iotdeviceslist || formEntries.homeaddress) {
    serviceType = 'home-security-assessment';
  } else if (formEntries.phishinglink || formEntries.actionstaken) {
    serviceType = 'phishing-link-response';
  } else if (formEntries.losstype || formEntries.datatype) {
    serviceType = 'data-recovery';
  } else if (formEntries.symptoms || formEntries.recentactivity || formEntries.antivirus) {
    serviceType = 'malware-removal';
  } else if (formEntries.awarenessSubject || formEntries.trainingObjectives || formEntries.awarenessPlace) {
    serviceType = 'cybersecurity-awareness-training';
  } else if (formEntries.childage || formEntries.parentalcontrols) {
    serviceType = 'parental-controls';
  }

  const serviceName = getServiceNameByType(serviceType);
  const serviceDetails = getServiceDetailsByType(serviceType);
  const category = getServiceCategoryByType(serviceType);

  return {
    serviceType,
    title: serviceName,
    category,
    serviceDetails
  };
}

/**
 * Get priority level based on service type
 * @param serviceType - The internal service type
 * @param formEntries - The form data for additional context
 * @returns Priority level
 */
export function getServicePriority(serviceType: string, formEntries: { [key: string]: any }): string {
  // Emergency services get highest priority
  if (['emergency-cybersecurity', 'phishing-link-response', 'malware-removal', 'password-reset-hacked'].includes(serviceType)) {
    return 'urgent';
  }

  // High priority services
  if (['data-recovery', 'remove-information-internet', 'cybersecurity-bodyguard'].includes(serviceType)) {
    return 'high';
  }

  // Check for urgency level in form data
  if (formEntries.urgencyLevel) {
    return formEntries.urgencyLevel;
  }

  // Default to normal priority
  return 'normal';
}
