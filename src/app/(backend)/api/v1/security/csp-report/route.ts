/**
 * CSP Violation Report Endpoint
 * Handles Content Security Policy violation reports
 */

import { NextRequest, NextResponse } from 'next/server';
import { CSPViolationReporter } from '@/lib/security/awareness-lab-csp';
import { auditAwarenessLab } from '@/lib/utils/audit-logger';
import { logger } from '@/lib/utils/logger';

/**
 * Handle CSP violation reports
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const report = await request.json();
    const cspReport = report['csp-report'] || report;

    // Log the violation
    logger.warn('CSP Violation Detected', {
      timestamp: new Date().toISOString(),
      userAgent: request.headers.get('user-agent'),
      clientIP: request.headers.get('x-forwarded-for') || 'unknown',
      violation: {
        documentUri: cspReport['document-uri'],
        violatedDirective: cspReport['violated-directive'],
        blockedUri: cspReport['blocked-uri'],
        sourceFile: cspReport['source-file'],
        lineNumber: cspReport['line-number'],
        columnNumber: cspReport['column-number']
      }
    });

    // Audit log the violation
    auditAwarenessLab({
      event: 'awareness.csp.violation',
      severity: 'medium',
      success: false,
      ip: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
      metadata: {
        documentUri: cspReport['document-uri'],
        violatedDirective: cspReport['violated-directive'],
        blockedUri: cspReport['blocked-uri'],
        sourceFile: cspReport['source-file'],
        lineNumber: cspReport['line-number'],
        columnNumber: cspReport['column-number']
      }
    });

    // Check if this is a critical violation that needs immediate attention
    const criticalViolations = [
      'script-src',
      'object-src',
      'base-uri'
    ];

    const isCritical = criticalViolations.some(directive =>
      cspReport['violated-directive']?.includes(directive)
    );

    if (isCritical) {
      logger.error('Critical CSP Violation Detected', {
        violation: cspReport,
        userAgent: request.headers.get('user-agent'),
        clientIP: request.headers.get('x-forwarded-for')
      });

      // You could trigger alerts here for critical violations
      // await triggerSecurityAlert(cspReport);
    }

    return new NextResponse('OK', { status: 200 });

  } catch (error) {
    logger.error('Failed to process CSP violation report:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    return new NextResponse('Bad Request', { status: 400 });
  }
}

/**
 * Handle preflight requests
 */
export async function OPTIONS(request: NextRequest): Promise<NextResponse> {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
