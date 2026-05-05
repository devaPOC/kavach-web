/**
 * Helper to build service request description from form data
 */
export function buildServiceDescription(serviceType: string, formEntries: any): string {
	let description = '';

	if (serviceType === 'general-consultation') {
		description = `Consultation Type: ${formEntries.consultationType || 'General'}\nFamily Members: ${formEntries.familyMembers || 'Not specified'}\nSpecific Questions: ${formEntries.specificQuestions || ''}\nCurrent Security Setup: ${formEntries.currentSecuritySetup || 'Not specified'}${formEntries.devicesUsed ? '\nDevices Used: ' + formEntries.devicesUsed : ''}${formEntries.internetUsage ? '\nInternet Usage: ' + formEntries.internetUsage : ''}`;
	} else if (serviceType === 'cybersecurity-bodyguard') {
		const selectedAssetsData = typeof formEntries.selectedAssets === 'string' ? JSON.parse(formEntries.selectedAssets) : (formEntries.selectedAssets || []);
		description = `Protection Level: ${formEntries.protectionLevel || 'Unknown'}\nSelected Assets: ${Array.isArray(selectedAssetsData) ? selectedAssetsData.join(', ') : selectedAssetsData}\nAsset Details: ${formEntries.assetDetails || 'Not provided'}\nPrimary Contact: ${formEntries.primaryPhone || 'Not provided'} / ${formEntries.primaryEmail || 'Not provided'}${formEntries.securityPreferences ? '\nSecurity Preferences: ' + formEntries.securityPreferences : ''}${formEntries.emergencyName1 ? '\nEmergency Contact: ' + formEntries.emergencyName1 + ' (' + formEntries.emergencyPhone1 + ')' : ''}`;
	} else if (serviceType === 'emergency-cybersecurity') {
		const actionsTaken = typeof formEntries.actionsTaken === 'string' ? JSON.parse(formEntries.actionsTaken) : (formEntries.actionsTaken || []);
		description = `Incident Type: ${formEntries.incidenttype || 'Unknown'}\nAffected: ${formEntries.affectedaccounts || 'Not specified'}\nDiscovered: ${formEntries.whendiscovered || 'Unknown'}${Array.isArray(actionsTaken) && actionsTaken.length > 0 ? '\nActions Taken: ' + actionsTaken.join('; ') : ''}\nDetails: ${formEntries.incidentdetails || ''}`;
	} else if (serviceType === 'laptop-smartphone-repair') {
		description = `Device: ${formEntries.devicetype || 'Unknown'}\nProblem: ${formEntries.deviceproblem || ''}`;
	} else if (serviceType === 'social-media-privacy-scan') {
		const platforms = typeof formEntries.platforms === 'string' ? JSON.parse(formEntries.platforms) : (formEntries.platforms || []);
		const profileUrls = typeof formEntries.profileUrls === 'string' ? JSON.parse(formEntries.profileUrls) : (formEntries.profileUrls || []);
		const securityConcerns = typeof formEntries.securityConcerns === 'string' ? JSON.parse(formEntries.securityConcerns) : (formEntries.securityConcerns || []);

		description = `Platforms: ${Array.isArray(platforms) ? platforms.join(', ') : platforms}\nProfile URLs: ${Array.isArray(profileUrls) ? profileUrls.join(', ') : profileUrls}${Array.isArray(securityConcerns) && securityConcerns.length > 0 ? '\nSecurity Concerns: ' + securityConcerns.join(', ') : ''}`;
	} else if (serviceType === 'remove-information-internet') {
		const removalReasons = typeof formEntries.removalReasons === 'string' ? JSON.parse(formEntries.removalReasons) : (formEntries.removalReasons || []);
		description = `Personal Info: ${formEntries.personalinfo || 'Not specified'}\nWebsites: ${formEntries.websiteplatforms || 'Not specified'}\nUrgency: ${formEntries.removalUrgency || 'normal'}${Array.isArray(removalReasons) && removalReasons.length > 0 ? '\nReasons: ' + removalReasons.join('; ') : ''}`;
	} else if (serviceType === 'password-reset-hacked') {
		const affectedAccounts = typeof formEntries.affectedAccounts === 'string' ? JSON.parse(formEntries.affectedAccounts) : (formEntries.affectedAccounts || []);
		const whatHappened = typeof formEntries.whatHappened === 'string' ? JSON.parse(formEntries.whatHappened) : (formEntries.whatHappened || []);
		const accountsList = Array.isArray(affectedAccounts) ? affectedAccounts.map((a: any) =>
			a.customPlatform || a.platform
		).join(', ') : (affectedAccounts || 'Not specified');
		description = `Compromised Accounts: ${accountsList}\nRecovery Email: ${formEntries.recoveryemail || 'Not provided'}${Array.isArray(whatHappened) && whatHappened.length > 0 ? '\nWhat Happened: ' + whatHappened.join('; ') : ''}`;
	} else if (serviceType === 'home-security-assessment') {
		const securityConcerns = typeof formEntries.securityConcerns === 'string' ? JSON.parse(formEntries.securityConcerns) : (formEntries.securityConcerns || []);
		description = `Floors: ${formEntries.numberoffloors || 'Unknown'}\nSmart Devices: ${formEntries.smartdevicescount || 'Unknown'}\nSecurity Cameras: ${formEntries.securitycameras || 'Unknown'}\nAddress: ${formEntries.homeaddress || 'Not provided'}${Array.isArray(securityConcerns) && securityConcerns.length > 0 ? '\nConcerns: ' + securityConcerns.join('; ') : ''}`;
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
			.filter(([key, value]) => value && key !== 'consultationType' && key !== 'serviceType')
			.map(([key, value]) => `${key}: ${value}`)
			.join('\n');
		description = fields || 'Service request details';
	}

	return description;
}
