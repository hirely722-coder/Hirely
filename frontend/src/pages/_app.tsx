import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { AppContextProvider } from "@/context/AppContext";
import Layout from "@/components/Layout";
import Script from "next/script";

// Intercept all API calls globally to redirect relative /api/... calls to the deployed backend server in production
if (typeof globalThis !== 'undefined') {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async function (input, init) {
    if (typeof input === 'string' && input.startsWith('/api/')) {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_API_URL || process.env.BACKEND_API_URL || 'https://hirely-backend.hirly-app.workers.dev';
      if (backendUrl) {
        // Strip trailing slash if present on backendUrl and ensure input doesn't double-slash
        const formattedBackendUrl = backendUrl.endsWith('/') ? backendUrl.slice(0, -1) : backendUrl;
        const formattedInput = input.startsWith('/') ? input : `/${input}`;
        input = `${formattedBackendUrl}${formattedInput}`;
      }
    }
    return originalFetch.call(this, input, init);
  };
}

export default function App({ Component, pageProps }: AppProps) {
  return (
    <AppContextProvider>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="beforeInteractive" />
      <Layout>
        <Component {...pageProps} />
      </Layout>
    </AppContextProvider>
  );
}
