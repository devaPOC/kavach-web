/**
 * Lazy Loading Utilities for Performance Optimization
 * Implements intersection observer-based lazy loading for components and content
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { logger } from '@/lib/utils/logger';

export interface LazyLoadOptions {
  threshold?: number;
  rootMargin?: string;
  triggerOnce?: boolean;
  fallbackDelay?: number;
  onLoad?: () => void;
  onError?: (error: Error) => void;
}

export interface LazyComponentProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  className?: string;
  options?: LazyLoadOptions;
}

/**
 * Intersection Observer Hook for lazy loading
 */
export function useIntersectionObserver(
  options: LazyLoadOptions = {}
): [React.RefObject<HTMLDivElement | null>, boolean] {
  const {
    threshold = 0.1,
    rootMargin = '50px',
    triggerOnce = true,
    fallbackDelay = 2000,
    onLoad,
    onError
  } = options;

  const [isIntersecting, setIsIntersecting] = useState(false);
  const [hasTriggered, setHasTriggered] = useState(false);
  const targetRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    const target = targetRef.current;
    if (!target) return;

    // Check if IntersectionObserver is supported
    if (typeof IntersectionObserver === 'undefined') {
      // Fallback for browsers without IntersectionObserver support
      const fallbackTimer = setTimeout(() => {
        setIsIntersecting(true);
        setHasTriggered(true);
        onLoad?.();
      }, fallbackDelay);

      return () => clearTimeout(fallbackTimer);
    }

    try {
      observerRef.current = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting && (!triggerOnce || !hasTriggered)) {
              setIsIntersecting(true);
              setHasTriggered(true);
              onLoad?.();

              if (triggerOnce && observerRef.current) {
                observerRef.current.unobserve(target);
              }
            } else if (!triggerOnce && !entry.isIntersecting) {
              setIsIntersecting(false);
            }
          });
        },
        {
          threshold,
          rootMargin
        }
      );

      observerRef.current.observe(target);

    } catch (error) {
      logger.error('IntersectionObserver error', { error });
      onError?.(error as Error);
      
      // Fallback to immediate loading on error
      setIsIntersecting(true);
      setHasTriggered(true);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [threshold, rootMargin, triggerOnce, fallbackDelay, hasTriggered, onLoad, onError]);

  return [targetRef, isIntersecting];
}

/**
 * Lazy Image Component with progressive loading
 */
export interface LazyImageProps {
  src: string;
  alt: string;
  className?: string;
  placeholder?: string;
  blurDataURL?: string;
  width?: number;
  height?: number;
  onLoad?: () => void;
  onError?: (error: Error) => void;
}

