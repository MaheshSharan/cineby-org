export interface IosSplashScreen {
  /** Portrait CSS pixel width and height of the device. */
  width: number;
  height: number;
  pixelRatio: number;
}

// iOS only shows a launch image when its media query matches the device exactly.
// Each entry needs a matching /icons/splash/splash-<pixel width>x<pixel height>.png.
export const IOS_SPLASH_SCREENS: IosSplashScreen[] = [
  { width: 440, height: 956, pixelRatio: 3 },
  { width: 430, height: 932, pixelRatio: 3 },
  { width: 428, height: 926, pixelRatio: 3 },
  { width: 402, height: 874, pixelRatio: 3 },
  { width: 393, height: 852, pixelRatio: 3 },
  { width: 390, height: 844, pixelRatio: 3 },
  { width: 414, height: 896, pixelRatio: 3 },
  { width: 414, height: 896, pixelRatio: 2 },
  { width: 414, height: 736, pixelRatio: 3 },
  { width: 375, height: 812, pixelRatio: 3 },
  { width: 375, height: 667, pixelRatio: 2 },
  { width: 320, height: 568, pixelRatio: 2 },
  { width: 1024, height: 1366, pixelRatio: 2 },
  { width: 834, height: 1194, pixelRatio: 2 },
  { width: 834, height: 1112, pixelRatio: 2 },
  { width: 820, height: 1180, pixelRatio: 2 },
  { width: 810, height: 1080, pixelRatio: 2 },
  { width: 768, height: 1024, pixelRatio: 2 },
];

export function getIosSplashImagePath(screen: IosSplashScreen): string {
  const pixelWidth = screen.width * screen.pixelRatio;
  const pixelHeight = screen.height * screen.pixelRatio;
  return `/icons/splash/splash-${pixelWidth}x${pixelHeight}.png`;
}

export function getIosSplashMedia(screen: IosSplashScreen): string {
  return [
    `(device-width: ${screen.width}px)`,
    `(device-height: ${screen.height}px)`,
    `(-webkit-device-pixel-ratio: ${screen.pixelRatio})`,
    "(orientation: portrait)",
  ].join(" and ");
}
