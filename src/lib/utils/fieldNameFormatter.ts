/**
 * Utility functions for converting form field keys and service types to human-readable display names
 */

// Map of field keys to their display names
const FIELD_DISPLAY_MAP: Record<string, string> = {
  // Home Security Assessment fields
  'homeaddress': 'Home Address',
  'iotdeviceslist': 'IoT Devices List',
  'numberoffloors': 'Number of Floors',
  'securitycameras': 'Security Cameras',
  'smartdevicescount': 'Smart Devices Count',
  'preferredDateTime1': 'Preferred Date Time 1',
  'preferredDateTime2': 'Preferred Date Time 2',
  'preferredDateTime3': 'Preferred Date Time 3',

  // Common form fields
  'fullname': 'Full Name',
  'fullName': 'Full Name',
  'emailaddress': 'Email Address',
  'emailAddress': 'Email Address',
  'phonenumber': 'Phone Number',
  'phoneNumber': 'Phone Number',
  'companyname': 'Company Name',
  'companyName': 'Company Name',
  'jobtitle': 'Job Title',
  'jobTitle': 'Job Title',
  'websiteurl': 'Website URL',
  'websiteUrl': 'Website URL',
  'socialmediahandles': 'Social Media Handles',
  'socialMediaHandles': 'Social Media Handles',
  'devicetype': 'Device Type',
  'deviceType': 'Device Type',
  'devicemodel': 'Device Model',
  'deviceModel': 'Device Model',
  'operatingsystem': 'Operating System',
  'operatingSystem': 'Operating System',
  'issueDescription': 'Issue Description',
  'issuedescription': 'Issue Description',
  'urgencylevel': 'Urgency Level',
  'urgencyLevel': 'Urgency Level',
  'contactmethod': 'Contact Method',
  'contactMethod': 'Contact Method',
  'additionalinfo': 'Additional Information',
  'additionalInfo': 'Additional Information',
  'additionalInformation': 'Additional Information',

  // URL/Email/Message Check fields
  'suspiciousurl': 'Suspicious URL',
  'suspiciousUrl': 'Suspicious URL',
  'suspiciousemail': 'Suspicious Email',
  'suspiciousEmail': 'Suspicious Email',
  'suspiciousmessage': 'Suspicious Message',
  'suspiciousMessage': 'Suspicious Message',
  'receiveddate': 'Received Date',
  'receivedDate': 'Received Date',
  'senderinfo': 'Sender Information',
  'senderInfo': 'Sender Information',

  // Identity Leak Check fields
  'personalinfo': 'Personal Information',
  'personalInfo': 'Personal Information',
  'socialaccounts': 'Social Accounts',
  'socialAccounts': 'Social Accounts',
  'financialaccounts': 'Financial Accounts',
  'financialAccounts': 'Financial Accounts',
  'suspectedbreach': 'Suspected Breach',
  'suspectedBreach': 'Suspected Breach',

  // Malware Removal fields
  'infecteddevice': 'Infected Device',
  'infectedDevice': 'Infected Device',
  'malwaretype': 'Malware Type',
  'malwareType': 'Malware Type',
  'symptomsnoticed': 'Symptoms Noticed',
  'symptomsNoticed': 'Symptoms Noticed',
  'antivirussoftware': 'Antivirus Software',
  'antivirusSoftware': 'Antivirus Software',

  // Data Recovery fields
  'lostdatatype': 'Lost Data Type',
  'lostDataType': 'Lost Data Type',
  'datalossreason': 'Data Loss Reason',
  'dataLossReason': 'Data Loss Reason',
  'deviceaffected': 'Device Affected',
  'deviceAffected': 'Device Affected',
  'backupavailable': 'Backup Available',
  'backupAvailable': 'Backup Available',

  // Social Media Privacy fields
  'platforms': 'Platforms',
  'profileUrls': 'Profile URLs',
  'profileurls': 'Profile URLs',
  'securityConcerns': 'Security Concerns',
  'securityconcerns': 'Security Concerns',
  'platformstocheck': 'Platforms to Check',
  'platformsToCheck': 'Platforms to Check',
  'privacyconcerns': 'Privacy Concerns',
  'privacyConcerns': 'Privacy Concerns',
  'accountstypes': 'Account Types',
  'accountTypes': 'Account Types',

  // Parental Controls fields
  'childrenages': 'Children Ages',
  'childrenAges': 'Children Ages',
  'devicestocontrol': 'Devices to Control',
  'devicesToControl': 'Devices to Control',
  'restrictionlevel': 'Restriction Level',
  'restrictionLevel': 'Restriction Level',
  'contentfiltering': 'Content Filtering',
  'contentFiltering': 'Content Filtering',

  // Emergency Cybersecurity fields
  'emergencytype': 'Emergency Type',
  'emergencyType': 'Emergency Type',
  'immediaterisk': 'Immediate Risk',
  'immediateRisk': 'Immediate Risk',
  'affectedsystems': 'Affected Systems',
  'affectedSystems': 'Affected Systems',
  'businessimpact': 'Business Impact',
  'businessImpact': 'Business Impact',

  // Device Repair fields
  'devicebrand': 'Device Brand',
  'deviceBrand': 'Device Brand',
  'problemdescription': 'Problem Description',
  'problemDescription': 'Problem Description',
  'warrantyinfo': 'Warranty Information',
  'warrantyInfo': 'Warranty Information',
  'repairbudget': 'Repair Budget',
  'repairBudget': 'Repair Budget'
};