export function LazyImage({
  src,
  alt,
  className = '',
  placeholder,
  blurDataURL,
  width,
  height,
  onLoad,
  onError
}: LazyImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [targetRef, isIntersecting] = useIntersectionObserver({
    threshold: 0.1,
    rootMargin: '100px',
    triggerOnce: true,
    onLoad: () => {
      // Image is in viewport, start loading
    }
  });

  const handleImageLoad = useCallback(() => {
    setIsLoaded(true);
    onLoad?.();
  }, [onLoad]);

  const handleImageError = useCallback((error: React.SyntheticEvent<HTMLImageElement, Event>) => {
    setHasError(true);
    const errorObj = new Error(`Failed to load image: ${src}`);
    logger.error('Lazy image load error', { src, error: errorObj });
    onError?.(errorObj);
  }, [src, onError]);

  return (
    <div
      ref={targetRef}
      className={`lazy-image-container ${className}`}
      style={{ width, height }}
    >
      {isIntersecting && !hasError && (
        <img
          src={src}
          alt={alt}
          className={`lazy-image ${isLoaded ? 'loaded' : 'loading'}`}
          onLoad={handleImageLoad}
          onError={handleImageError}
          style={{
            opacity: isLoaded ? 1 : 0,
            transition: 'opacity 0.3s ease-in-out',
            width: '100%',
            height: '100%',
            objectFit: 'cover'
          }}
        />
      )}
      
      {(!isIntersecting || !isLoaded) && !hasError && (
        <div
          className="lazy-image-placeholder"
          style={{
            width: '100%',
            height: '100%',
            backgroundColor: '#f0f0f0',
            backgroundImage: blurDataURL ? `url(${blurDataURL})` : undefined,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          {placeholder || (
            <div className="animate-pulse bg-muted/80 w-full h-full flex items-center justify-center">
              <svg
                className="w-8 h-8 text-muted-foreground/80"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
          )}
        </div>
      )}
      
      {hasError && (
        <div
          className="lazy-image-error"
          style={{
            width: '100%',
            height: '100%',
            backgroundColor: '#fee2e2',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#dc2626'
          }}
        >
          <div className="text-center">
            <svg
              className="w-8 h-8 mx-auto mb-2"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            <p className="text-sm">Failed to load image</p>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Lazy Component Wrapper
 */
export function LazyComponent({
  children,
  fallback,
  className = '',
  options = {}
}: LazyComponentProps) {
  const [targetRef, isIntersecting] = useIntersectionObserver(options);

  return (
    <div ref={targetRef} className={className}>
      {isIntersecting ? children : (fallback || <LazyComponentSkeleton />)}
    </div>
  );
}

/**
 * Default skeleton for lazy components
 */
function LazyComponentSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-4 bg-muted/80 rounded w-3/4 mb-2"></div>
      <div className="h-4 bg-muted/80 rounded w-1/2 mb-2"></div>
      <div className="h-4 bg-muted/80 rounded w-5/6"></div>
    </div>
  );
}

/**
 * Lazy List Component for virtualized rendering
 */
export interface LazyListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  itemHeight: number;
  containerHeight: number;
  overscan?: number;
  className?: string;
  onLoadMore?: () => void;
  hasMore?: boolean;
  loading?: boolean;
}

export function LazyList<T>({
  items,
  renderItem,
  itemHeight,
  containerHeight,
  overscan = 5,
  className = '',
  onLoadMore,
  hasMore = false,
  loading = false
}: LazyListProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    setScrollTop(target.scrollTop);

    // Check if we need to load more items
    if (onLoadMore && hasMore && !loading) {
      const { scrollTop, scrollHeight, clientHeight } = target;
      if (scrollTop + clientHeight >= scrollHeight - 100) {
        onLoadMore();
      }
    }
  }, [onLoadMore, hasMore, loading]);

  // Calculate visible range
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(
    items.length - 1,
    Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
  );

  const visibleItems = items.slice(startIndex, endIndex + 1);
  const totalHeight = items.length * itemHeight;
  const offsetY = startIndex * itemHeight;

  return (
    <div
      ref={containerRef}
      className={`lazy-list-container ${className}`}
      style={{
        height: containerHeight,
        overflow: 'auto'
      }}
      onScroll={handleScroll}
    >
      <div
        className="lazy-list-content"
        style={{
          height: totalHeight,
          position: 'relative'
        }}
      >
        <div
          style={{
            transform: `translateY(${offsetY}px)`
          }}
        >
          {visibleItems.map((item, index) => (
            <div
              key={startIndex + index}
              style={{
                height: itemHeight,
                overflow: 'hidden'
              }}
            >
              {renderItem(item, startIndex + index)}
            </div>
          ))}
        </div>
        
        {loading && (
          <div className="flex justify-center items-center p-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary/50"></div>
            <span className="ml-2 text-sm text-muted-foreground">Loading more...</span>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Lazy Video Component
 */
export interface LazyVideoProps {
  src: string;
  poster?: string;
  className?: string;
  autoPlay?: boolean;
  muted?: boolean;
  controls?: boolean;
  onLoad?: () => void;
  onError?: (error: Error) => void;
}

export function LazyVideo({
  src,
  poster,
  className = '',
  autoPlay = false,
  muted = true,
  controls = true,
  onLoad,
  onError
}: LazyVideoProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [targetRef, isIntersecting] = useIntersectionObserver({
    threshold: 0.1,
    rootMargin: '100px',
    triggerOnce: true
  });

  const handleVideoLoad = useCallback(() => {
    setIsLoaded(true);
    onLoad?.();
  }, [onLoad]);

  const handleVideoError = useCallback((error: React.SyntheticEvent<HTMLVideoElement, Event>) => {
    setHasError(true);
    const errorObj = new Error(`Failed to load video: ${src}`);
    logger.error('Lazy video load error', { src, error: errorObj });
    onError?.(errorObj);
  }, [src, onError]);

  return (
    <div ref={targetRef} className={`lazy-video-container ${className}`}>
      {isIntersecting && !hasError ? (
        <video
          src={src}
          poster={poster}
          autoPlay={autoPlay}
          muted={muted}
          controls={controls}
          className={`lazy-video ${isLoaded ? 'loaded' : 'loading'}`}
          onLoadedData={handleVideoLoad}
          onError={handleVideoError}
          style={{
            width: '100%',
            height: 'auto',
            opacity: isLoaded ? 1 : 0,
            transition: 'opacity 0.3s ease-in-out'
          }}
        />
      ) : hasError ? (
        <div className="lazy-video-error bg-destructive/10 border border-destructive rounded p-4 text-center">
          <svg
            className="w-8 h-8 text-destructive mx-auto mb-2"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          <p className="text-sm text-destructive">Failed to load video</p>
        </div>
      ) : (
        <div className="lazy-video-placeholder bg-muted rounded flex items-center justify-center min-h-[200px]">
          {poster ? (
            <img
              src={poster}
              alt="Video thumbnail"
              className="w-full h-full object-cover rounded"
            />
          ) : (
            <div className="text-center">
              <svg
                className="w-12 h-12 text-muted-foreground/80 mx-auto mb-2"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
                  clipRule="evenodd"
                />
              </svg>
              <p className="text-sm text-muted-foreground">Video will load when visible</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Performance monitoring for lazy loading
 */
export class LazyLoadingPerformanceMonitor {
  private static instance: LazyLoadingPerformanceMonitor;
  private metrics: Map<string, PerformanceMetric> = new Map();

  static getInstance(): LazyLoadingPerformanceMonitor {
    if (!LazyLoadingPerformanceMonitor.instance) {
      LazyLoadingPerformanceMonitor.instance = new LazyLoadingPerformanceMonitor();
    }
    return LazyLoadingPerformanceMonitor.instance;
  }

  startMeasurement(id: string, type: 'image' | 'video' | 'component'): void {
    this.metrics.set(id, {
      id,
      type,
      startTime: performance.now(),
      endTime: null,
      duration: null,
      success: null
    });
  }

  endMeasurement(id: string, success: boolean): void {
    const metric = this.metrics.get(id);
    if (metric) {
      metric.endTime = performance.now();
      metric.duration = metric.endTime - metric.startTime;
      metric.success = success;

      // Log performance data
      logger.info('Lazy loading performance', {
        id,
        type: metric.type,
        duration: metric.duration,
        success
      });
    }
  }

  getMetrics(): PerformanceMetric[] {
    return Array.from(this.metrics.values());
  }

  clearMetrics(): void {
    this.metrics.clear();
  }
}

interface PerformanceMetric {
  id: string;
  type: 'image' | 'video' | 'component';
  startTime: number;
  endTime: number | null;
  duration: number | null;
  success: boolean | null;
}

// Export performance monitor instance
export const lazyLoadingMonitor = LazyLoadingPerformanceMonitor.getInstance();