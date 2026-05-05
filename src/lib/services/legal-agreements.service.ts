import { BaseService } from './base.service';
import { legalAgreements, type NewLegalAgreement } from '@/lib/database/schema';
import { db } from '@/lib/database/connection';
import { eq, desc } from 'drizzle-orm';
import { LEGAL_DOCUMENTS, type LegalDocumentType, type ExpertLegalDocumentType, type CustomerLegalDocumentType } from '@/lib/constants/legal-documents';
import { createServiceSuccess, createServiceError, type ServiceResult } from '@/lib/errors/response-utils';
import { ValidationError } from '@/lib/errors/custom-errors';
import { withServiceErrorHandler } from '@/lib/errors/error-handler';
import type { RequestContext } from './auth/authentication.service';

export interface LegalAgreementAcceptance {
  userId: string;
  agreementType: LegalDocumentType;
  ipAddress: string;
  userAgent?: string;
}

/**
 * Service for handling legal agreement acceptances
 */
export class LegalAgreementsService extends BaseService {
  /**
   * Record acceptance of legal agreements for a user
   */
  async recordAgreementAcceptances(
    acceptances: LegalAgreementAcceptance[],
    context: RequestContext
  ): Promise<ServiceResult<{ recorded: number }>> {
    return withServiceErrorHandler(async () => {
      if (!acceptances || acceptances.length === 0) {
        const validationError = ValidationError.invalidInput(
          'No agreements to record',
          undefined,
          context.correlationId
        );
        return createServiceError(validationError);
      }

      const recordedAgreements: NewLegalAgreement[] = [];

      for (const acceptance of acceptances) {
        const document = LEGAL_DOCUMENTS[acceptance.agreementType];
        if (!document) {
          const validationError = ValidationError.invalidInput(
            `Invalid agreement type: ${acceptance.agreementType}`,
            undefined,
            context.correlationId
          );
          return createServiceError(validationError);
        }

        recordedAgreements.push({
          userId: acceptance.userId,
          agreementName: document.name,
          agreementVersion: document.version,
          agreementContent: document.content,
          ipAddress: acceptance.ipAddress,
          userAgent: acceptance.userAgent,
          acceptedAt: new Date()
        });
      }

      // Insert all agreements in a single transaction
      await db.insert(legalAgreements).values(recordedAgreements);

      this.logger.info('Legal agreements recorded', {
        userId: acceptances[0].userId,
        agreementCount: recordedAgreements.length,
        agreementTypes: acceptances.map(a => a.agreementType),
        correlationId: context.correlationId
      });

      this.audit({
        event: 'profile.created',
        userId: acceptances[0].userId,
        success: true,
        ip: acceptances[0].ipAddress,
        metadata: {
          action: 'legal_agreements_accepted',
          agreementCount: recordedAgreements.length,
          agreementTypes: acceptances.map(a => a.agreementType)
        }
      });

      return createServiceSuccess({
        recorded: recordedAgreements.length
      });
    }, (context as any));
  }

  /**
   * Get all agreement acceptances for a user
   */
  async getUserAgreements(
    userId: string,
    context: RequestContext
  ): Promise<ServiceResult<any[]>> {
    return withServiceErrorHandler(async () => {
      const userAgreements = await db
        .select()
        .from(legalAgreements)
        .where(eq(legalAgreements.userId, userId))
        .orderBy(desc(legalAgreements.acceptedAt));

      return createServiceSuccess(userAgreements);
    }, (context as any));
  }

  /**
   * Check if user has accepted all required agreements for their role
   */
  async hasUserAcceptedRequiredAgreements(
    userId: string,
    role: 'customer' | 'expert',
    context: RequestContext
  ): Promise<ServiceResult<{ hasAccepted: boolean; missingAgreements: LegalDocumentType[] }>> {
    return withServiceErrorHandler(async () => {
      let requiredAgreements: LegalDocumentType[];

      if (role === 'customer') {
        requiredAgreements = [
          'CUSTOMER_SERVICES_AGREEMENT',
          'CUSTOMER_INFORMED_CONSENT',
          'CUSTOMER_DATA_PROCESSING_CONSENT',
          'DISPUTE_RESOLUTION_ARBITRATION',
          'ACCEPTABLE_USE_POLICY'
        ] as CustomerLegalDocumentType[];
      } else {
        requiredAgreements = [
          'NDA',
          'CONTRACTOR_AGREEMENT',
          'BACKGROUND_CHECK_CONSENT',
          'DATA_PRIVACY_AGREEMENT',
          'TERMS_OF_SERVICE',
          'CODE_OF_CONDUCT'
        ] as ExpertLegalDocumentType[];
      }

      const userAgreements = await db
        .select({
          agreementName: legalAgreements.agreementName
        })
        .from(legalAgreements)
        .where(eq(legalAgreements.userId, userId));

      const acceptedAgreementNames = userAgreements.map(a => a.agreementName);
      const missingAgreements: LegalDocumentType[] = [];

      for (const agreementType of requiredAgreements) {
        const document = LEGAL_DOCUMENTS[agreementType];
        if (!acceptedAgreementNames.includes(document.name)) {
          missingAgreements.push(agreementType);
        }
      }

      return createServiceSuccess({
        hasAccepted: missingAgreements.length === 0,
        missingAgreements
      });
    }, (context as any));
  }
}

// Export singleton instance
export const legalAgreementsService = new LegalAgreementsService();
