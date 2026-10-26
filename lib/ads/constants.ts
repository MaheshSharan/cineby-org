export const IMA_SDK_URL = "https://imasdk.googleapis.com/js/sdkloader/ima3.js";

/** The ad plays at a random second inside this window of the movie or episode. */
export const MIDROLL_MIN_CUE_SEC = 10 * 60;
export const MIDROLL_MAX_CUE_SEC = 25 * 60;
/** When resuming, the ad is at least this far past the point playback starts from. */
export const MIDROLL_MIN_LEAD_SEC = 2 * 60;
/** The ad never lands this close to the end (credits, final scene). */
export const MIDROLL_END_MARGIN_SEC = 5 * 60;
/** The ad is requested this long before its cue so it is ready the moment it is due. */
export const AD_REQUEST_LEAD_SEC = 30;
/** If the ad still is not ready this long after its cue, it is dropped and the movie continues. */
export const AD_READY_GRACE_SEC = 10;

export const SDK_LOAD_TIMEOUT_MS = 4_000;
/** Hard cap from the ad request to the ad starting, excluding time spent waiting for a tap. */
export const AD_START_TIMEOUT_MS = 10_000;
export const AD_CONFIG_TIMEOUT_MS = 1_500;
export const AD_PROGRESS_INTERVAL_MS = 250;

/** The same title does not get a second mid-roll within this window (refresh, return). */
export const SAME_TITLE_WINDOW_MIN = 30;
/** After an ad fails (blocked, no fill, timeout) the next attempts are skipped for this long. */
export const FAILURE_BACKOFF_MIN = 10;

export const MS_PER_MINUTE = 60_000;
