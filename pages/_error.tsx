import { useEffect } from "react";
import type { NextPageContext } from "next";

interface ErrorProps {
  statusCode?: number;
}

export default function ErrorPage({ statusCode }: ErrorProps) {
  useEffect(() => {
    // ChunkLoadError happens when a new deployment invalidates old JS chunk hashes.
    // Auto-reload once to fetch the new chunks — sessionStorage guard prevents loops.
    const win = window as Window & { __NEXT_CHUNK_LOAD_ERROR__?: boolean };
    const isChunkError =
      win.__NEXT_CHUNK_LOAD_ERROR__ === true ||
      document.title.includes("Application error");

    if (isChunkError) {
      const key = "chunk_reload_attempted";
      if (!sessionStorage.getItem(key)) {
        sessionStorage.setItem(key, "1");
        window.location.reload();
      }
    }
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#0a0a0a] text-white gap-4 px-4">
      <h1 className="text-5xl font-bold text-red-500">{statusCode ?? "Error"}</h1>
      <p className="text-white/60 text-sm text-center">
        {statusCode === 404
          ? "Page not found."
          : "Something went wrong. Please try refreshing."}
      </p>
      <button
        onClick={() => window.location.reload()}
        className="mt-2 px-5 py-2 rounded-full bg-red-600 hover:bg-red-500 text-sm font-semibold transition-colors"
      >
        Refresh
      </button>
    </div>
  );
}

ErrorPage.getInitialProps = ({ res, err }: NextPageContext) => {
  const statusCode = res?.statusCode ?? err?.statusCode ?? 500;
  return { statusCode };
};
