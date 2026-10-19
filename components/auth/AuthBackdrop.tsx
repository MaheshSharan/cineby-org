import type { CSSProperties } from "react";
import { buildImageUrl } from "@/lib/tmdb/image";

// Clean TMDB file hashes for backdrop poster wall
const POSTERS_HASHES_1 = [
  "6UqflU8Qqkz7Dq4swJPqs0ZJjY4.jpg",
  "bjiS5ipwxb9JFy3XRRN4OAilSeX.jpg",
  "sfQtVlIHljToOwYjhe21KPGzZWK.jpg",
  "rhGx6E3qRNMgj3i5su2oukNHwIQ.jpg",
  "orkLtdgMGiO9rTVMqJ1kKwrnup1.jpg",
  "360qdtu2hLnqMu8SVHMywn420w1.jpg",
  "fYXqpgPmHMphSF2W30GbTeJVIa5.jpg",
  "2DPmTlv8F0V1TQBPmlsGOVOhtWk.jpg",
];

const POSTERS_HASHES_2 = [
  "aAnTt6KpmbbHbd6xH3FQFlppZjc.jpg",
  "5O616X9vmRzQdB68PHzBewPittd.jpg",
  "4tTrW9dXCByS5wt2pXVWb58zNjz.jpg",
  "xTZuh9ziUjIyHBWO9OvqNIPqVWe.jpg",
  "alpf5v4UqSFawPmG9RX03Or4BDk.jpg",
  "uRxrNXQWkHoENm3nwVOZDYSCx2F.jpg",
  "b7Dr8Chzse8VagexAporUu2RtLx.jpg",
  "f1VCQIG2iCyOookdgOzwtUpwWC0.jpg",
];

const POSTERS_HASHES_3 = [
  "5rhTDKUhPYvpdQIijFIs5VoWsON.jpg",
  "3PWJqDfygN0YNNjWsDUOXclCp3h.jpg",
  "bRwnj8WEKBCvmfeUNOukJPwB43K.jpg",
  "dIl3cGBcR9AwOjWhEbMuagXdVtG.jpg",
  "dx2dblJL3GAKcXXXPjC2FSaMTWW.jpg",
  "4LwvU9SZc8QQzW1X1FAPhNbXnEU.jpg",
  "gpC7h43xPMEV3goYMQShfJbTtLq.jpg",
  "2EewmxXe72ogD0EaWM8gqa0ccIw.jpg",
];

const POSTERS_HASHES_4 = [
  "ovDgO2LPfwdVRfvScAqo9aMiIW.jpg",
  "dB4EDhre2dsC2kxYDavyKWqLQwi.jpg",
  "oHqYrPAsIiTD5m4DuxumV4er8BU.jpg",
  "txj8ujTZwGUjpCdhCsQBnTlh4aS.jpg",
  "rzpHPSEgPTpRs8EHbygwsOw7jC0.jpg",
  "xsrkiXg8EuNNtbPtbmvCxg95gK7.jpg",
  "97TTJuqiSMfU0DuXx1B4NG5QNP7.jpg",
  "2mwgHfOyrFrmvozjFoEXHRdfGhv.jpg",
];

// Resolved per render, never at import time, so the image proxy config is read where it is used.
function resolvePosterColumns(): string[][] {
  return [POSTERS_HASHES_1, POSTERS_HASHES_2, POSTERS_HASHES_3, POSTERS_HASHES_4].map((hashes) =>
    hashes.map((hash) => buildImageUrl(hash, "w342") ?? "")
  );
}

