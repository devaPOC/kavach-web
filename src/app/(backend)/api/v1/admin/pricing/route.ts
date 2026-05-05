import { NextRequest, NextResponse } from 'next/server';
import { PricingService } from '@/lib/services/pricing/pricing.service';
import { cookieManager } from '@/lib/auth/unified-session-manager';
import { z } from 'zod';

// Price bounds (business rule)
const MIN_PRICE = 0.1; // OMR
const MAX_PRICE = 100000; // OMR

const createPricingSchema = z.object({
  serviceType: z.string().min(1, 'Service type is required'),
  pricingType: z.enum(['fixed', 'variable']),
  fixedPrice: z.number().min(MIN_PRICE, `Fixed price must be >= ${MIN_PRICE}`).max(MAX_PRICE, `Fixed price must be <= ${MAX_PRICE}`).optional().nullable(),
  currency: z.string().length(3).default('OMR'),
  description: z.string().max(1000, 'Description too long').optional().nullable(),
}).refine(data => {
  // If variable pricing, fixedPrice must be null/undefined
  if (data.pricingType === 'variable') {
    return data.fixedPrice == null;
  }
  // If fixed pricing, fixedPrice must be provided (schema min already checks positive)
  if (data.pricingType === 'fixed') {
    return data.fixedPrice != null;
  }
  return true;
}, {
  message: 'Fixed price required for fixed type; omit fixedPrice for variable type',
  path: ['fixedPrice']
});

// GET /api/v1/admin/pricing - Get all service pricing
export async function GET(request: NextRequest) {
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

    // Pagination params
    const { searchParams } = new URL(request.url);
    const pageParam = searchParams.get('page');
    const limitParam = searchParams.get('limit');
    const page = pageParam ? Math.max(1, parseInt(pageParam, 10)) : 1;
    const limit = limitParam ? Math.min(100, Math.max(1, parseInt(limitParam, 10))) : 50;

    const { data, total } = await PricingService.getServicePricingPaginated(page, limit);

    return NextResponse.json({
      success: true,
      data: {
        items: data,
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      },
    });
  } catch (error) {
    console.error('Error fetching pricing list:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/v1/admin/pricing - Create new service pricing
export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const validatedData = createPricingSchema.parse(body);

    // Note: Duplicate service type check is handled by database unique constraint

    const pricing = await PricingService.createServicePricing({
      ...validatedData,
      fixedPrice: validatedData.fixedPrice != null ? validatedData.fixedPrice.toString() : null,
      minPrice: null,
      maxPrice: null,
      createdBy: sessionResult.userId,
      updatedBy: sessionResult.userId,
    });

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

    // Handle pricing service errors (including duplicate service type)
    if (error instanceof Error && error.message.includes('Pricing already exists for service type')) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 409 }
      );
    }

    console.error('Error creating pricing:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
