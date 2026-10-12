import type { AppProps } from "next/app";
import dynamic from "next/dynamic";
import Head from "next/head";

import { AuthProvider } from "@/components/auth/AuthProvider";
import { SettingsProvider } from "@/hooks/useSettings";
import { DetailModalProvider } from "@/components/detail/DetailModalContext";
import { Layout } from "@/components/layout/Layout";
import { InstallBanner } from "@/components/pwa/InstallBanner";
import { UpdateToast } from "@/components/pwa/UpdateToast";
import { ScrollEdgeButton } from "@/components/ui/ScrollEdgeButton";
import { RouteProgressBar } from "@/components/ui/RouteProgressBar";

import "../styles/globals.css";

const DetailModal = dynamic(
  () => import("@/components/detail/DetailModal").then((mod) => mod.DetailModal),
  { ssr: false }
);

export default function App({ Component, pageProps }: AppProps) {
  return (
    <AuthProvider>
      <Head>
        {/* viewport-fit=cover lets the app draw under the notch; layouts pad with env(safe-area-inset-*). */}
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      </Head>
      <SettingsProvider>
        <DetailModalProvider>
          <RouteProgressBar />
          <Layout>
            <Component {...pageProps} />
          </Layout>
          <DetailModal />
          <ScrollEdgeButton />
          <InstallBanner />
          <UpdateToast />
        </DetailModalProvider>
      </SettingsProvider>
    </AuthProvider>
  );
}