export function AuthMobileBanner() {
  const [posterCol1, posterCol2, posterCol3] = resolvePosterColumns();

  return (
    <div
      className="block lg:hidden h-[180px] md:h-[220px] overflow-hidden relative pointer-events-none shrink-0"
      style={{
        maskImage:
          "linear-gradient(black 0%, black 42%, rgba(0,0,0,0.35) 72%, transparent 100%)",
        WebkitMaskImage:
          "linear-gradient(black 0%, black 42%, rgba(0,0,0,0.35) 72%, transparent 100%)",
      }}
    >
      <div className="poster-wall">
        <div className="poster-row">
          <div className="poster-track">
            <div className="poster-rail" style={{ "--duration": "30s" } as CSSProperties}>
              {posterCol1.map((src, i) => (
                <figure key={i} className="poster-item">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt="" loading="lazy" />
                </figure>
              ))}
            </div>
            <div className="poster-rail" aria-hidden="true" style={{ "--duration": "30s" } as CSSProperties}>
              {posterCol1.map((src, i) => (
                <figure key={`dup-${i}`} className="poster-item">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt="" loading="lazy" />
                </figure>
              ))}
            </div>
          </div>

          <div className="poster-track">
            <div className="poster-rail poster-reverse" style={{ "--duration": "35s" } as CSSProperties}>
              {posterCol2.map((src, i) => (
                <figure key={i} className="poster-item">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt="" loading="lazy" />
                </figure>
              ))}
            </div>
            <div
              className="poster-rail poster-reverse"
              aria-hidden="true"
              style={{ "--duration": "35s" } as CSSProperties}
            >
              {posterCol2.map((src, i) => (
                <figure key={`dup-${i}`} className="poster-item">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt="" loading="lazy" />
                </figure>
              ))}
            </div>
          </div>

          <div className="poster-track">
            <div className="poster-rail" style={{ "--duration": "40s" } as CSSProperties}>
              {posterCol3.map((src, i) => (
                <figure key={i} className="poster-item">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt="" loading="lazy" />
                </figure>
              ))}
            </div>
            <div className="poster-rail" aria-hidden="true" style={{ "--duration": "40s" } as CSSProperties}>
              {posterCol3.map((src, i) => (
                <figure key={`dup-${i}`} className="poster-item">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt="" loading="lazy" />
                </figure>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function AuthBackdrop() {
  const [posterCol1, posterCol2, posterCol3, posterCol4] = resolvePosterColumns();

  return (
    <div className="hidden lg:flex relative h-full w-[44%] xl:w-[48%] 2xl:w-[50%] overflow-hidden bg-[#05070a] border-l border-white/[0.06] pointer-events-none select-none">
      <div className="poster-wall" aria-hidden="true">
        {/* Soft Edge Blends */}
        <div className="poster-fade-top" />
        <div className="poster-fade-bottom" />
        <div className="poster-fade-left" />

        {/* 4 Multi-Speed Vertical Dual Rails */}
        <div className="poster-row">
          {/* Column 1 */}
          <div className="poster-track">
            <div className="poster-rail" style={{ "--duration": "36s" } as CSSProperties}>
              {posterCol1.map((src, i) => (
                <figure key={i} className="poster-item">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt="" loading="lazy" />
                </figure>
              ))}
            </div>
            <div className="poster-rail" aria-hidden="true" style={{ "--duration": "36s" } as CSSProperties}>
              {posterCol1.map((src, i) => (
                <figure key={`dup-${i}`} className="poster-item">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt="" loading="lazy" />
                </figure>
              ))}
            </div>
          </div>

          {/* Column 2 (Reverse + Offset) */}
          <div className="poster-track poster-offset">
            <div className="poster-rail poster-reverse" style={{ "--duration": "44s" } as CSSProperties}>
              {posterCol2.map((src, i) => (
                <figure key={i} className="poster-item">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt="" loading="lazy" />
                </figure>
              ))}
            </div>
            <div
              className="poster-rail poster-reverse"
              aria-hidden="true"
              style={{ "--duration": "44s" } as CSSProperties}
            >
              {posterCol2.map((src, i) => (
                <figure key={`dup-${i}`} className="poster-item">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt="" loading="lazy" />
                </figure>
              ))}
            </div>
          </div>

          {/* Column 3 */}
          <div className="poster-track">
            <div className="poster-rail" style={{ "--duration": "52s" } as CSSProperties}>
              {posterCol3.map((src, i) => (
                <figure key={i} className="poster-item">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt="" loading="lazy" />
                </figure>
              ))}
            </div>
            <div className="poster-rail" aria-hidden="true" style={{ "--duration": "52s" } as CSSProperties}>
              {posterCol3.map((src, i) => (
                <figure key={`dup-${i}`} className="poster-item">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt="" loading="lazy" />
                </figure>
              ))}
            </div>
          </div>

          {/* Column 4 (Reverse + Offset) */}
          <div className="poster-track poster-offset">
            <div className="poster-rail poster-reverse" style={{ "--duration": "38s" } as CSSProperties}>
              {posterCol4.map((src, i) => (
                <figure key={i} className="poster-item">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt="" loading="lazy" />
                </figure>
              ))}
            </div>
            <div
              className="poster-rail poster-reverse"
              aria-hidden="true"
              style={{ "--duration": "38s" } as CSSProperties}
            >
              {posterCol4.map((src, i) => (
                <figure key={`dup-${i}`} className="poster-item">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt="" loading="lazy" />
                </figure>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
