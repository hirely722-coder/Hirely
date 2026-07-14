import "@/styles/globals.css";
import "@assistant-ui/react-ui/styles/index.css";
import type { AppProps } from "next/app";
import { AppContextProvider } from "@/context/AppContext";
import Layout from "@/components/Layout";
import Script from "next/script";

// Intercept all API calls globally to redirect relative /api/... calls to the deployed backend server in production
if (typeof globalThis !== 'undefined') {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async function (input, init) {
    if (typeof input === 'string' && input.startsWith('/api/')) {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_API_URL || process.env.BACKEND_API_URL;
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

import Head from "next/head";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <AppContextProvider>
      <Head>
        <title>Hirly - Premium Recruiter Platform</title>
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        
        {/* Open Graph Meta Tags */}
        <meta property="og:title" content="Hirly - Premium Recruiter Platform" />
        <meta property="og:description" content="The AI-powered recruitment management platform helping agencies hire smarter, not harder." />
        <meta property="og:image" content="/og-banner.png" />
        <meta property="og:type" content="website" />
        <meta property="og:image:type" content="image/png" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        
        {/* Twitter Card Meta Tags */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Hirly - Premium Recruiter Platform" />
        <meta name="twitter:description" content="The AI-powered recruitment management platform helping agencies hire smarter, not harder." />
        <meta name="twitter:image" content="/og-banner.png" />
      </Head>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="beforeInteractive" />
      <Layout>
        <Component {...pageProps} />
      </Layout>
    </AppContextProvider>
  );
}
