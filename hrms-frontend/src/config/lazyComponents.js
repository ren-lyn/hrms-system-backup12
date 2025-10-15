/**
 * Centralized lazy component loading configuration
 * This ensures consistent code splitting across the application
 */
import { lazy } from 'react';

// Heavy chart libraries - split into separate chunks
export const LazyChart = lazy(() => 
  import(/* webpackChunkName: "charts" */ 'react-chartjs-2')
);

export const LazyRecharts = lazy(() => 
  import(/* webpackChunkName: "recharts" */ 'recharts')
);

// PDF generation - only load when needed
export const LazyJsPDF = lazy(() => 
  import(/* webpackChunkName: "jspdf" */ 'jspdf')
);

export const LazyJsPDFAutoTable = lazy(() => 
  import(/* webpackChunkName: "jspdf-autotable" */ 'jspdf-autotable')
);

// Calendar components - split into separate chunk
export const LazyReactCalendar = lazy(() => 
  import(/* webpackChunkName: "calendar" */ 'react-calendar')
);

export const LazyReactDatePicker = lazy(() => 
  import(/* webpackChunkName: "datepicker" */ 'react-datepicker')
);

// CSV parsing - only load when importing/exporting
export const LazyPapaParse = lazy(() => 
  import(/* webpackChunkName: "papaparse" */ 'papaparse')
);

// Animation library - split into separate chunk
export const LazyFramerMotion = lazy(() => 
  import(/* webpackChunkName: "framer-motion" */ 'framer-motion')
);

/**
 * Preload critical chunks during idle time
 */
export const preloadCriticalChunks = () => {
  if ('requestIdleCallback' in window) {
    requestIdleCallback(() => {
      // Preload charts for dashboard
      import(/* webpackChunkName: "charts" */ 'react-chartjs-2');
      import(/* webpackChunkName: "recharts" */ 'recharts');
    });
  }
};

/**
 * Preload chunk on user interaction (hover, focus)
 */
export const preloadChunk = (chunkName) => {
  const preloadMap = {
    'jspdf': () => import(/* webpackChunkName: "jspdf" */ 'jspdf'),
    'calendar': () => import(/* webpackChunkName: "calendar" */ 'react-calendar'),
    'datepicker': () => import(/* webpackChunkName: "datepicker" */ 'react-datepicker'),
    'papaparse': () => import(/* webpackChunkName: "papaparse" */ 'papaparse'),
  };

  if (preloadMap[chunkName]) {
    preloadMap[chunkName]();
  }
};

export default {
  LazyChart,
  LazyRecharts,
  LazyJsPDF,
  LazyJsPDFAutoTable,
  LazyReactCalendar,
  LazyReactDatePicker,
  LazyPapaParse,
  LazyFramerMotion,
  preloadCriticalChunks,
  preloadChunk,
};
