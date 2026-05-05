import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

import { analyticsController } from '@/lib/controllers/awareness-lab/analytics.controller';

async function handleExportQuizAnalytics(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params;
  // Add quizId to the URL search params for the export function
  const url = new URL(request.url);
  url.searchParams.set('quizId', params.id);

  // Create a new request with the modified URL
  const modifiedRequest = new NextRequest(url, {
    method: request.method,
    headers: request.headers,
    body: request.body,
  });

  return analyticsController.exportAnalytics(modifiedRequest);
}

export {
  handleExportQuizAnalytics as GET
};
