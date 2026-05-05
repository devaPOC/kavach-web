import { NextRequest, NextResponse } from 'next/server';
import { PricingService } from '@/lib/services/pricing/pricing.service';
import { cookieManager } from '@/lib/auth/unified-session-manager';

// GET /api/v1/pricing/check/[serviceType] - Check pricing for a service type
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ serviceType: string }> }
) {
  try {
    const sessionResult = await cookieManager.getSessionFromCookies(request);
    if (!sessionResult) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { serviceType } = await params;
    const decodedServiceType = decodeURIComponent(serviceType);
    const pricing = await PricingService.calculateServicePrice(decodedServiceType);

    if (!pricing) {
      const res = NextResponse.json({
        success: true,
        data: {
          pricingType: 'variable',
          requiresQuote: true,
          currency: 'INR',
          message: 'No pricing configured for this service. A custom quote will be provided.',
        },
      });
      // Basic private caching for 5 minutes
      res.headers.set('Cache-Control', 'private, max-age=300');
      res.headers.set('Vary', 'Authorization');
      return res;
    }

    const res = NextResponse.json({
      success: true,
      data: pricing,
    });
    res.headers.set('Cache-Control', 'private, max-age=300');
    res.headers.set('Vary', 'Authorization');
    return res;
  } catch (error) {
    console.error('Error checking pricing:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
