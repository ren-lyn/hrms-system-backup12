const reportWebVitals = onPerfEntry => {
  if (onPerfEntry && onPerfEntry instanceof Function) {
    // Attempt dynamic import; gracefully handle chunk load failures
    import('web-vitals')
      .then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
        try {
          getCLS(onPerfEntry);
          getFID(onPerfEntry);
          getFCP(onPerfEntry);
          getLCP(onPerfEntry);
          getTTFB(onPerfEntry);
        } catch (_) {}
      })
      .catch(() => {
        // Silently degrade if the chunk fails to load so the app keeps working
        // You can optionally log this in development
        if (process.env.NODE_ENV === 'development') {
          // eslint-disable-next-line no-console
          console.warn('[Web Vitals] Skipped: web-vitals chunk failed to load');
        }
      });
  }
};

export default reportWebVitals;
