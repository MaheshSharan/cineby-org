import type { ReactNode } from "react";
import { useRouter } from "next/router";

import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";

interface LayoutProps {
  children: ReactNode;
}

const FULL_BLEED_ROUTES = [
  "/watch/[...params]",
  "/movie/[...params]",
  "/tv/[...params]",
  "/profiles",
  "/login",
  "/register",
];

const NO_FOOTER_ROUTES = ["/404", "/500"];

export function Layout({ children }: LayoutProps) {
  const router = useRouter();
  const isFullBleed =
    FULL_BLEED_ROUTES.includes(router.pathname) || router.pathname.startsWith("/profiles");

  if (isFullBleed) {
    return <main className="flex-1">{children}</main>;
  }

  const hideFooter = NO_FOOTER_ROUTES.includes(router.pathname);

  return (
    <div className="flex min-h-screen flex-col overflow-x-clip">
      <Header />
      <main className="flex-1 flex flex-col overflow-x-clip">{children}</main>
      {!hideFooter && <Footer />}
    </div>
  );
}