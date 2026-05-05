/**
 * Error Display component for showing user-friendly error messages
 * with recovery actions and detailed information
 */

import React from 'react';
import { AlertTriangle, RefreshCw, RotateCcw, ArrowLeft, Play } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { ErrorDisplayProps, ERROR_CLASSIFICATIONS, ErrorSeverity } from './types';

export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  error,
  errorId,
  retryCount,
  maxRetries,
  onRetry,
  onReset,
  recoveryActions = []
}) => {
  const classification = ERROR_CLASSIFICATIONS[error.code];
  const [showDetails, setShowDetails] = React.useState(false);

  const getSeverityColor = (severity: ErrorSeverity): string => {
    switch (severity) {
      case ErrorSeverity.LOW:
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case ErrorSeverity.MEDIUM:
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case ErrorSeverity.HIGH:
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case ErrorSeverity.CRITICAL:
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getActionIcon = (actionType: string) => {
    switch (actionType) {
      case 'retry':
        return <RefreshCw className="h-4 w-4" />;
      case 'reset':
        return <RotateCcw className="h-4 w-4" />;
      case 'redirect':
        return <ArrowLeft className="h-4 w-4" />;
      case 'fallback':
        return <Play className="h-4 w-4" />;
      default:
        return null;
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[400px] p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-6 w-6 text-orange-500" />
            <div className="flex-1">
              <CardTitle className="text-lg">Something went wrong</CardTitle>
              <CardDescription className="mt-1">
                We encountered an issue while processing your request
              </CardDescription>
            </div>
            <Badge 
              variant="outline" 
              className={getSeverityColor(classification.severity)}
            >
              {classification.severity.toUpperCase()}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* User-friendly error message */}
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error Details</AlertTitle>
            <AlertDescription className="mt-2">
              {classification.userMessage}
            </AlertDescription>
          </Alert>

          {/* Retry information */}
          {retryCount > 0 && (
            <Alert>
              <RefreshCw className="h-4 w-4" />
              <AlertTitle>Retry Information</AlertTitle>
              <AlertDescription className="mt-2">
                Attempt {retryCount} of {maxRetries} failed. 
                {retryCount < maxRetries && classification.retryable 
                  ? ' You can try again or choose a different action below.'
                  : ' Maximum retry attempts reached.'}
              </AlertDescription>
            </Alert>
          )}

          {/* Recovery Actions */}
          {recoveryActions.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-medium text-sm text-gray-700">Available Actions:</h4>
              <div className="flex flex-wrap gap-2">
                {recoveryActions.map((action, index) => (
                  <Button
                    key={index}
                    variant={action.type === 'retry' ? 'default' : 'outline'}
                    size="sm"
                    onClick={action.action}
                    disabled={action.disabled}
                    className="flex items-center gap-2"
                  >
                    {getActionIcon(action.type)}
                    {action.label}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Technical Details (Collapsible) */}
          <Collapsible open={showDetails} onOpenChange={setShowDetails}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full justify-between">
                Technical Details
                <span className="text-xs text-gray-500">
                  {showDetails ? 'Hide' : 'Show'}
                </span>
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-3 mt-3">
              <div className="bg-gray-50 p-3 rounded-md text-sm space-y-2">
                <div>
                  <span className="font-medium">Error ID:</span>
                  <code className="ml-2 bg-white px-2 py-1 rounded text-xs">
                    {errorId}
                  </code>
                </div>
                <div>
                  <span className="font-medium">Error Code:</span>
                  <code className="ml-2 bg-white px-2 py-1 rounded text-xs">
                    {error.code}
                  </code>
                </div>
                <div>
                  <span className="font-medium">Category:</span>
                  <span className="ml-2">{classification.type}</span>
                </div>
                {error.details && (
                  <div>
                    <span className="font-medium">Additional Info:</span>
                    <pre className="ml-2 bg-white p-2 rounded text-xs overflow-auto max-h-32">
                      {JSON.stringify(error.details, null, 2)}
                    </pre>
                  </div>
                )}
                <div className="text-xs text-gray-500">
                  <span className="font-medium">Technical Message:</span>
                  <span className="ml-2">{classification.technicalMessage}</span>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Help Text */}
          <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-md">
            <p className="font-medium mb-1">Need Help?</p>
            <p>
              If this problem persists, please contact support with the error ID above. 
              Our team can use this information to quickly identify and resolve the issue.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};