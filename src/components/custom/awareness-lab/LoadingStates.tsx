'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Loader2, 
  WifiOff, 
  RefreshCw, 
  AlertTriangle,
  CheckCircle,
  Clock
} from 'lucide-react';


export interface LoadingStateProps {
  isLoading: boolean;
  error?: string | null;
  isEmpty?: boolean;
  emptyMessage?: string;
  retryAction?: () => void;
  children: React.ReactNode;
  loadingComponent?: React.ReactNode;
  className?: string;
}

export function LoadingState({
  isLoading,
  error,
  isEmpty = false,
  emptyMessage = 'No data available',
  retryAction,
  children,
  loadingComponent,
  className = '',
}: LoadingStateProps) {
  const [isRetrying, setIsRetrying] = useState(false);

  const handleRetry = async () => {
    if (!retryAction) return;
    
    setIsRetrying(true);
    try {
      await retryAction();
    } finally {
      setIsRetrying(false);
    }
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className={className}>
        {loadingComponent || <DefaultLoadingComponent />}
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className={className}>
        <ErrorState 
          error={error}
          onRetry={retryAction ? handleRetry : undefined}
          isRetrying={isRetrying}
        />
      </div>
    );
  }

  // Show empty state
  if (isEmpty) {
    return (
      <div className={className}>
        <EmptyState message={emptyMessage} />
      </div>
    );
  }

  // Show content
  return <div className={className}>{children}</div>;
}

function DefaultLoadingComponent() {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-center space-x-2">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Loading...</span>
        </div>
      </CardContent>
    </Card>
  );
}

interface ErrorStateProps {
  error: string;
  onRetry?: () => void;
  isRetrying: boolean;
}

function ErrorState({ error, onRetry, isRetrying }: ErrorStateProps) {
  const isNetworkError = error.toLowerCase().includes('network') || error.toLowerCase().includes('fetch');

  return (
    <Card>
      <CardContent className="p-6 text-center space-y-4">
        <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
          {isNetworkError ? (
            <WifiOff className="w-6 h-6 text-red-600" />
          ) : (
            <AlertTriangle className="w-6 h-6 text-red-600" />
          )}
        </div>
        
        <div>
          <h3 className="font-medium text-gray-900 mb-2">
            {isNetworkError ? 'Connection Problem' : 'Something went wrong'}
          </h3>
          <p className="text-sm text-gray-600 mb-4">{error}</p>
        </div>

        {/* Network status info */}
        {isNetworkError && (
          <Alert>
            <AlertDescription>
              There seems to be a network issue. Please check your connection and try again.
            </AlertDescription>
          </Alert>
        )}

        {/* Retry button */}
        {onRetry && (
          <Button 
            onClick={onRetry} 
            disabled={isRetrying}
            variant="outline"
          >
            {isRetrying ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Retrying...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </>
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <Card>
      <CardContent className="p-6 text-center">
        <div className="mx-auto w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-4">
          <AlertTriangle className="w-6 h-6 text-gray-400" />
        </div>
        <p className="text-gray-600">{message}</p>
      </CardContent>
    </Card>
  );
}

// Specialized loading components for different contexts
export function QuizLoadingState() {
  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-6 w-20" />
            </div>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center space-x-2">
                  <Skeleton className="h-4 w-4 rounded-full" />
                  <Skeleton className="h-4 flex-1" />
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function MaterialLoadingState() {
  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-32 w-full rounded-lg" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-4/5" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Progressive loading component with timeout
export function ProgressiveLoadingState({ 
  children, 
  timeout = 10000,
  onTimeout 
}: { 
  children: React.ReactNode;
  timeout?: number;
  onTimeout?: () => void;
}) {
  const [showSlowWarning, setShowSlowWarning] = useState(false);
  const [hasTimedOut, setHasTimedOut] = useState(false);

  useEffect(() => {
    // Show slow connection warning after 3 seconds
    const slowTimer = setTimeout(() => {
      setShowSlowWarning(true);
    }, 3000);

    // Show timeout after specified time
    const timeoutTimer = setTimeout(() => {
      setHasTimedOut(true);
      onTimeout?.();
    }, timeout);

    return () => {
      clearTimeout(slowTimer);
      clearTimeout(timeoutTimer);
    };
  }, [timeout, onTimeout]);

  if (hasTimedOut) {
    return (
      <Card>
        <CardContent className="p-6 text-center space-y-4">
          <div className="mx-auto w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
            <Clock className="w-6 h-6 text-yellow-600" />
          </div>
          <div>
            <h3 className="font-medium text-gray-900 mb-2">Taking longer than expected</h3>
            <p className="text-sm text-gray-600">
              This is taking longer than usual. Please check your connection and try again.
            </p>
          </div>

        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {children}
      {showSlowWarning && (
        <Alert>
          <Clock className="w-4 h-4" />
          <AlertDescription>
            This is taking longer than usual...
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

// Success state component
export function SuccessState({ 
  message, 
  action,
  actionLabel = 'Continue'
}: { 
  message: string;
  action?: () => void;
  actionLabel?: string;
}) {
  return (
    <Card>
      <CardContent className="p-6 text-center space-y-4">
        <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
          <CheckCircle className="w-6 h-6 text-green-600" />
        </div>
        <div>
          <h3 className="font-medium text-gray-900 mb-2">Success!</h3>
          <p className="text-sm text-gray-600">{message}</p>
        </div>
        {action && (
          <Button onClick={action}>
            {actionLabel}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}