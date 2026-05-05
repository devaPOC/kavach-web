import { NextRequest, NextResponse } from 'next/server';
import { PricingService } from '@/lib/services/pricing/pricing.service';
import { cookieManager } from '@/lib/auth/unified-session-manager';

// POST /api/v1/customer/quotes/[id]/accept - Accept a quote
export async function POST(
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

    if (quote.status !== 'pending' && quote.status !== 'sent') {
      return NextResponse.json(
        { success: false, error: 'Quote cannot be accepted in its current status' },
        { status: 400 }
      );
    }

    // Check if quote is expired
    if (quote.validUntil && new Date() > new Date(quote.validUntil)) {
      return NextResponse.json(
        { success: false, error: 'Quote has expired' },
        { status: 400 }
      );
    }

    const updatedQuote = await PricingService.acceptQuote(quoteId);

    if (!updatedQuote) {
      return NextResponse.json(
        { success: false, error: 'Failed to accept quote' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: updatedQuote,
      message: 'Quote accepted successfully',
    });
  } catch (error) {
    console.error('Error accepting quote:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}