import { useEffect, useState } from 'react';

const PerformanceMonitor = () => {
  const [metrics, setMetrics] = useState({
    pageLoadTime: 0,
    apiResponseTime: 0,
    cacheHitRate: 0,
    totalApiCalls: 0,
    cachedApiCalls: 0
  });

  useEffect(() => {
    // Monitor page load performance
    const measurePageLoad = () => {
      if (performance.timing) {
        const loadTime = performance.timing.loadEventEnd - performance.timing.navigationStart;
        setMetrics(prev => ({ ...prev, pageLoadTime: loadTime }));
      }
    };

    // Monitor API performance
    const originalFetch = window.fetch;
    let totalCalls = 0;
    let cachedCalls = 0;

    window.fetch = async (...args) => {
      const start = performance.now();
      totalCalls++;
      
      try {
        const response = await originalFetch(...args);
        const end = performance.now();
        const responseTime = end - start;
        
        setMetrics(prev => ({
          ...prev,
          apiResponseTime: responseTime,
          totalApiCalls: totalCalls
        }));
        
        return response;
      } catch (error) {
        const end = performance.now();
        const responseTime = end - start;
        
        setMetrics(prev => ({
          ...prev,
          apiResponseTime: responseTime,
          totalApiCalls: totalCalls
        }));
        
        throw error;
      }
    };

    // Monitor cache performance
    const monitorCache = () => {
      const cacheService = window.cacheService;
      if (cacheService) {
        const hitRate = cacheService.cachedCalls / Math.max(cacheService.totalCalls, 1) * 100;
        setMetrics(prev => ({
          ...prev,
          cacheHitRate: hitRate,
          cachedApiCalls: cacheService.cachedCalls
        }));
      }
    };

    // Initial measurement
    measurePageLoad();
    
    // Monitor cache every 5 seconds
    const cacheInterval = setInterval(monitorCache, 5000);

    // Cleanup
    return () => {
      window.fetch = originalFetch;
      clearInterval(cacheInterval);
    };
  }, []);

  // Only show in development
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <div style={{
      position: 'fixed',
      top: '10px',
      right: '10px',
      background: 'rgba(0,0,0,0.8)',
      color: 'white',
      padding: '10px',
      borderRadius: '5px',
      fontSize: '12px',
      zIndex: 9999,
      fontFamily: 'monospace'
    }}>
      <div><strong>Performance Metrics</strong></div>
      <div>Page Load: {metrics.pageLoadTime}ms</div>
      <div>API Response: {metrics.apiResponseTime.toFixed(2)}ms</div>
      <div>Cache Hit Rate: {metrics.cacheHitRate.toFixed(1)}%</div>
      <div>API Calls: {metrics.totalApiCalls}</div>
      <div>Cached: {metrics.cachedApiCalls}</div>
    </div>
  );
};

export default PerformanceMonitor;