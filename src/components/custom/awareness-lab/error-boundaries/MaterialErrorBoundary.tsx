/**
 * Material-specific Error Boundary
 * Handles learning material errors with specific recovery actions
 */

import React, { ReactNode } from 'react';
import { BaseErrorBoundary } from './BaseErrorBoundary';
import { AwarenessLabError, AwarenessLabErrorCode } from '@/lib/errors/awareness-lab-errors';
import { ErrorRecoveryAction } from './types';
import { createErrorContext } from './utils';

interface MaterialErrorBoundaryProps {
  children: ReactNode;
  moduleId?: string;
  materialId?: string;
  materialType?: string;
  fallback?: ReactNode;
  onError?: (error: AwarenessLabError, errorInfo: any) => void;
  onSkipMaterial?: () => void;
  onReturnToModule?: () => void;
  onReloadMaterial?: () => void;
  maxRetries?: number;
}

export const MaterialErrorBoundary: React.FC<MaterialErrorBoundaryProps> = ({
  children,
  moduleId,
  materialId,
  materialType,
  fallback,
  onError,
  onSkipMaterial,
  onReturnToModule,
  onReloadMaterial,
  maxRetries = 2
}) => {
  const handleError = (error: AwarenessLabError, errorInfo: any) => {
    // Create material-specific error context
    const context = createErrorContext('MaterialErrorBoundary', {
      moduleId,
      materialId,
      materialType,
      errorInfo,
      materialContext: {
        currentProgress: getCurrentProgress(),
        totalMaterials: getTotalMaterials(),
        materialIndex: getCurrentMaterialIndex(),
        timeSpent: getTimeSpent()
      }
    });

    // Log material-specific error
    console.error('Material Error Boundary caught error:', {
      error: {
        code: error.code,
        message: error.message,
        moduleId,
        materialId,
        materialType
      },
      context
    });

    // Handle specific material error scenarios
    handleMaterialErrorScenario(error, context);

    // Call parent error handler
    onError?.(error, { ...errorInfo, context });
  };

  const handleMaterialErrorScenario = (error: AwarenessLabError, context: any) => {
    switch (error.code) {
      case AwarenessLabErrorCode.MATERIAL_NOT_FOUND:
        // Mark material as unavailable and skip
        markMaterialUnavailable();
        setTimeout(() => {
          onSkipMaterial?.();
        }, 2000);
        break;
      
      case AwarenessLabErrorCode.INVALID_MATERIAL_URL:
      case AwarenessLabErrorCode.UNSAFE_CONTENT:
        // Block material and show warning
        blockUnsafeMaterial();
        break;
      
      case AwarenessLabErrorCode.MODULE_NOT_FOUND:
      case AwarenessLabErrorCode.MODULE_NOT_PUBLISHED:
        // Redirect to module list
        setTimeout(() => {
          onReturnToModule?.();
        }, 3000);
        break;
      
      default:
        // Default handling
        break;
    }
  };

  const getMaterialSpecificRecoveryActions = (error: AwarenessLabError): ErrorRecoveryAction[] => {
    const actions: ErrorRecoveryAction[] = [];

    switch (error.code) {
      case AwarenessLabErrorCode.MATERIAL_NOT_FOUND:
        actions.push({
          type: 'fallback',
          label: 'Skip This Material',
          action: () => onSkipMaterial?.()
        });
        actions.push({
          type: 'redirect',
          label: 'Back to Module',
          action: () => onReturnToModule?.()
        });
        break;
      
      case AwarenessLabErrorCode.INVALID_MATERIAL_URL:
        actions.push({
          type: 'retry',
          label: 'Reload Material',
          action: () => onReloadMaterial?.()
        });
        actions.push({
          type: 'fallback',
          label: 'Skip This Material',
          action: () => onSkipMaterial?.()
        });
        break;
      
      case AwarenessLabErrorCode.UNSAFE_CONTENT:
        actions.push({
          type: 'fallback',
          label: 'Skip Unsafe Material',
          action: () => onSkipMaterial?.()
        });
        actions.push({
          type: 'redirect',
          label: 'Report Issue',
          action: () => reportUnsafeMaterial()
        });
        break;
      
      case AwarenessLabErrorCode.INVALID_MATERIAL_TYPE:
        actions.push({
          type: 'fallback',
          label: 'Skip Unsupported Material',
          action: () => onSkipMaterial?.()
        });
        break;
      
      case AwarenessLabErrorCode.MODULE_NOT_FOUND:
      case AwarenessLabErrorCode.MODULE_NOT_PUBLISHED:
        actions.push({
          type: 'redirect',
          label: 'Back to Learning Hub',
          action: () => redirectToLearningHub()
        });
        break;
      
      default:
        if (onReloadMaterial) {
          actions.push({
            type: 'retry',
            label: 'Reload Material',
            action: onReloadMaterial
          });
        }
        if (onSkipMaterial) {
          actions.push({
            type: 'fallback',
            label: 'Skip This Material',
            action: onSkipMaterial
          });
        }
        break;
    }

    return actions;
  };

  // Helper functions for material context
  const getCurrentProgress = (): number => {
    // Implementation depends on your progress tracking
    // This is a placeholder
    return 0;
  };

  const getTotalMaterials = (): number => {
    // Implementation depends on your module structure
    // This is a placeholder
    return 0;
  };

  const getCurrentMaterialIndex = (): number => {
    // Implementation depends on your material navigation
    // This is a placeholder
    return 0;
  };

  const getTimeSpent = (): number => {
    // Implementation depends on your time tracking
    // This is a placeholder
    return 0;
  };

  const markMaterialUnavailable = () => {
    // Implementation for marking material as unavailable
    console.log('Marking material as unavailable:', materialId);
    // You would update your material status here
  };

  const blockUnsafeMaterial = () => {
    // Implementation for blocking unsafe material
    console.log('Blocking unsafe material:', materialId);
    // You would block the material and report it here
  };

  const reportUnsafeMaterial = () => {
    // Implementation for reporting unsafe material
    if (materialId) {
      // You would send a report to your moderation system
      console.log('Reporting unsafe material:', materialId);
      // Example: reportToModerationSystem(materialId, 'unsafe_content');
    }
  };

  const redirectToLearningHub = () => {
    // Implementation for redirecting to learning hub
    window.location.href = '/learning';
  };

  return (
    <BaseErrorBoundary
      errorType="material"
      contextName="MaterialErrorBoundary"
      fallback={fallback}
      onError={handleError}
      maxRetries={maxRetries}
      resetKeys={[moduleId, materialId, materialType].filter((key): key is string => key !== undefined)}
      resetOnPropsChange={true}
    >
      {children}
    </BaseErrorBoundary>
  );
};