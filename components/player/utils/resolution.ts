import type { QualityLabel } from "../types";

/**
 * Normalizes video dimensions (height and optional width) to standard industry quality labels.
 * Correctly classifies standard 16:9, theatrical widescreen (1.85:1, 2.35:1, 2.39:1, 2.40:1),
 * and custom aspect ratios without black letterbox padding.
 *
 * Standard tier classification:
 * - 4K (2160p UHD): Width >= 3840 or Height >= 1600
 * - 1080p (Full HD): Width >= 1920 or Height >= 800 (e.g., 1920x1080 16:9, 1920x800-840 2.35:1, 1920x1038 1.85:1)
 * - 720p (HD):       Width >= 1280 or Height >= 500 (e.g., 1280x720 16:9, 1280x544 2.35:1, 1280x692 1.85:1)
 * - 480p (SD):       Width >= 640 or Height >= 250  (e.g., 854x480 16:9, 640x272 2.35:1, 640x360)
 */
export function normalizeResolutionToQuality(
  height: number,
  width?: number
): QualityLabel {
  if (height <= 0 && (!width || width <= 0)) {
    return "1080p";
  }

  // 4K (2160p UHD)
  if ((width && width >= 3840) || height >= 1600) {
    return "2160p";
  }

  // 1080p (Full HD)
  if ((width && width >= 1920) || height >= 800) {
    return "1080p";
  }

  // 720p (HD)
  if ((width && width >= 1280) || height >= 500) {
    return "720p";
  }

  // 480p (SD)
  return "480p";
}