// Map of service types to their display names
const SERVICE_TYPE_MAP: Record<string, string> = {
  'social-media-privacy-scan': 'Social Media Privacy Scan',
  'remove-information-internet': 'Remove Information from Internet',
  'password-reset-hacked': 'Reset Hacked Password',
  'home-security-assessment': 'Home Security Assessment',
  'emergency-cybersecurity': 'Emergency Cybersecurity',
  'laptop-smartphone-repair': 'Device Repair & Optimization',
  'phishing-link-response': 'Phishing Link Response',
  'malware-removal': 'Malware Removal',
  'data-recovery': 'Data Recovery',
  'parental-controls': 'Parental Controls Setup',
  'general-consultation': 'General Consultation',
  'cybersecurity-bodyguard': 'Cybersecurity Bodyguard',
  'cybersecurity-awareness-training': 'Cybersecurity Awareness Training'
};

// Map of status values to their display names
const STATUS_MAP: Record<string, string> = {
  'pending': 'Pending',
  'assigned': 'Assigned',
  'accepted': 'Accepted',
  'in_progress': 'In Progress',
  'completed': 'Completed',
  'pending_closure': 'Pending Closure',
  'closed': 'Closed',
  'rejected': 'Rejected',
  'cancelled': 'Cancelled'
};

/**
 * Converts a form field key to a human-readable display name
 * @param fieldKey - The form field key (e.g., 'homeaddress', 'iotdeviceslist')
 * @returns The formatted display name (e.g., 'Home Address', 'IoT Devices List')
 */
export function getFormFieldDisplayName(fieldKey: string): string {
  // Return mapped name if available
  if (FIELD_DISPLAY_MAP[fieldKey]) {
    return FIELD_DISPLAY_MAP[fieldKey];
  }

  // Fallback to formatted version for unmapped fields
  return fieldKey
    .replace(/([A-Z])/g, ' $1') // Add space before capital letters
    .replace(/^./, str => str.toUpperCase()) // Capitalize first letter
    .trim();
}

/**
 * Converts a service type key to a human-readable display name
 * @param serviceType - The service type key (e.g., 'home-security-assessment')
 * @returns The formatted display name (e.g., 'Home Security Assessment')
 */
export function getServiceTypeDisplayName(serviceType: string): string {
  // Return mapped name if available
  if (SERVICE_TYPE_MAP[serviceType]) {
    return SERVICE_TYPE_MAP[serviceType];
  }

  // Fallback to formatted version for unmapped service types
  return serviceType
    .replace(/[-_]/g, ' ') // Replace hyphens and underscores with spaces
    .replace(/\b\w/g, l => l.toUpperCase()) // Capitalize first letter of each word
    .trim();
}

/**
 * Converts a status key to a human-readable display name
 * @param status - The status key (e.g., 'in_progress', 'pending_closure')
 * @returns The formatted display name (e.g., 'In Progress', 'Pending Closure')
 */
export function getStatusDisplayName(status: string): string {
  // Return mapped name if available
  if (STATUS_MAP[status]) {
    return STATUS_MAP[status];
  }

  // Fallback to formatted version for unmapped statuses
  return status
    .replace(/[-_]/g, ' ') // Replace hyphens and underscores with spaces
    .replace(/\b\w/g, l => l.toUpperCase()) // Capitalize first letter of each word
    .trim();
}

/**
 * Gets all available field mappings (useful for debugging or extending)
 */
export function getAllFieldMappings(): Record<string, string> {
  return { ...FIELD_DISPLAY_MAP };
}

/**
 * Gets all available service type mappings (useful for debugging or extending)
 */
export function getAllServiceTypeMappings(): Record<string, string> {
  return { ...SERVICE_TYPE_MAP };
}

/**
 * Gets all available status mappings (useful for debugging or extending)
 */
export function getAllStatusMappings(): Record<string, string> {
  return { ...STATUS_MAP };
}
