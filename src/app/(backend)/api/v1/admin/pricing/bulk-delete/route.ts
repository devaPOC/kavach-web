import { NextRequest, NextResponse } from 'next/server';
import { PricingService } from '@/lib/services/pricing/pricing.service';
import { cookieManager } from '@/lib/auth/unified-session-manager';
import { z } from 'zod';

const bulkDeleteSchema = z.object({
  serviceTypes: z.array(z.string().min(1)).min(1, 'At least one service type is required'),
});

// POST /api/v1/admin/pricing/bulk-delete - Delete multiple pricing configurations
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
    const { serviceTypes } = bulkDeleteSchema.parse(body);

    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[],
    };

    // Delete each pricing configuration
    for (const serviceType of serviceTypes) {
      try {
        const success = await PricingService.deleteServicePricing(serviceType, sessionResult.userId);
        if (success) {
          results.success++;
        } else {
          results.failed++;
          results.errors.push(`Pricing not found for: ${serviceType}`);
        }
      } catch (error) {
        results.failed++;
        results.errors.push(`Failed to delete ${serviceType}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return NextResponse.json({
      success: true,
      data: results,
      message: `Bulk delete completed. ${results.success} deleted, ${results.failed} failed.`,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.issues[0].message },
        { status: 400 }
      );
    }

    console.error('Error in bulk delete:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
