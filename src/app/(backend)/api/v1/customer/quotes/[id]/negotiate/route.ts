import { NextRequest, NextResponse } from 'next/server';
import { PricingService } from '@/lib/services/pricing/pricing.service';
import { cookieManager } from '@/lib/auth/unified-session-manager';
import { z } from 'zod';

const negotiateSchema = z.object({
  message: z.string().min(1, 'Message is required'),
});

// POST /api/v1/customer/quotes/[id]/negotiate - Send negotiation message
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

    const body = await request.json();
    const { message } = negotiateSchema.parse(body);
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
        { success: false, error: 'Cannot negotiate on this quote' },
        { status: 400 }
      );
    }

    // Add negotiation message
    const negotiation = await PricingService.addNegotiation({
      quoteId,
      serviceRequestId: quote.serviceRequestId,
      senderId: sessionResult.userId,
      message,
      isFromCustomer: true,
    });

    return NextResponse.json({
      success: true,
      data: negotiation,
      message: 'Negotiation message sent successfully',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.issues[0].message },
        { status: 400 }
      );
    }

    console.error('Error sending negotiation:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}