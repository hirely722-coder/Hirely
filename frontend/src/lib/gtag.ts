export const GA_TRACKING_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || '';

// Helper for non-blocking idle execution
const runIdle = (cb: () => void) => {
  if (typeof window === 'undefined') return;
  if ('requestIdleCallback' in window) {
    (window as any).requestIdleCallback(cb);
  } else {
    setTimeout(cb, 1);
  }
};

// https://developers.google.com/analytics/devguides/collection/gtagjs/pages
export const pageview = (url: string) => {
  runIdle(() => {
    try {
      if (typeof window !== 'undefined' && GA_TRACKING_ID && (window as any).gtag) {
        (window as any).gtag('config', GA_TRACKING_ID, {
          page_path: url,
        });
      }
    } catch {
      // Fail silently for adblockers / corporate firewalls
    }
  });
};

// https://developers.google.com/analytics/devguides/collection/gtagjs/events
export const event = ({ action, category, label, value }: {
  action: string;
  category: string;
  label?: string;
  value?: number;
}) => {
  runIdle(() => {
    try {
      if (typeof window !== 'undefined' && (window as any).gtag) {
        (window as any).gtag('event', action, {
          event_category: category,
          event_label: label,
          value: value,
        });
      }
    } catch {
      // Fail silently for adblockers / corporate firewalls
    }
  });
};
