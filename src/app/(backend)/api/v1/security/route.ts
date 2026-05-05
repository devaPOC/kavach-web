import { NextRequest, NextResponse } from 'next/server';
import { 
  createSingleMethodHandler,
  type RouteHandlerContext 
} from '@/lib/api/route-handler';
import { AuthorizationError, UnknownError, ValidationError } from '@/lib/errors/custom-errors';
import { ErrorCode } from '@/lib/errors/error-types';
import { securityMonitor } from '@/lib/security/security-monitor';
import { z } from 'zod';

const securityActionSchema = z.object({
  action: z.enum(['block_ip', 'unblock_ip', 'lock_account', 'unlock_account', 'resolve_alert']),
  target: z.string().min(1),
  reason: z.string().optional(),
  duration: z.number().optional()
});

async function handleSecurityRequest(request: NextRequest, context: RouteHandlerContext) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (request.method === 'GET') {
      // Get security information
      if (action === 'stats') {
        const responseData = {
          stats: securityMonitor.getSecurityMetrics(),
          timestamp: new Date().toISOString()
        };

        const response = NextResponse.json(responseData);
        response.headers.set('x-correlation-id', context.requestContext.requestId);
        return response;
      }

      if (action === 'alerts') {
        const responseData = {
          alerts: [], // TODO: Implement getActiveAlerts() method
          timestamp: new Date().toISOString()
        };

        const response = NextResponse.json(responseData);
        response.headers.set('x-correlation-id', context.requestContext.requestId);
        return response;
      }

      // Default: return all security data
      const responseData = {
        stats: securityMonitor.getSecurityMetrics(),
        alerts: [], // TODO: Implement getActiveAlerts() method
        timestamp: new Date().toISOString()
      };

      const response = NextResponse.json(responseData);
      response.headers.set('x-correlation-id', context.requestContext.requestId);
      return response;
    }

    if (request.method === 'POST') {
      // Execute security actions
      const body = await request.json();
      const validationResult = securityActionSchema.safeParse(body);

      if (!validationResult.success) {
        const fieldErrors = validationResult.error.issues.reduce((acc, err) => {
          acc[err.path.join('.')] = err.message;
          return acc;
        }, {} as Record<string, string>);
        
        throw ValidationError.invalidInput(
          'Invalid security action request',
          fieldErrors,
          context.requestContext.requestId
        );
      }

      const { action: secAction, target, reason, duration } = validationResult.data;

      switch (secAction) {
        case 'block_ip':
          // TODO: Implement blockIP method
          console.log(`Blocking IP: ${target}, reason: ${reason || 'Manual block'}, duration: ${duration}`);
          break;

        case 'unblock_ip':
          // TODO: Implement unblockIP method
          console.log(`Unblocking IP: ${target}`);
          break;

        case 'lock_account':
          // TODO: Implement lockAccount method
          console.log(`Locking account: ${target}, reason: ${reason || 'Manual lock'}, duration: ${duration}`);
          break;

        case 'unlock_account':
          // TODO: Implement unlockAccount method
          console.log(`Unlocking account: ${target}`);
          break;

        case 'resolve_alert':
          // TODO: Implement resolveAlert method
          console.log(`Resolving alert: ${target}`);
          break;

        default:
          throw ValidationError.invalidInput(
            'Unknown security action',
            { action: 'Invalid action type' },
            context.requestContext.requestId
          );
      }

      const responseData = {
        success: true,
        message: `Security action '${secAction}' executed successfully`,
        target,
        timestamp: new Date().toISOString()
      };

      const response = NextResponse.json(responseData);
      response.headers.set('x-correlation-id', context.requestContext.requestId);
      return response;
    }

    throw new AuthorizationError(
      ErrorCode.ACCESS_DENIED,
      `Method ${request.method} not allowed`,
      { method: request.method },
      context.requestContext.requestId
    );

  } catch (error) {
    if (error instanceof ValidationError || error instanceof AuthorizationError) {
      throw error;
    }

    throw new UnknownError(
      error instanceof Error ? error : new Error('Unknown error'),
      context.requestContext.requestId
    );
  }
}

// Create standardized route handlers for GET
const getHandlers = createSingleMethodHandler('GET', handleSecurityRequest);
// Create standardized route handlers for POST  
const postHandlers = createSingleMethodHandler('POST', handleSecurityRequest);

export const GET = getHandlers.GET;
export const POST = postHandlers.POST;
export const PUT = getHandlers.PUT;
export const DELETE = getHandlers.DELETE;