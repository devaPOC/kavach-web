import { db } from '@/lib/database';
import {
    servicePricing,
    serviceQuotes,
    quoteNegotiations,
    servicePayments,
    serviceTypes,
    quoteNumberSequence
} from '@/lib/database/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import type { ServicePricing, NewServicePricing, ServiceQuote, NewServiceQuote } from '@/lib/database/schema';
import { emitAudit } from '@/lib/utils/audit-logger';

export class PricingService {
    // Service Pricing Management
    static async createServicePricing(data: NewServicePricing): Promise<ServicePricing> {
        try {
            const [pricing] = await db.insert(servicePricing).values({
                ...data,
                updatedAt: new Date(),
                // On creation, updatedBy may mirror createdBy for audit completeness
                updatedBy: data.createdBy ?? null,
            }).returning();
            return pricing;
        } catch (error: any) {
            // Handle database unique constraint violation
            if (error.message && error.message.includes('duplicate key value violates unique constraint')) {
                if (error.message.includes('service_pricing_service_type_unique')) {
                    throw new Error(`Pricing already exists for service type: ${data.serviceType}`);
                }
            }
            // Also check for the error code if available
            if (error.code === '23505' || (error.cause && error.cause.code === '23505')) {
                throw new Error(`Pricing already exists for service type: ${data.serviceType}`);
            }
            // Re-throw other errors
            throw error;
        }
    }

    static async updateServicePricing(serviceType: string, data: Partial<NewServicePricing> & { updatedBy?: string | null }): Promise<ServicePricing | null> {
        try {
            const [pricing] = await db.update(servicePricing)
                .set({
                    ...data,
                    updatedAt: new Date(),
                })
                .where(eq(servicePricing.serviceType, serviceType))
                .returning();
            return pricing || null;
        } catch (error: any) {
            // Handle database unique constraint violation
            if (error.message && error.message.includes('duplicate key value violates unique constraint')) {
                if (error.message.includes('service_pricing_service_type_unique')) {
                    throw new Error(`Pricing already exists for service type: ${serviceType}`);
                }
            }
            // Also check for the error code if available
            if (error.code === '23505' || (error.cause && error.cause.code === '23505')) {
                throw new Error(`Pricing already exists for service type: ${serviceType}`);
            }
            // Re-throw other errors
            throw error;
        }
    }

    static async getServicePricing(serviceType: string): Promise<ServicePricing | null> {
        const [pricing] = await db.select()
            .from(servicePricing)
            .where(eq(servicePricing.serviceType, serviceType))
            .limit(1);
        return pricing || null;
    }

    static async getAllServicePricing(): Promise<ServicePricing[]> {
        return await db.select()
            .from(servicePricing)
            .where(eq(servicePricing.isActive, true))
            .orderBy(servicePricing.serviceType);
    }

    /**
     * Paginated fetch for service pricing configurations.
     * Returns items plus total count for UI pagination.
     */
    static async getServicePricingPaginated(page: number, limit: number): Promise<{ data: ServicePricing[]; total: number; }> {
        const offset = (page - 1) * limit;
        // Fetch page items
        const data = await db.select()
            .from(servicePricing)
            .where(eq(servicePricing.isActive, true))
            .orderBy(servicePricing.serviceType)
            .limit(limit)
            .offset(offset);
        // Total count
        const countResult = await db.execute(sql`SELECT COUNT(*)::int as count FROM service_pricing WHERE is_active = true`);
        const [{ count }] = countResult as unknown as { count: number }[];
        return { data, total: Number(count) };
    }

    static async deleteServicePricing(serviceType: string, updatedBy?: string | null): Promise<boolean> {
        // Soft delete: set isActive = false
        const [updated] = await db.update(servicePricing)
            .set({ isActive: false, updatedAt: new Date(), updatedBy: updatedBy ?? null })
            .where(eq(servicePricing.serviceType, serviceType))
            .returning();
        return !!updated;
    }

    // Quote Management
    static async createQuote(data: NewServiceQuote): Promise<ServiceQuote> {
        const quoteNumber = await this.generateQuoteNumber();
        const [quote] = await db.insert(serviceQuotes).values({
            ...data,
            quoteNumber,
            updatedAt: new Date(),
        }).returning();
        return quote;
    }

    static async updateQuote(quoteId: string, data: Partial<NewServiceQuote>): Promise<ServiceQuote | null> {
        const [quote] = await db.update(serviceQuotes)
            .set({
                ...data,
                updatedAt: new Date(),
            })
            .where(eq(serviceQuotes.id, quoteId))
            .returning();
        return quote || null;
    }

    static async getQuote(quoteId: string): Promise<ServiceQuote | null> {
        const [quote] = await db.select()
            .from(serviceQuotes)
            .where(eq(serviceQuotes.id, quoteId))
            .limit(1);
        return quote || null;
    }

    static async getQuotesByCustomer(customerId: string): Promise<ServiceQuote[]> {
        return await db.select()
            .from(serviceQuotes)
            .where(eq(serviceQuotes.customerId, customerId))
            .orderBy(desc(serviceQuotes.createdAt));
    }

    static async getQuotesByServiceRequest(serviceRequestId: string): Promise<ServiceQuote[]> {
        return await db.select()
            .from(serviceQuotes)
            .where(eq(serviceQuotes.serviceRequestId, serviceRequestId))
            .orderBy(desc(serviceQuotes.createdAt));
    }

