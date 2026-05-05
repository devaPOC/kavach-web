import { NextRequest, NextResponse } from 'next/server';
import { PricingService } from '@/lib/services/pricing/pricing.service';
import { cookieManager } from '@/lib/auth/unified-session-manager';
import { db } from '@/lib/database';
import { serviceQuotes, users, serviceData } from '@/lib/database/schema';
import { eq, desc } from 'drizzle-orm';

// GET /api/v1/customer/quotes - Get customer's quotes
export async function GET(request: NextRequest) {
  try {
    const sessionResult = await cookieManager.getSessionFromCookies(request);
    if (!sessionResult) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (sessionResult.role !== 'customer') {
      return NextResponse.json(
        { success: false, error: 'Customer access required' },
        { status: 403 }
      );
    }

    // Get quotes with related data
    const quotes = await db
      .select({
        id: serviceQuotes.id,
        serviceRequestId: serviceQuotes.serviceRequestId,
        quoteNumber: serviceQuotes.quoteNumber,
        quotedPrice: serviceQuotes.quotedPrice,
        currency: serviceQuotes.currency,
        status: serviceQuotes.status,
        description: serviceQuotes.description,
        validUntil: serviceQuotes.validUntil,
        acceptedAt: serviceQuotes.acceptedAt,
        rejectedAt: serviceQuotes.rejectedAt,
        rejectionReason: serviceQuotes.rejectionReason,
        createdAt: serviceQuotes.createdAt,
        updatedAt: serviceQuotes.updatedAt,
        customerName: users.firstName,
        customerEmail: users.email,
        adminName: users.firstName,
        serviceTitle: serviceData.title,
        serviceType: serviceData.serviceType,
      })
      .from(serviceQuotes)
      .leftJoin(users, eq(serviceQuotes.customerId, users.id))
      .leftJoin(serviceData, eq(serviceQuotes.serviceRequestId, serviceData.id))
      .where(eq(serviceQuotes.customerId, sessionResult.userId))
      .orderBy(desc(serviceQuotes.createdAt));

    return NextResponse.json({
      success: true,
      data: quotes,
    });
  } catch (error) {
    console.error('Error fetching customer quotes:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}