import type { AppProps } from "next/app";
import dynamic from "next/dynamic";

import { AuthProvider } from "@/components/auth/AuthProvider";
import { SettingsProvider } from "@/hooks/useSettings";
import { useServiceWorker } from "@/hooks/useServiceWorker";
import { DetailModalProvider } from "@/components/detail/DetailModalContext";
import { Layout } from "@/components/layout/Layout";
import { ScrollEdgeButton } from "@/components/ui/ScrollEdgeButton";
import { RouteProgressBar } from "@/components/ui/RouteProgressBar";

import "../styles/globals.css";

const DetailModal = dynamic(
  () => import("@/components/detail/DetailModal").then((mod) => mod.DetailModal),
  { ssr: false }
);

export default function App({ Component, pageProps }: AppProps) {
  useServiceWorker();

  return (
    <AuthProvider>
      <SettingsProvider>
        <DetailModalProvider>
          <RouteProgressBar />
          <Layout>
            <Component {...pageProps} />
          </Layout>
          <DetailModal />
          <ScrollEdgeButton />
        </DetailModalProvider>
      </SettingsProvider>
    </AuthProvider>
  );
}

