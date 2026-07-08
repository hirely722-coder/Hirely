import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { AdminAppContextProvider } from "@/context/AdminAppContext";
import AdminLayout from "@/components/AdminLayout";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <AdminAppContextProvider>
      <AdminLayout>
        <Component {...pageProps} />
      </AdminLayout>
    </AdminAppContextProvider>
  );
}
