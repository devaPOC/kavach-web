import { NextRequest, NextResponse } from 'next/server';
import { PricingService } from '@/lib/services/pricing/pricing.service';
import { cookieManager } from '@/lib/auth/unified-session-manager';

// GET /api/v1/customer/quotes/[id]/negotiations - Get quote negotiations
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    const quoteId = id;

    // Verify the quote belongs to the customer
    const quote = await PricingService.getQuote(quoteId);
    if (!quote) {
      return NextResponse.json(
        { success: false, error: 'Quote not found' },
        { status: 404 }
      );
    }

    if (quote.customerId !== sessionResult.userId) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      );
    }

    const negotiations = await PricingService.getQuoteNegotiations(quoteId);

    return NextResponse.json({
      success: true,
      data: negotiations,
    });
  } catch (error) {
    console.error('Error fetching negotiations:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}