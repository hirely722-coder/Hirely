import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { AdminAppContextProvider } from "@/context/AdminAppContext";
import AdminLayout from "@/components/AdminLayout";

import Head from "next/head";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <AdminAppContextProvider>
      <Head>
        <title>Hirly Admin Dashboard</title>
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
      </Head>
      <AdminLayout>
        <Component {...pageProps} />
      </AdminLayout>
    </AdminAppContextProvider>
  );
}
