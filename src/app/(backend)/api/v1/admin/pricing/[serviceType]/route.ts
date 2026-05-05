import { NextRequest, NextResponse } from 'next/server';
import { PricingService } from '@/lib/services/pricing/pricing.service';
import { cookieManager } from '@/lib/auth/unified-session-manager';
import { z } from 'zod';

// Price bounds consistent with creation route
const MIN_PRICE = 0.1;
const MAX_PRICE = 100000;

const updatePricingSchema = z.object({
  pricingType: z.enum(['fixed', 'variable']).optional(),
  fixedPrice: z.number().min(MIN_PRICE, `Fixed price must be >= ${MIN_PRICE}`).max(MAX_PRICE, `Fixed price must be <= ${MAX_PRICE}`).optional().nullable(),
  currency: z.string().length(3).optional(),
  description: z.string().max(1000, 'Description too long').optional().nullable(),
}).refine(data => {
  // If pricingType explicitly changed to variable, ensure fixedPrice omitted
  if (data.pricingType === 'variable' && data.fixedPrice != null) return false;
  // If pricingType fixed, must have fixedPrice
  if (data.pricingType === 'fixed' && data.fixedPrice == null) return false;
  return true;
}, {
  message: 'Fixed price required for fixed type; omit fixedPrice for variable type',
  path: ['fixedPrice']
});

// GET /api/v1/admin/pricing/[serviceType] - Get specific service pricing
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

    if (sessionResult.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      );
    }

    const { serviceType } = await params;
    const decodedServiceType = decodeURIComponent(serviceType);
    const pricing = await PricingService.getServicePricing(decodedServiceType);

    if (!pricing) {
      return NextResponse.json(
        { success: false, error: 'Pricing not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: pricing,
    });
  } catch (error) {
    console.error('Error fetching pricing:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/v1/admin/pricing/[serviceType] - Update service pricing
export async function PUT(
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

    if (sessionResult.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      );
    }

    const { serviceType } = await params;
    const decodedServiceType = decodeURIComponent(serviceType);
    const body = await request.json();
    const validatedData = updatePricingSchema.parse(body);

    // (Additional validation handled by schema refinement)

    const pricing = await PricingService.updateServicePricing(decodedServiceType, {
      ...validatedData,
      fixedPrice: validatedData.fixedPrice != null ? validatedData.fixedPrice.toString() : null,
      minPrice: null,
      maxPrice: null,
      updatedBy: sessionResult.userId,
    });

    if (!pricing) {
      return NextResponse.json(
        { success: false, error: 'Pricing not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: pricing,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.issues[0].message },
        { status: 400 }
      );
    }

    console.error('Error updating pricing:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/v1/admin/pricing/[serviceType] - Delete service pricing
export async function DELETE(
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

    if (sessionResult.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      );
    }

    const { serviceType } = await params;
    const decodedServiceType = decodeURIComponent(serviceType);
    const success = await PricingService.deleteServicePricing(decodedServiceType, sessionResult.userId);

    if (!success) {
      return NextResponse.json(
        { success: false, error: 'Pricing not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Pricing deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting pricing:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
