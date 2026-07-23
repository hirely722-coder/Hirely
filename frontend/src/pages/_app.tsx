import "@/styles/globals.css";
import "@assistant-ui/react-ui/styles/index.css";
import type { AppProps } from "next/app";
import { AppContextProvider } from "@/context/AppContext";
import Layout from "@/components/Layout";
import Script from "next/script";

import Head from "next/head";
import { useEffect } from "react";
import { useRouter } from "next/router";
import * as gtag from "@/lib/gtag";

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();

  useEffect(() => {
    if (!gtag.GA_TRACKING_ID) return;

    const handleRouteChange = (url: string) => {
      gtag.pageview(url);
    };

    router.events.on("routeChangeComplete", handleRouteChange);
    return () => {
      router.events.off("routeChangeComplete", handleRouteChange);
    };
  }, [router.events]);

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
      {gtag.GA_TRACKING_ID && (
        <>
          <Script
            strategy="afterInteractive"
            src={`https://www.googletagmanager.com/gtag/js?id=${gtag.GA_TRACKING_ID}`}
          />
          <Script
            id="gtag-init"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${gtag.GA_TRACKING_ID}', {
                  page_path: window.location.pathname,
                });
              `,
            }}
          />
        </>
      )}
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="beforeInteractive" />
      <Layout>
        <Component {...pageProps} />
      </Layout>
    </AppContextProvider>
  );
}
