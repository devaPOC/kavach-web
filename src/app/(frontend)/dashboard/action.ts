'use server';
import { db } from "@/lib/database";
import { serviceData } from "@/lib/database/schema/service-data";
import { getCurrentSession } from "@/lib/auth/session-helpers";
import { withRetry } from "@/lib/database/retry";
import { mapFormToServiceDetails, getServicePriority } from "@/lib/utils/service-mapping";

export async function requestServicesForm(formData: FormData) {
    try {
        const formEntries = Object.fromEntries(formData.entries());

        // Log the form data for debugging
        console.log('Service request submitted:', formEntries);

        const currentSession = await getCurrentSession();
        console.log(currentSession);

        if (!currentSession) {
            return {
                success: false,
                status: 401,
                message: 'User not authenticated'
            }
        }

        const userId = currentSession.userId;

        // Use the service mapping utility to get proper service details
        const serviceMapping = mapFormToServiceDetails(formEntries);
        const serviceType = serviceMapping.serviceType;
        const title = serviceMapping.title;
        const priority = getServicePriority(serviceType, formEntries) as 'low' | 'normal' | 'high' | 'urgent';

        // Debug logging
        console.log('Service mapping result:', {
            serviceType,
            title,
            priority,
            formKeys: Object.keys(formEntries)
        });

        // Build description based on service type and form data
        let description = '';

        if (serviceType === 'general-consultation') {
            description = `Consultation Type: ${formEntries.consultationType || 'General'}\nFamily Members: ${formEntries.familyMembers || 'Not specified'}\nSpecific Questions: ${formEntries.specificQuestions || ''}\nCurrent Security Setup: ${formEntries.currentSecuritySetup || 'Not specified'}${formEntries.devicesUsed ? '\nDevices Used: ' + formEntries.devicesUsed : ''}${formEntries.internetUsage ? '\nInternet Usage: ' + formEntries.internetUsage : ''}`;
        } else if (serviceType === 'cybersecurity-bodyguard') {
            const selectedAssetsData = formEntries.selectedAssets ? JSON.parse(formEntries.selectedAssets as string) : [];
            description = `Protection Level: ${formEntries.protectionLevel || 'Unknown'}\nSelected Assets: ${selectedAssetsData.join(', ') || 'None specified'}\nAsset Details: ${formEntries.assetDetails || 'Not provided'}\nPrimary Contact: ${formEntries.primaryPhone || 'Not provided'} / ${formEntries.primaryEmail || 'Not provided'}${formEntries.securityPreferences ? '\nSecurity Preferences: ' + formEntries.securityPreferences : ''}${formEntries.emergencyName1 ? '\nEmergency Contact: ' + formEntries.emergencyName1 + ' (' + formEntries.emergencyPhone1 + ')' : ''}`;
        } else if (serviceType === 'emergency-cybersecurity') {
            const actionsTaken = formEntries.actionsTaken ? JSON.parse(formEntries.actionsTaken as string) : [];
            description = `Incident Type: ${formEntries.incidenttype || 'Unknown'}\nAffected: ${formEntries.affectedaccounts || 'Not specified'}\nDiscovered: ${formEntries.whendiscovered || 'Unknown'}${actionsTaken.length > 0 ? '\nActions Taken: ' + actionsTaken.join('; ') : ''}\nDetails: ${formEntries.incidentdetails || ''}`;
        } else if (serviceType === 'laptop-smartphone-repair') {
            description = `Device: ${formEntries.devicetype || 'Unknown'}\nProblem: ${formEntries.deviceproblem || ''}`;
        } else if (serviceType === 'social-media-privacy-scan') {
            const platforms = formEntries.platforms ? JSON.parse(formEntries.platforms as string) : [];
            const profileUrls = formEntries.profileUrls ? JSON.parse(formEntries.profileUrls as string) : [];
            const securityConcerns = formEntries.securityConcerns ? JSON.parse(formEntries.securityConcerns as string) : [];

            description = `Platforms: ${platforms.join(', ') || 'Not specified'}\nProfile URLs: ${profileUrls.join(', ') || 'Not provided'}${securityConcerns.length > 0 ? '\nSecurity Concerns: ' + securityConcerns.join(', ') : ''}`;
        } else if (serviceType === 'remove-information-internet') {
            const removalReasons = formEntries.removalReasons ? JSON.parse(formEntries.removalReasons as string) : [];
            description = `Personal Info: ${formEntries.personalinfo || 'Not specified'}\nWebsites: ${formEntries.websiteplatforms || 'Not specified'}\nUrgency: ${formEntries.removalUrgency || 'normal'}${removalReasons.length > 0 ? '\nReasons: ' + removalReasons.join('; ') : ''}`;
        } else if (serviceType === 'password-reset-hacked') {
            const affectedAccounts = formEntries.affectedAccounts ? JSON.parse(formEntries.affectedAccounts as string) : [];
            const whatHappened = formEntries.whatHappened ? JSON.parse(formEntries.whatHappened as string) : [];
            const accountsList = affectedAccounts.map((a: { category: string; platform: string; customPlatform?: string }) =>
                a.customPlatform || a.platform
            ).join(', ');
            description = `Compromised Accounts: ${accountsList || 'Not specified'}\nRecovery Email: ${formEntries.recoveryemail || 'Not provided'}${whatHappened.length > 0 ? '\nWhat Happened: ' + whatHappened.join('; ') : ''}`;
        } else if (serviceType === 'home-security-assessment') {
            const securityConcerns = formEntries.securityConcerns ? JSON.parse(formEntries.securityConcerns as string) : [];
            description = `Floors: ${formEntries.numberoffloors || 'Unknown'}\nSmart Devices: ${formEntries.smartdevicescount || 'Unknown'}\nSecurity Cameras: ${formEntries.securitycameras || 'Unknown'}\nAddress: ${formEntries.homeaddress || 'Not provided'}${securityConcerns.length > 0 ? '\nConcerns: ' + securityConcerns.join('; ') : ''}`;
        } else if (serviceType === 'phishing-link-response') {
            description = `Link: ${formEntries.phishinglink || formEntries.clickedlink || 'Unknown'}\nDetails: ${formEntries.phishingdetails || ''}`;
        } else if (serviceType === 'malware-removal') {
            description = `Malware Type: ${formEntries.malwaretype || 'Unknown'}\nDetails: ${formEntries.malwaredetails || ''}`;
        } else if (serviceType === 'data-recovery') {
            description = `Lost Data: ${formEntries.lostdata || 'Unknown'}\nRecovery Details: ${formEntries.recoverydetails || ''}`;
        } else if (serviceType === 'cybersecurity-awareness-training') {
            description = `Subject: ${formEntries.awarenessSubject || 'Unknown'}\nPlace: ${formEntries.awarenessPlace || 'Unknown'}\nAudience: ${formEntries.audienceNumber || 'Unknown'} ${formEntries.audienceType || 'participants'}\nDate: ${formEntries.preferredDate || 'TBD'} at ${formEntries.preferredTime || 'TBD'}\nDuration: ${formEntries.trainingDuration || 'Unknown'}\nObjectives: ${formEntries.trainingObjectives || 'Not specified'}${formEntries.additionalRequirements ? '\nAdditional Requirements: ' + formEntries.additionalRequirements : ''}`;
        } else if (serviceType === 'parental-controls') {
            description = `Child Age: ${formEntries.childage || 'Unknown'}\nControls: ${formEntries.parentalcontrols || ''}`;
        }

        // If no specific description was built, create a generic one
        if (!description && Object.keys(formEntries).length > 0) {
            const fields = Object.entries(formEntries)
                .filter(([key, value]) => value && key !== 'consultationType')
                .map(([key, value]) => `${key}: ${value}`)
                .join('\n');
            description = fields || 'Service request details';
        }

        const [saved] = await withRetry(async () => {
            return await db
                .insert(serviceData)
                .values({
                    userId,
                    serviceType,
                    status: 'pending',
                    priority,
                    title,
                    description,
                    data: formEntries
                })
                .returning();
        });

        return {
            success: true,
            message: 'Service request submitted successfully and is awaiting admin assignment to an expert',
            data: saved
        };
    } catch (error: any) {
        console.log('Error saving service request: ', error);
        return {
            success: false,
            message: error.message || 'Failed to submit service request'
        }
    }
}

// Helper function to get readable service type names
function getServiceTypeName(serviceType: string): string {
    const serviceTypeMap: { [key: string]: string } = {
        'personal-security': 'Personal Security Assessment',
        'family-protection': 'Family Security Protection',
        'home-network': 'Home Network Security',
        'identity-protection': 'Identity Protection',
        'financial-security': 'Financial Security',
        'business-consultation': 'Small Business Security',
        'device-security': 'Device & Technology Security',
        'privacy-review': 'Privacy Settings Review',
        'threat-assessment': 'Threat Assessment',
        'security-training': 'Security Awareness Training',
        'incident-response': 'Incident Response Planning',
        'general-guidance': 'General Security Guidance',
        'general-consultation': 'General Consultation',
        'cybersecurity-bodyguard': 'Cybersecurity Bodyguard Service'
    };

    return serviceTypeMap[serviceType] || 'General Consultation';
}
