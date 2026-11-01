import Script from "next/script";

interface MonetagVignetteProps {
  zoneId?: string;
}

export function MonetagVignette({ zoneId = "12166904" }: MonetagVignetteProps) {
  return (
    <Script
      id="monetag-vignette"
      strategy="afterInteractive"
      src="https://n6wxm.com/vignette.min.js"
      data-zone={zoneId}
    />
  );
}
