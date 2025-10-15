/**
 * Performance monitoring utilities
 * Track and report performance metrics
 */
import { useEffect, useRef } from 'react';

class PerformanceMonitor {
  constructor() {
    this.metrics = {
      pageLoads: [],
      apiCalls: [],
      componentRenders: [],
    };
    this.enabled = process.env.NODE_ENV === 'development';
  }

  /**
   * Measure page load time
   */
  measurePageLoad(pageName) {
    if (!this.enabled) return;

    if (window.performance && window.performance.timing) {
      const timing = window.performance.timing;
      const loadTime = timing.loadEventEnd - timing.navigationStart;
      
      this.metrics.pageLoads.push({
        page: pageName,
        loadTime,
        timestamp: Date.now(),
      });

      console.log(`[Performance] ${pageName} loaded in ${loadTime}ms`);
    }
  }

  /**
   * Measure API call duration
   */
  measureApiCall(endpoint, duration, fromCache = false) {
    if (!this.enabled) return;

    this.metrics.apiCalls.push({
      endpoint,
      duration,
      fromCache,
      timestamp: Date.now(),
    });

    const cacheStatus = fromCache ? '(cached)' : '';
    console.log(`[Performance] API ${endpoint} ${cacheStatus}: ${duration}ms`);
  }

  /**
   * Measure component render time
   */
  measureComponentRender(componentName, duration) {
    if (!this.enabled) return;

    this.metrics.componentRenders.push({
      component: componentName,
      duration,
      timestamp: Date.now(),
    });

    if (duration > 16) { // Slower than 60fps
      console.warn(`[Performance] Slow render: ${componentName} took ${duration}ms`);
    }
  }

  /**
   * Get performance summary
   */
  getSummary() {
    if (!this.enabled) return null;

    const avgPageLoad = this.metrics.pageLoads.length > 0
      ? this.metrics.pageLoads.reduce((sum, m) => sum + m.loadTime, 0) / this.metrics.pageLoads.length
      : 0;

    const avgApiCall = this.metrics.apiCalls.length > 0
      ? this.metrics.apiCalls.reduce((sum, m) => sum + m.duration, 0) / this.metrics.apiCalls.length
      : 0;

    const cacheHitRate = this.metrics.apiCalls.length > 0
      ? (this.metrics.apiCalls.filter(m => m.fromCache).length / this.metrics.apiCalls.length) * 100
      : 0;

    return {
      avgPageLoad: Math.round(avgPageLoad),
      avgApiCall: Math.round(avgApiCall),
      cacheHitRate: Math.round(cacheHitRate),
      totalApiCalls: this.metrics.apiCalls.length,
      totalPageLoads: this.metrics.pageLoads.length,
    };
  }

  /**
   * Clear all metrics
   */
  clear() {
    this.metrics = {
      pageLoads: [],
      apiCalls: [],
      componentRenders: [],
    };
  }

  /**
   * Report Web Vitals
   */
  reportWebVitals(metric) {
    if (!metric || !this.enabled) return;

    const { name, value, id } = metric;
    console.log(`[Web Vitals] ${name}:`, {
      value: Math.round(value),
      id,
    });

    // Send to analytics if needed
    // analytics.send({ name, value, id });
  }
}

// Create singleton instance
const performanceMonitor = new PerformanceMonitor();

/**
 * React hook for measuring component render time
 */
export const useRenderTime = (componentName) => {
  const renderStart = useRef(Date.now());

  useEffect(() => {
    const duration = Date.now() - renderStart.current;
    performanceMonitor.measureComponentRender(componentName, duration);
    renderStart.current = Date.now();
  });
};

/**
 * Higher-order component for performance tracking
 */
export const withPerformanceTracking = (Component, componentName) => {
  return (props) => {
    useRenderTime(componentName);
    return <Component {...props} />;
  };
};

export default performanceMonitor;
