import type { AppProps } from "next/app";
import dynamic from "next/dynamic";

import { AuthProvider } from "@/components/auth/AuthProvider";
import { SettingsProvider } from "@/hooks/useSettings";
import { DetailModalProvider } from "@/components/detail/DetailModalContext";
import { Layout } from "@/components/layout/Layout";

import "../styles/globals.css";

const DetailModal = dynamic(
  () => import("@/components/detail/DetailModal").then((mod) => mod.DetailModal),
  { ssr: false }
);

export default function App({ Component, pageProps }: AppProps) {
  return (
    <AuthProvider>
      <SettingsProvider>
        <DetailModalProvider>
          <Layout>
            <Component {...pageProps} />
          </Layout>
          <DetailModal />
        </DetailModalProvider>
      </SettingsProvider>
    </AuthProvider>
  );
}