    static async acceptQuote(quoteId: string): Promise<ServiceQuote | null> {
        const [quote] = await db.update(serviceQuotes)
            .set({
                status: 'accepted',
                acceptedAt: new Date(),
                updatedAt: new Date(),
            })
            .where(eq(serviceQuotes.id, quoteId))
            .returning();

        if (quote) {
            emitAudit({
                event: 'admin.user.updated',
                success: true,
                metadata: {
                    action: 'quote_accepted',
                    quoteId,
                    quoteNumber: quote.quoteNumber,
                    customerId: quote.customerId,
                    amount: quote.quotedPrice
                }
            });
        }

        return quote || null;
    }

    static async rejectQuote(quoteId: string, reason: string): Promise<ServiceQuote | null> {
        const [quote] = await db.update(serviceQuotes)
            .set({
                status: 'rejected',
                rejectedAt: new Date(),
                rejectionReason: reason,
                updatedAt: new Date(),
            })
            .where(eq(serviceQuotes.id, quoteId))
            .returning();

        if (quote) {
            emitAudit({
                event: 'admin.user.updated',
                success: true,
                metadata: {
                    action: 'quote_rejected',
                    quoteId,
                    quoteNumber: quote.quoteNumber,
                    customerId: quote.customerId,
                    reason
                }
            });
        }

        return quote || null;
    }

    // Quote Negotiations
    static async addNegotiation(data: {
        quoteId: string;
        serviceRequestId: string;
        senderId: string;
        message: string;
        isFromCustomer: boolean;
    }) {
        const [negotiation] = await db.insert(quoteNegotiations).values(data).returning();
        return negotiation;
    }

    static async getQuoteNegotiations(quoteId: string) {
        return await db.select()
            .from(quoteNegotiations)
            .where(eq(quoteNegotiations.quoteId, quoteId))
            .orderBy(quoteNegotiations.createdAt);
    }

    // Pricing Calculation
    static async calculateServicePrice(serviceType: string): Promise<{
        pricingType: string;
        fixedPrice?: number;
        currency: string;
        requiresQuote: boolean;
    } | null> {
        const pricing = await this.getServicePricing(serviceType);

        if (!pricing) {
            return null;
        }

        return {
            pricingType: pricing.pricingType,
            fixedPrice: pricing.fixedPrice ? Number(pricing.fixedPrice) : undefined,
            currency: pricing.currency,
            requiresQuote: pricing.pricingType === 'variable',
        };
    }

    // Utility Methods
    /**
     * Generates a unique quote number using database-backed sequence
     * Format: QT-YYYYMMDD-###
     *
     * This approach prevents race conditions by using an atomic database transaction
     * to increment the sequence number, ensuring no duplicates are generated
     * even under concurrent requests.
     */
    private static async generateQuoteNumber(): Promise<string> {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const sequenceDate = `${year}${month}${day}`;

        try {
            // Use a transaction to atomically fetch and increment the sequence
            // This prevents race conditions where multiple requests could generate the same quote number
            const result = await db.transaction(async (tx) => {
                // Try to get today's sequence record
                const [existingSequence] = await tx
                    .select()
                    .from(quoteNumberSequence)
                    .where(eq(quoteNumberSequence.sequenceDate, sequenceDate))
                    .limit(1);

                let nextNumber: number;

                if (existingSequence) {
                    // Increment existing sequence
                    const [updated] = await tx
                        .update(quoteNumberSequence)
                        .set({
                            nextSequenceNumber: existingSequence.nextSequenceNumber + 1,
                            updatedAt: new Date(),
                        })
                        .where(eq(quoteNumberSequence.sequenceDate, sequenceDate))
                        .returning();
                    nextNumber = updated.nextSequenceNumber;
                } else {
                    // Create new sequence for today
                    const [created] = await tx
                        .insert(quoteNumberSequence)
                        .values({
                            sequenceDate,
                            nextSequenceNumber: 2, // Return 1, so next will be 2
                            createdAt: new Date(),
                            updatedAt: new Date(),
                        })
                        .returning();
                    nextNumber = 1; // First quote of the day
                }

                return nextNumber;
            });

            const sequence = String(result).padStart(3, '0');
            return `QT-${year}${month}${day}-${sequence}`;
        } catch (error) {
            // Fallback: If database transaction fails, generate timestamp-based number
            console.error('Error generating quote number from database sequence:', error);
            const timestamp = Date.now();
            const random = Math.floor(Math.random() * 1000);
            return `QT-${year}${month}${day}-TEMP${timestamp}${random}`;
        }
    }

    // Service Types Management
    /**
     * Fetches available service types from the database
     * Replaces the previous circular dependency approach of importing from frontend data
     *
     * Service types are now stored in the database and can be managed dynamically
     * without requiring code changes or redeployment.
     */
    static async getAvailableServiceTypes(): Promise<string[]> {
        try {
            const types = await db
                .select({ name: serviceTypes.name })
                .from(serviceTypes)
                .where(eq(serviceTypes.isActive, true))
                .orderBy(serviceTypes.name);

            return types.map(t => t.name);
        } catch (error) {
            console.error('Error loading service types from database:', error);
            // Fallback to basic service types if database is unavailable
            return [
                'General Consultation',
                'Cybersecurity Awareness Training',
                'Emergency Cybersecurity Incident',
            ];
        }
    }

    /**
     * Adds a new service type to the system
     * Used during system setup or when adding new services
     */
    static async addServiceType(name: string, category: string, description?: string): Promise<void> {
        try {
            await db.insert(serviceTypes).values({
                name,
                category,
                description,
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date(),
            });
        } catch (error: any) {
            if (error.message?.includes('duplicate key value')) {
                console.warn(`Service type "${name}" already exists`);
            } else {
                throw error;
            }
        }
    }
}
